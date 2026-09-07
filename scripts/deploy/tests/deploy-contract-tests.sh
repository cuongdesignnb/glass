#!/usr/bin/env bash

# The harness intentionally overrides sourced functions and global deploy state
# inside isolated subshells; ShellCheck cannot follow those dynamic references.
# shellcheck disable=SC2016,SC2034,SC2317,SC2329

set -Eeuo pipefail
umask 022

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$TEST_DIR/../../.." && pwd -P)"
LIBRARY="$REPO_ROOT/scripts/deploy/mitoo-deploy-lib.sh"
ORCHESTRATOR="$REPO_ROOT/scripts/deploy/mitoo-deploy-orchestrator.sh"
ENTRYPOINT="$REPO_ROOT/deploy.sh"
TEST_TMP="$(mktemp -d "${TMPDIR:-/tmp}/mitoo-deploy-contract.XXXXXX")"

MITOO_DEPLOY_TEST_MODE=1
export MITOO_DEPLOY_TEST_MODE

# shellcheck disable=SC1090
source "$LIBRARY"

PASSED=0
FAILED=0

cleanup_tests() {
    if [[ -d "$TEST_TMP" ]]; then
        find "$TEST_TMP" -depth -delete
    fi
}
trap cleanup_tests EXIT

fail_test() {
    printf 'ASSERTION FAILED: %s\n' "$*" >&2
    return 1
}

assert_eq() {
    [[ "$1" == "$2" ]] || fail_test "expected '$2', got '$1'"
}

assert_file_exists() {
    [[ -f "$1" ]] || fail_test "expected file: $1"
}

assert_file_absent() {
    [[ ! -e "$1" ]] || fail_test "expected path to be absent: $1"
}

run_test() {
    local name="$1"
    shift
    local status
    set +e
    (
        set -Eeuo pipefail
        "$@"
    )
    status=$?
    set -e
    if [[ "$status" -eq 0 ]]; then
        printf 'ok - %s\n' "$name"
        PASSED=$((PASSED + 1))
    else
        printf 'not ok - %s\n' "$name" >&2
        FAILED=$((FAILED + 1))
    fi
}

assert_command_fails() {
    local status
    set +e
    (
        set -Eeuo pipefail
        "$@"
    ) >/dev/null 2>&1
    status=$?
    set -e
    [[ "$status" -ne 0 ]] || fail_test "command unexpectedly succeeded: $*"
}

new_git_repo() {
    local name="$1"
    local repo="$TEST_TMP/$name"
    mkdir -p "$repo"
    git -C "$repo" init -q -b main
    git -C "$repo" config user.email deploy-test@example.com
    git -C "$repo" config user.name 'Deploy Test'
    printf 'base\n' > "$repo/app.txt"
    git -C "$repo" add app.txt
    git -C "$repo" commit -qm 'base'
    git -C "$repo" update-ref refs/remotes/origin/main "$(git -C "$repo" rev-parse HEAD)"
    printf '%s\n' "$repo"
}

test_missing_sha_fails() {
    assert_command_fails validate_sha_format ""
}

test_short_sha_fails() {
    assert_command_fails validate_sha_format deadbeef
}

test_sha_on_origin_main_passes() {
    local repo sha
    repo="$(new_git_repo sha-main)"
    sha="$(git -C "$repo" rev-parse HEAD)"
    APP_ROOT="$repo"
    DEPLOY_SHA="$sha"
    ORIGIN_MAIN_SHA="$sha"
    ALLOW_ANCESTOR_DEPLOY=0
    validate_deploy_sha
}

test_sha_outside_origin_main_fails() {
    local repo main_sha other_sha
    repo="$(new_git_repo sha-other)"
    main_sha="$(git -C "$repo" rev-parse HEAD)"
    git -C "$repo" switch -q --orphan unrelated
    printf 'unrelated\n' > "$repo/unrelated.txt"
    git -C "$repo" add unrelated.txt
    git -C "$repo" commit -qm 'unrelated'
    other_sha="$(git -C "$repo" rev-parse HEAD)"
    git -C "$repo" switch -q main
    APP_ROOT="$repo"
    DEPLOY_SHA="$other_sha"
    ORIGIN_MAIN_SHA="$main_sha"
    assert_command_fails validate_deploy_sha
}

test_unexpected_tracked_change_fails() {
    local repo
    repo="$(new_git_repo tracked-block)"
    printf 'changed\n' > "$repo/app.txt"
    APP_ROOT="$repo"
    assert_command_fails classify_worktree
}

test_allowlisted_env_change_passes() {
    local repo
    repo="$(new_git_repo tracked-env)"
    printf 'APP_ENV=production\n' > "$repo/.env.production"
    git -C "$repo" add -f .env.production
    git -C "$repo" commit -qm 'add env fixture'
    printf 'APP_ENV=production\nAPP_DEBUG=false\n' > "$repo/.env.production"
    APP_ROOT="$repo"
    classify_worktree >/dev/null
    assert_eq "${#TRACKED_ALLOWED[@]}" "1"
    assert_eq "${TRACKED_ALLOWED[0]}" ".env.production"
}

test_untracked_target_collision_fails() {
    local repo
    repo="$(new_git_repo untracked-collision)"
    printf 'tracked in release\n' > "$repo/future.txt"
    git -C "$repo" add future.txt
    git -C "$repo" commit -qm 'target tracks future file'
    DEPLOY_SHA="$(git -C "$repo" rev-parse HEAD)"
    git -C "$repo" reset -q --hard HEAD~1
    printf 'operator-owned data\n' > "$repo/future.txt"
    APP_ROOT="$repo"
    assert_command_fails classify_worktree
}

test_check_only_does_not_activate() {
    local changed="$TEST_TMP/check-only-changed"
    (
        initialize_context() { :; }
        acquire_lock() { :; }
        run_preflight() { :; }
        create_release_record() { touch "$changed"; }
        cleanup_temporary_secrets() { :; }
        CHECK_ONLY=1
        main
    )
    assert_file_absent "$changed"
}

test_mysql_threshold_blocks() {
    assert_command_fails enforce_mysql_thresholds 80 1 80 30
    assert_command_fails enforce_mysql_thresholds 1 30 80 30
    enforce_mysql_thresholds 79 29 80 30 >/dev/null
}

test_mysql_block_happens_before_activation() {
    local stopped="$TEST_TMP/mysql-pm2-stopped"
    mysql_blocked_main() {
        initialize_context() { :; }
        acquire_lock() { :; }
        run_preflight() { enforce_mysql_thresholds 80 1 80 30; }
        activate_release() { touch "$stopped"; }
        cleanup_temporary_secrets() { :; }
        CHECK_ONLY=0
        main
    }
    assert_command_fails mysql_blocked_main
    assert_file_absent "$stopped"
}

test_pending_migration_requires_flag_and_backup() {
    assert_command_fails enforce_migration_policy 1 0 1
    assert_command_fails enforce_migration_policy 1 1 0
    enforce_migration_policy 1 1 1 >/dev/null
}

test_approved_migration_runs_after_backup() {
    local fake_php="$TEST_TMP/fake-php"
    local backup_marker="$TEST_TMP/database-backup-ok"
    local execution_marker="$TEST_TMP/migration-ran"
    STAGE_DIR="$TEST_TMP/migration-stage"
    RELEASE_RECORD="$TEST_TMP/migration-record"
    mkdir -p "$STAGE_DIR/backend" "$RELEASE_RECORD"
    touch "$STAGE_DIR/backend/artisan" "$backup_marker"
    printf '%s\n' \
        '#!/usr/bin/env bash' \
        '[[ -f "$MIGRATION_BACKUP_MARKER" ]] || exit 9' \
        'printf "%s\\n" "$*" > "$MIGRATION_EXECUTION_MARKER"' > "$fake_php"
    chmod 755 "$fake_php"

    export MIGRATION_BACKUP_MARKER="$backup_marker"
    export MIGRATION_EXECUTION_MARKER="$execution_marker"
    PHP_BIN="$fake_php"
    run_artisan_as_www() { "$PHP_BIN" "$STAGE_DIR/backend/artisan" "$@"; }
    MIGRATION_PENDING=1
    ALLOW_MIGRATIONS=1
    DATABASE_BACKUP_OK=1
    run_approved_migrations >/dev/null

    assert_file_exists "$execution_marker"
    grep -Fq 'migrate --force' "$execution_marker"
    assert_eq "$MIGRATION_EXECUTED" "1"
}

test_check_database_connection_uses_www_execution() {
    local calls="$TEST_TMP/database-status-calls"
    local output
    local migration_status='Pending'
    APP_ROOT="$TEST_TMP/database-app"

    run_artisan_as_www() {
        printf '%s\n' "$*" >> "$calls"
        printf '%s\n' "$migration_status"
    }

    output="$(check_database_connection)"
    grep -Fxq "$APP_ROOT migrate:status --no-ansi" "$calls"
    grep -Fxq 'MIGRATION_PENDING_CURRENT=YES' <<< "$output"
    grep -Fxq 'DATABASE_CONNECTION=PASS' <<< "$output"

    migration_status='Nothing to migrate'
    output="$(check_database_connection)"
    grep -Fxq 'MIGRATION_PENDING_CURRENT=NO' <<< "$output"
    grep -Fxq 'DATABASE_CONNECTION=PASS' <<< "$output"
    assert_eq "$(wc -l < "$calls" | tr -d ' ')" "2"
}

test_create_release_record_uses_www_execution() {
    local repo
    local calls="$TEST_TMP/release-record-artisan-calls"
    local record="$TEST_TMP/release-record"
    repo="$(new_git_repo release-record-www)"

    (
        APP_ROOT="$repo"
        CURRENT_SHA="$(git -C "$repo" rev-parse HEAD)"
        DEPLOY_SHA="$CURRENT_SHA"
        STAGE_DIR="$TEST_TMP/release-stage"
        ROLLBACK_RUNTIME_PATH="$TEST_TMP/release-rollback"
        RELEASE_RECORD="$record"
        pm2() { printf '[]'; }
        nginx() { :; }
        ss() { :; }
        run_artisan_as_www() {
            printf '%s\n' "$*" >> "$calls"
            printf 'Nothing to migrate\n'
        }
        create_release_record
    ) >/dev/null

    assert_file_exists "$record/migration-status-before.txt"
    grep -Fxq "$repo migrate:status --no-ansi" "$calls"
    grep -Fxq 'Nothing to migrate' "$record/migration-status-before.txt"
}

test_no_direct_app_root_artisan() {
    local source="$TEST_TMP/deploy-library-without-comments"
    sed -e '/^[[:space:]]*#/d' "$LIBRARY" > "$source"

    if grep -Fq '$APP_ROOT/backend/artisan' "$source"; then
        fail_test 'direct APP_ROOT Artisan path is present'
    fi
    if grep -Eq 'cd[[:space:]]+"\$APP_ROOT/backend"|cd[[:space:]]+"\$APP_ROOT"[[:space:]]*;[[:space:]]*(php|"\$PHP_BIN")[[:space:]]+artisan' "$source"; then
        fail_test 'direct APP_ROOT Artisan working-directory invocation is present'
    fi
}

write_api_fixture() {
    local name="$1"
    local content_type="$2"
    local body="$3"
    local dir="$TEST_TMP/$name"
    mkdir -p "$dir"
    printf '200' > "$dir/status"
    printf 'HTTP/1.1 200 OK\r\nContent-Type: %s\r\n\r\n' "$content_type" > "$dir/headers"
    printf '%s' "$body" > "$dir/body"
    printf '%s\n' "$dir"
}

test_api_200_html_fails() {
    local dir
    dir="$(write_api_fixture api-html text/html '<!DOCTYPE html><b>Warning</b>')"
    PHP_BIN="$(command -v php)"
    assert_command_fails validate_api_response_files "$dir/status" "$dir/headers" "$dir/body"
}

test_api_json_passes() {
    local dir
    dir="$(write_api_fixture api-json 'application/json; charset=UTF-8' '{"data":[]}')"
    PHP_BIN="$(command -v php)"
    validate_api_response_files "$dir/status" "$dir/headers" "$dir/body" >/dev/null
}

test_permission_normalization() {
    case "$(uname -s)" in
        MINGW*|MSYS*|CYGWIN*)
            printf '# POSIX mode assertions are exercised by Ubuntu CI\n'
            return 0
            ;;
    esac

    local repo
    repo="$(new_git_repo permissions)"
    mkdir -p "$repo/backend/app" "$repo/backend/storage/logs" "$repo/backend/bootstrap/cache"
    printf '#!/usr/bin/env php\n' > "$repo/backend/artisan"
    printf '<?php\n' > "$repo/backend/app/Test.php"
    printf 'APP_ENV=production\n' > "$repo/backend/.env"
    printf 'log\n' > "$repo/backend/storage/logs/test.log"
    printf '<?php return [];\n' > "$repo/backend/bootstrap/cache/packages.php"
    git -C "$repo" add backend/artisan backend/app/Test.php
    git -C "$repo" commit -qm 'backend fixture'

    SKIP_OWNERSHIP_CHANGES=1
    WWW_GROUP="$(id -g)"
    normalize_laravel_permissions "$repo" >/dev/null

    assert_eq "$(stat -c '%a' "$repo/backend/artisan")" "755"
    assert_eq "$(stat -c '%a' "$repo/backend/app/Test.php")" "644"
    assert_eq "$(stat -c '%a' "$repo/backend/.env")" "640"
    assert_eq "$(stat -c '%a' "$repo/backend/storage/logs")" "2775"
    assert_eq "$(stat -c '%a' "$repo/backend/storage/logs/test.log")" "664"
}

test_runtime_directories_created_from_missing_fixture() {
    local repo
    repo="$(new_git_repo runtime-missing)"
    mkdir -p "$repo/backend"
    printf '#!/usr/bin/env php\n' > "$repo/backend/artisan"
    printf 'APP_ENV=production\n' > "$repo/backend/.env"
    git -C "$repo" add backend/artisan
    git -C "$repo" commit -qm 'runtime fixture'

    SKIP_OWNERSHIP_CHANGES=1
    WWW_GROUP="$(id -g)"
    normalize_laravel_permissions "$repo" >/dev/null

    local relative_path
    for relative_path in \
        backend/storage/framework/cache \
        backend/storage/framework/cache/data \
        backend/storage/framework/sessions \
        backend/storage/framework/views \
        backend/storage/logs \
        backend/bootstrap/cache; do
        [[ -d "$repo/$relative_path" ]] || fail_test "runtime directory was not created: $relative_path"
    done
}

test_runtime_directory_modes() {
    case "$(uname -s)" in
        MINGW*|MSYS*|CYGWIN*)
            printf '# POSIX mode assertions are exercised by Ubuntu CI\n'
            return 0
            ;;
    esac

    local repo
    repo="$(new_git_repo runtime-modes)"
    mkdir -p "$repo/backend"
    printf '#!/usr/bin/env php\n' > "$repo/backend/artisan"
    printf 'APP_ENV=production\n' > "$repo/backend/.env"
    git -C "$repo" add backend/artisan
    git -C "$repo" commit -qm 'runtime mode fixture'

    SKIP_OWNERSHIP_CHANGES=1
    WWW_GROUP="$(id -g)"
    normalize_laravel_permissions "$repo" >/dev/null

    local relative_path
    for relative_path in \
        backend/storage/framework/cache \
        backend/storage/framework/cache/data \
        backend/storage/framework/sessions \
        backend/storage/framework/views \
        backend/storage/logs \
        backend/bootstrap/cache; do
        assert_eq "$(stat -c '%a' "$repo/$relative_path")" "2775"
    done
}

test_rebuild_uses_www_user() {
    local calls="$TEST_TMP/rebuild-artisan-calls"
    clear_laravel_manifests() { :; }
    assert_collision_manifest_absent() { :; }
    run_artisan_as_www() { printf '%s\n' "$*" >> "$calls"; }

    rebuild_laravel_cache "$TEST_TMP/rebuild-root"

    assert_eq "$(wc -l < "$calls" | tr -d ' ')" "3"
    grep -Fq ' package:discover --ansi' "$calls"
    grep -Fq ' optimize:clear' "$calls"
    grep -Fq ' config:cache' "$calls"
}

test_post_rebuild_permission_order() {
    local events="$TEST_TMP/rebuild-order"
    normalize_laravel_permissions() { printf 'normalize\n' >> "$events"; }
    rebuild_laravel_cache() { printf 'rebuild\n' >> "$events"; }
    verify_laravel_runtime_as_www() { printf 'verify\n' >> "$events"; }
    run_laravel_cache_probe_as_www() { printf 'probe\n' >> "$events"; }

    prepare_laravel_runtime_as_www "$TEST_TMP/order-root"

    assert_eq "$(tr '\n' ' ' < "$events" | sed 's/[[:space:]]*$//')" 'normalize rebuild normalize verify probe'
}

test_cache_probe_failure_blocks_activation() {
    normalize_laravel_permissions() { :; }
    rebuild_laravel_cache() { :; }
    verify_laravel_runtime_as_www() { :; }
    run_laravel_cache_probe_as_www() { return 17; }

    assert_command_fails prepare_laravel_runtime_as_www "$TEST_TMP/probe-failure"
}

test_cache_probe_success_allows_activation() {
    local marker="$TEST_TMP/probe-success"
    normalize_laravel_permissions() { :; }
    rebuild_laravel_cache() { :; }
    verify_laravel_runtime_as_www() { :; }
    run_laravel_cache_probe_as_www() { touch "$marker"; }

    prepare_laravel_runtime_as_www "$TEST_TMP/probe-success-root"
    assert_file_exists "$marker"
}

test_rollback_uses_safe_runtime_path() {
    local marker="$TEST_TMP/rollback-runtime-safe"
    APP_ROOT="$TEST_TMP/rollback-app"
    FAILED_RUNTIME_PATH="$TEST_TMP/rollback-failed"
    ROLLBACK_RUNTIME_PATH="$TEST_TMP/rollback-runtime"
    mkdir -p "$APP_ROOT" "$FAILED_RUNTIME_PATH"
    printf "module.exports = { apps: [{ name: 'glass-ai-scheduler', uid: 'www', gid: 'www' }] };\n" \
        > "$APP_ROOT/ecosystem.ai-scheduler.config.cjs"
    OLD_NEXT_MOVED=0
    OLD_NODE_MOVED=0
    OLD_VENDOR_MOVED=0
    NEW_NEXT_MOVED=0
    NEW_NODE_MOVED=0
    NEW_VENDOR_MOVED=0
    MIGRATION_EXECUTED=0

    pm2() { :; }
    git() { :; }
    restore_environment_and_tracked_files() { :; }
    restore_old_runtime_components() { :; }
    prepare_laravel_runtime_as_www() { touch "$marker"; }
    laravel_boot_as_www() { :; }
    reload_php_fpm() { :; }
    ensure_ai_scheduler_online() {
        [[ "${AI_SCHEDULER_CONFIG:-}" == "$ROLLBACK_SCHEDULER_CONFIG" ]]
        touch "$marker"
    }
    ai_scheduler_pm2_exists() { return 1; }
    check_local_next_health() { :; }
    check_pm2_online() { :; }

    rollback_release
    assert_file_exists "$marker"
}

test_stale_collision_manifest_is_deleted() {
    local backend="$TEST_TMP/stale/backend"
    mkdir -p "$backend/bootstrap/cache"
    printf '<?php // NunoMaduro\\Collision\n' > "$backend/bootstrap/cache/packages.php"
    printf '*\n' > "$backend/bootstrap/cache/.gitignore"
    clear_laravel_manifests "$backend"
    assert_file_absent "$backend/bootstrap/cache/packages.php"
    assert_file_exists "$backend/bootstrap/cache/.gitignore"
}

test_activation_failure_calls_rollback() {
    local rollback_marker="$TEST_TMP/rollback-called"
    failing_activation_main() {
        initialize_context() { :; }
        acquire_lock() { :; }
        run_preflight() { :; }
        create_release_record() { :; }
        backup_environment() { :; }
        backup_database() { DATABASE_BACKUP_OK=1; }
        prepare_stage() { :; }
        validate_backend() { :; }
        validate_frontend() { :; }
        check_migrations() { :; }
        run_approved_migrations() { :; }
        activate_release() { ACTIVATION_STARTED=1; return 42; }
        rollback_release() { ROLLBACK_STARTED=1; touch "$rollback_marker"; }
        cleanup_temporary_secrets() { :; }
        CHECK_ONLY=0
        main
    }
    assert_command_fails failing_activation_main
    assert_file_exists "$rollback_marker"
}

test_hairpin_smoke_uses_resolve() {
    grep -Fq -- '--resolve "${PUBLIC_DOMAIN}:443:127.0.0.1"' "$LIBRARY"
}

test_staging_uses_detached_worktree() {
    grep -Fq 'worktree add --detach' "$LIBRARY"
}

test_database_backup_has_integrity_checks() {
    grep -Fq -- '--single-transaction' "$LIBRARY"
    grep -Fq 'gzip -t' "$LIBRARY"
    grep -Fq 'sha256sum' "$LIBRARY"
}

test_dangerous_legacy_commands_absent() {
    local combined="$TEST_TMP/deploy-source.txt"
    sed -e '/^[[:space:]]*#/d' "$ENTRYPOINT" "$LIBRARY" "$ORCHESTRATOR" > "$combined"
    if grep -Eq 'git[[:space:]]+pull|git[[:space:]]+clean|stash[[:space:]]+--include-untracked' "$combined"; then
        fail_test 'legacy destructive Git command is present'
    fi
    if grep -Eq 'proxy_cache_dir|nginx[[:space:]]+-s[[:space:]]+reload' "$combined"; then
        fail_test 'legacy Nginx cache/reload command is present'
    fi
    if grep -Eiq 'systemctl[[:space:]]+restart[[:space:]]+(mysql|mysqld|mariadb)|KILL[[:space:]]+USER' "$combined"; then
        fail_test 'legacy MySQL mutation command is present'
    fi
}

test_missing_scheduler_is_started_automatically() {
    local calls="$TEST_TMP/scheduler-pm2-start-calls"
    local validation="$TEST_TMP/scheduler-start-validation"
    ai_scheduler_pm2_exists() { return 1; }
    check_ai_scheduler_online() { touch "$validation"; }
    pm2() { printf '%s\n' "$*" >> "$calls"; }
    AI_SCHEDULER_PM2_APP=glass-ai-scheduler
    AI_SCHEDULER_BOOTSTRAP_REQUIRED=1

    ensure_ai_scheduler_online >/dev/null

    grep -Fxq "start $APP_ROOT/ecosystem.ai-scheduler.config.cjs --only glass-ai-scheduler --update-env" "$calls"
    assert_eq "$(wc -l < "$calls" | tr -d ' ')" "1"
    assert_file_exists "$validation"
    assert_eq "$AI_SCHEDULER_BOOTSTRAP_REQUIRED" "0"
}

test_existing_scheduler_reloads_ecosystem_config() {
    local calls="$TEST_TMP/scheduler-pm2-calls"
    ai_scheduler_pm2_exists() { return 0; }
    check_ai_scheduler_online() { :; }
    pm2() { printf '%s\n' "$*" >> "$calls"; }
    AI_SCHEDULER_PM2_APP=glass-ai-scheduler
    AI_SCHEDULER_BOOTSTRAP_REQUIRED=1

    ensure_ai_scheduler_online >/dev/null

    grep -Fxq "startOrRestart $APP_ROOT/ecosystem.ai-scheduler.config.cjs --only glass-ai-scheduler --update-env" "$calls"
    assert_eq "$(wc -l < "$calls" | tr -d ' ')" "1"
    assert_eq "$AI_SCHEDULER_BOOTSTRAP_REQUIRED" "0"
}

test_ecosystem_scheduler_uid() {
    (
        cd "$REPO_ROOT"
        node -e "const cfg=require('./ecosystem.ai-scheduler.config.cjs'); const app=cfg.apps.find((item)=>item.name==='glass-ai-scheduler'); if (!app || app.uid !== 'www') process.exit(1);"
    )
}

test_ecosystem_scheduler_gid() {
    (
        cd "$REPO_ROOT"
        node -e "const cfg=require('./ecosystem.ai-scheduler.config.cjs'); const app=cfg.apps.find((item)=>item.name==='glass-ai-scheduler'); if (!app || app.gid !== 'www') process.exit(1);"
    )
}

test_scheduler_www_identity_passes() {
    local output
    WWW_USER=www
    WWW_GROUP=www
    pm2() {
        case "$1" in
            pid) printf '2481\n' ;;
            describe) printf 'status online\n' ;;
        esac
    }
    ps() { printf 'www www\n'; }

    output="$(check_ai_scheduler_online)"
    grep -Fxq 'AI_SCHEDULER_USER=www' <<< "$output"
    grep -Fxq 'AI_SCHEDULER_GROUP=www' <<< "$output"
    grep -Fxq 'AI_SCHEDULER_RUNTIME_IDENTITY=PASS' <<< "$output"
    grep -Fxq 'AI_SCHEDULER_ONLINE=PASS' <<< "$output"
}

test_scheduler_root_identity_blocks() {
    WWW_USER=www
    WWW_GROUP=www
    pm2() {
        case "$1" in
            pid) printf '2482\n' ;;
            describe) printf 'status online\n' ;;
        esac
    }
    ps() { printf 'root root\n'; }

    assert_command_fails check_ai_scheduler_online
}

test_scheduler_wrong_group_blocks() {
    WWW_USER=www
    WWW_GROUP=www
    pm2() {
        case "$1" in
            pid) printf '2483\n' ;;
            describe) printf 'status online\n' ;;
        esac
    }
    ps() { printf 'www root\n'; }

    assert_command_fails check_ai_scheduler_online
}

test_scheduler_invalid_pid_blocks() {
    WWW_USER=www
    WWW_GROUP=www
    pm2() {
        case "$1" in
            pid) : ;;
            describe) printf 'status online\n' ;;
        esac
    }

    assert_command_fails check_ai_scheduler_online
}

test_no_global_process_kill() {
    if grep -Eiq '(^|[^[:alnum:]_])(pkill|killall)([^[:alnum:]_]|$)' \
        "$LIBRARY" "$REPO_ROOT/ecosystem.ai-scheduler.config.cjs"; then
        fail_test 'global process-kill command is present'
    fi
}

test_schedule_validation_targets_queue_command() {
    grep -Fq 'run_artisan_as_www "$APP_ROOT" schedule:list --no-ansi' "$LIBRARY"
    grep -Fq "grep -Fq 'ai:queue-process'" "$LIBRARY"
}

test_scheduler_bootstrap_checks_pid_and_online_status() {
    local bootstrap="$REPO_ROOT/scripts/deploy/ensure-ai-scheduler.sh"
    grep -Fq 'pm2 pid "$AI_SCHEDULER_PM2_APP"' "$bootstrap"
    grep -Fq "grep -Eq 'status.*online'" "$bootstrap"
    grep -Fq 'pm2 save' "$bootstrap"
}

test_lock_blocks_parallel_run() {
    if ! command -v flock >/dev/null 2>&1; then
        printf '# flock unavailable locally; exercised by Ubuntu CI\n'
        return 0
    fi

    local lock_file="$TEST_TMP/deploy.lock"
    (
        exec 8>"$lock_file"
        flock -n 8
        sleep 2
    ) &
    local holder_pid=$!
    sleep 0.2

    LOCK_FILE="$lock_file"
    assert_command_fails acquire_lock
    wait "$holder_pid"
}

run_test 'missing DEPLOY_SHA fails' test_missing_sha_fails
run_test 'short DEPLOY_SHA fails' test_short_sha_fails
run_test 'SHA on origin/main passes' test_sha_on_origin_main_passes
run_test 'SHA outside origin/main fails' test_sha_outside_origin_main_fails
run_test 'unexpected tracked change fails' test_unexpected_tracked_change_fails
run_test 'allowlisted environment change passes' test_allowlisted_env_change_passes
run_test 'untracked target collision fails safely' test_untracked_target_collision_fails
run_test 'CHECK_ONLY does not activate' test_check_only_does_not_activate
run_test 'MySQL thresholds block' test_mysql_threshold_blocks
run_test 'MySQL block occurs before PM2 stop' test_mysql_block_happens_before_activation
run_test 'pending migration requires approval and backup' test_pending_migration_requires_flag_and_backup
run_test 'approved migration runs only after backup' test_approved_migration_runs_after_backup
run_test 'database connection Artisan runs as WWW_USER' test_check_database_connection_uses_www_execution
run_test 'release record Artisan runs as WWW_USER' test_create_release_record_uses_www_execution
run_test 'direct APP_ROOT Artisan invocation is absent' test_no_direct_app_root_artisan
run_test 'HTTP 200 HTML API fails' test_api_200_html_fails
run_test 'valid collections JSON passes' test_api_json_passes
run_test 'Laravel permission normalization passes' test_permission_normalization
run_test 'missing Laravel runtime directories are created' test_runtime_directories_created_from_missing_fixture
run_test 'Laravel runtime directories use 2775 mode' test_runtime_directory_modes
run_test 'Laravel cache rebuild runs as WWW_USER' test_rebuild_uses_www_user
run_test 'runtime permissions are normalized after rebuild' test_post_rebuild_permission_order
run_test 'cache probe failure blocks activation' test_cache_probe_failure_blocks_activation
run_test 'cache probe success allows activation' test_cache_probe_success_allows_activation
run_test 'rollback uses the safe runtime permission path' test_rollback_uses_safe_runtime_path
run_test 'stale Collision manifest is deleted' test_stale_collision_manifest_is_deleted
run_test 'activation failure triggers rollback' test_activation_failure_calls_rollback
run_test 'public smoke uses local SNI resolve' test_hairpin_smoke_uses_resolve
run_test 'staging uses detached worktree' test_staging_uses_detached_worktree
run_test 'database backup includes integrity checks' test_database_backup_has_integrity_checks
run_test 'dangerous legacy commands are absent' test_dangerous_legacy_commands_absent
run_test 'missing scheduler starts automatically' test_missing_scheduler_is_started_automatically
run_test 'existing scheduler reloads its ecosystem config' test_existing_scheduler_reloads_ecosystem_config
run_test 'ecosystem scheduler uid is www' test_ecosystem_scheduler_uid
run_test 'ecosystem scheduler gid is www' test_ecosystem_scheduler_gid
run_test 'scheduler www identity passes' test_scheduler_www_identity_passes
run_test 'scheduler root identity is blocked' test_scheduler_root_identity_blocks
run_test 'scheduler wrong group is blocked' test_scheduler_wrong_group_blocks
run_test 'scheduler invalid PID is blocked' test_scheduler_invalid_pid_blocks
run_test 'scheduler has no global process kill' test_no_global_process_kill
run_test 'deploy validates the AI queue schedule' test_schedule_validation_targets_queue_command
run_test 'scheduler bootstrap checks PID and online status' test_scheduler_bootstrap_checks_pid_and_online_status
run_test 'deployment lock blocks parallel run' test_lock_blocks_parallel_run

printf 'DEPLOY_CONTRACT_TESTS_PASSED=%s\n' "$PASSED"
printf 'DEPLOY_CONTRACT_TESTS_FAILED=%s\n' "$FAILED"

[[ "$FAILED" -eq 0 ]]
