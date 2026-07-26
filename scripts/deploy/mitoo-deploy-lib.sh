#!/usr/bin/env bash

# Lifecycle flags are written here and consumed by the sourced orchestrator.
# shellcheck disable=SC2034

set -Eeuo pipefail
umask 022

MITOO_DEPLOY_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

: "${CHECK_ONLY:=0}"
: "${ALLOW_MIGRATIONS:=0}"
: "${ALLOW_ANCESTOR_DEPLOY:=0}"
: "${MYSQL_MAX_CONNECTED:=80}"
: "${MYSQL_MAX_RUNNING:=30}"
: "${MIN_DISK_KB:=5242880}"
: "${PM2_APP:=glass}"
: "${AI_SCHEDULER_PM2_APP:=glass-ai-scheduler}"
: "${NEXT_PORT:=3222}"
: "${PUBLIC_DOMAIN:=mitoo.vn}"
: "${PRODUCTION_ROOT:=/www/wwwroot/kinhmathongnhung.vn}"
: "${BACKUP_ROOT:=/www/backup}"
: "${RELEASES_ROOT:=/www/releases}"
: "${LOCK_FILE:=/var/lock/mitoo-deploy.lock}"
: "${PHP_BIN:=/www/server/php/82/bin/php}"
: "${PHP_FPM_RELOAD:=/etc/init.d/php-fpm-82}"
: "${PHP_FPM_SOCKET:=/tmp/php-cgi-82.sock}"
: "${WWW_USER:=www}"
: "${MITOO_DEPLOY_TEST_MODE:=0}"

APP_ROOT="${APP_ROOT:-${MITOO_DEPLOY_SCRIPT_DIR:-$PWD}}"
DEPLOY_SHA="${DEPLOY_SHA:-}"
TIMESTAMP="${TIMESTAMP:-$(date -u +%Y%m%d-%H%M%S)}"
CURRENT_SHA=""
ORIGIN_MAIN_SHA=""
WWW_GROUP=""
STAGE_DIR=""
RELEASE_RECORD=""
ROLLBACK_RUNTIME_PATH=""
FAILED_RUNTIME_PATH=""
BACKUP_BRANCH=""
MYSQL_CNF=""
MYSQL_DATABASE_FILE=""
MYSQL_DATABASE_NAME=""
MYSQL_THREADS_CONNECTED=""
MYSQL_THREADS_RUNNING=""
DISK_AVAILABLE=""
MIGRATION_PENDING=0
MIGRATION_EXECUTED=0
DATABASE_BACKUP_OK=0
ACTIVATION_STARTED=0
ACTIVATION_SUCCEEDED=0
ROLLBACK_STARTED=0
AI_SCHEDULER_BOOTSTRAP_REQUIRED=0
OLD_NEXT_MOVED=0
OLD_NODE_MOVED=0
OLD_VENDOR_MOVED=0
NEW_NEXT_MOVED=0
NEW_NODE_MOVED=0
NEW_VENDOR_MOVED=0
STAGE_WORKTREE_ADDED=0
LOCK_FD=""

declare -a TRACKED_ALLOWED=()
declare -a TRACKED_UNEXPECTED=()
declare -a UNTRACKED_PATHS=()

log() {
    printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

emit() {
    printf '%s=%s\n' "$1" "$2"
}

die() {
    local code="$1"
    shift
    local state="FAILED"
    if (($# > 1)) && [[ "$1" =~ ^(BLOCKED|BUSY|UNKNOWN)$ ]]; then
        state="$1"
        shift
    fi
    emit "$code" "$state"
    printf 'ERROR: %s\n' "$*" >&2
    return 1
}

is_enabled() {
    [[ "${1:-0}" == "1" ]]
}

validate_boolean_flag() {
    local name="$1"
    local value="$2"
    [[ "$value" == "0" || "$value" == "1" ]] || die "${name}_INVALID" "$name must be 0 or 1"
}

validate_sha_format() {
    local sha="${1:-}"
    [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || die "DEPLOY_SHA_INVALID" "DEPLOY_SHA must be a full 40-character lowercase hexadecimal commit SHA"
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || die "COMMAND_MISSING" "Required command is missing: $1"
}

require_file() {
    [[ -f "$1" ]] || die "FILE_MISSING" "Required file is missing: $1"
}

require_directory() {
    [[ -d "$1" ]] || die "DIRECTORY_MISSING" "Required directory is missing: $1"
}

safe_stage_path() {
    [[ -n "${STAGE_DIR:-}" && "$STAGE_DIR" == "$RELEASES_ROOT"/mitoo-* ]]
}

initialize_context() {
    APP_ROOT="$(cd "$APP_ROOT" && pwd -P)"

    if ! is_enabled "$MITOO_DEPLOY_TEST_MODE" && [[ "$APP_ROOT" != "$PRODUCTION_ROOT" ]]; then
        die "DEPLOY_ROOT_INVALID" "Run this script from $PRODUCTION_ROOT"
    fi

    validate_boolean_flag CHECK_ONLY "$CHECK_ONLY"
    validate_boolean_flag ALLOW_MIGRATIONS "$ALLOW_MIGRATIONS"
    validate_boolean_flag ALLOW_ANCESTOR_DEPLOY "$ALLOW_ANCESTOR_DEPLOY"
    validate_sha_format "$DEPLOY_SHA"

    [[ "$MYSQL_MAX_CONNECTED" =~ ^[0-9]+$ ]] || die "MYSQL_THRESHOLD_INVALID" "MYSQL_MAX_CONNECTED must be an integer"
    [[ "$MYSQL_MAX_RUNNING" =~ ^[0-9]+$ ]] || die "MYSQL_THRESHOLD_INVALID" "MYSQL_MAX_RUNNING must be an integer"
    [[ "$MIN_DISK_KB" =~ ^[0-9]+$ ]] || die "DISK_THRESHOLD_INVALID" "MIN_DISK_KB must be an integer"

    STAGE_DIR="${STAGE_DIR:-$RELEASES_ROOT/mitoo-${DEPLOY_SHA:0:12}-$TIMESTAMP}"
    RELEASE_RECORD="${RELEASE_RECORD:-$BACKUP_ROOT/mitoo-release-$TIMESTAMP}"
    ROLLBACK_RUNTIME_PATH="${ROLLBACK_RUNTIME_PATH:-$RELEASES_ROOT/mitoo-rollback-$TIMESTAMP}"
    FAILED_RUNTIME_PATH="${FAILED_RUNTIME_PATH:-$RELEASES_ROOT/mitoo-failed-$TIMESTAMP}"
    BACKUP_BRANCH="${BACKUP_BRANCH:-backup/mitoo-pre-deploy-$TIMESTAMP}"
}

acquire_lock() {
    require_command flock
    mkdir -p "$(dirname "$LOCK_FILE")"
    exec {LOCK_FD}>"$LOCK_FILE"
    if ! flock -n "$LOCK_FD"; then
        die "DEPLOY_LOCK" "BUSY" "Another MITOO deployment is already running"
    fi
    emit "DEPLOY_LOCK" "ACQUIRED"
}

validate_execution_user() {
    if ! is_enabled "$MITOO_DEPLOY_TEST_MODE" && [[ "$EUID" -ne 0 ]]; then
        die "DEPLOY_USER" "BLOCKED" "Production deployment must run as root"
    fi
}

validate_git_repository() {
    cd "$APP_ROOT"
    [[ "$(git branch --show-current)" == "main" ]] || die "GIT_BRANCH" "BLOCKED" "Current branch must be main"

    local remote_url
    remote_url="$(git remote get-url origin)"
    case "$remote_url" in
        https://github.com/cuongdesignnb/glass|https://github.com/cuongdesignnb/glass.git|git@github.com:cuongdesignnb/glass|git@github.com:cuongdesignnb/glass.git)
            ;;
        *)
            die "GIT_REMOTE" "BLOCKED" "origin does not point to cuongdesignnb/glass"
            ;;
    esac

    CURRENT_SHA="$(git rev-parse HEAD)"
    git fetch origin main
    ORIGIN_MAIN_SHA="$(git rev-parse origin/main)"
}

validate_deploy_sha() {
    cd "$APP_ROOT"
    git cat-file -e "${DEPLOY_SHA}^{commit}" 2>/dev/null || die "DEPLOY_SHA_NOT_FOUND" "BLOCKED" "DEPLOY_SHA does not exist locally after fetch"
    git merge-base --is-ancestor "$DEPLOY_SHA" origin/main || die "DEPLOY_SHA_NOT_ON_MAIN" "BLOCKED" "DEPLOY_SHA is not in origin/main history"

    if [[ "$DEPLOY_SHA" != "$ORIGIN_MAIN_SHA" ]] && ! is_enabled "$ALLOW_ANCESTOR_DEPLOY"; then
        die "DEPLOY_SHA_NOT_ORIGIN_MAIN" "BLOCKED" "DEPLOY_SHA must equal origin/main unless ALLOW_ANCESTOR_DEPLOY=1 was explicitly reviewed"
    fi
}

is_allowed_production_path() {
    local path="$1"
    case "$path" in
        .env|.env.local|.env.production|backend/.env|backend/.env.production|backend/storage/*|backend/public/.well-known/*|.well-known/*|logs/*|*.zip)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

is_artisan_mode_only_change() {
    local path="$1"
    [[ "$path" == "backend/artisan" ]] || return 1
    [[ -f "$APP_ROOT/$path" ]] || return 1
    [[ "$(git -C "$APP_ROOT" hash-object "$path")" == "$(git -C "$APP_ROOT" rev-parse "HEAD:$path")" ]]
}

classify_worktree() {
    cd "$APP_ROOT"
    TRACKED_ALLOWED=()
    TRACKED_UNEXPECTED=()
    UNTRACKED_PATHS=()

    local -a changed=()
    mapfile -d '' changed < <(git diff HEAD --name-only -z)

    local path
    for path in "${changed[@]}"; do
        [[ -n "$path" ]] || continue
        if git diff --diff-filter=D --name-only -- "$path" | grep -Fxq "$path"; then
            TRACKED_UNEXPECTED+=("$path")
        elif is_allowed_production_path "$path" || is_artisan_mode_only_change "$path"; then
            TRACKED_ALLOWED+=("$path")
        else
            TRACKED_UNEXPECTED+=("$path")
        fi
    done

    mapfile -d '' UNTRACKED_PATHS < <(git ls-files --others --exclude-standard -z)

    for path in "${UNTRACKED_PATHS[@]}"; do
        if git cat-file -e "${DEPLOY_SHA}:${path}" 2>/dev/null; then
            TRACKED_UNEXPECTED+=("$path (untracked file conflicts with the target release)")
        fi
    done

    emit "WORKTREE_ALLOWED_TRACKED_COUNT" "${#TRACKED_ALLOWED[@]}"
    emit "WORKTREE_UNTRACKED_COUNT" "${#UNTRACKED_PATHS[@]}"

    if ((${#TRACKED_UNEXPECTED[@]} > 0)); then
        emit "WORKTREE_STATUS" "BLOCKED_UNEXPECTED_TRACKED_CHANGE"
        printf 'Unexpected tracked path: %s\n' "${TRACKED_UNEXPECTED[@]}" >&2
        return 1
    fi

    emit "WORKTREE_STATUS" "PASS"
}

http_status_allowed() {
    case "$1" in
        200|204|301|302|307|308) return 0 ;;
        *) return 1 ;;
    esac
}

check_local_next_health() {
    local attempts="${1:-1}"
    local delay_seconds="${2:-0}"
    local status="000"
    local attempt

    for ((attempt = 1; attempt <= attempts; attempt++)); do
        status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:${NEXT_PORT}/" || true)"
        if http_status_allowed "$status"; then
            emit "NEXT_LOCAL_HEALTH" "PASS"
            return 0
        fi
        if ((attempt < attempts)); then
            sleep "$delay_seconds"
        fi
    done

    die "NEXT_LOCAL_HEALTH" "BLOCKED" "Next.js local health failed with HTTP $status"
}

check_disk_space() {
    DISK_AVAILABLE="$(df -Pk "$APP_ROOT" | awk 'NR == 2 {print $4}')"
    [[ "$DISK_AVAILABLE" =~ ^[0-9]+$ ]] || die "DISK_AVAILABLE" "UNKNOWN" "Unable to determine free disk space"
    ((DISK_AVAILABLE >= MIN_DISK_KB)) || die "DISK_AVAILABLE" "BLOCKED" "Free disk space is below MIN_DISK_KB"
}

validate_runtime_commands() {
    local command_name
    for command_name in \
        git flock curl df awk sed grep find sort stat cp mv mkdir install gzip sha256sum \
        mysql mysqldump node npm npx composer pm2 nginx runuser id ss mktemp tee touch tr \
        chmod chgrp chown dirname sleep; do
        require_command "$command_name"
    done

    [[ -x "$PHP_BIN" ]] || die "PHP_BIN" "BLOCKED" "PHP 8.2 binary is not executable: $PHP_BIN"
    [[ -x "$PHP_FPM_RELOAD" ]] || die "PHP_FPM_RELOAD" "BLOCKED" "PHP-FPM 8.2 reload command is unavailable"
    [[ -S "$PHP_FPM_SOCKET" ]] || die "PHP_FPM_SOCKET" "BLOCKED" "PHP-FPM socket is unavailable"
    id "$WWW_USER" >/dev/null 2>&1 || die "PHP_FPM_USER" "BLOCKED" "PHP-FPM user does not exist: $WWW_USER"
    WWW_GROUP="$(id -gn "$WWW_USER")"

    node --experimental-strip-types -e "console.log('NODE_TYPESCRIPT_STRIP=PASS')"
    nginx -t

    local pm2_pid
    pm2_pid="$(pm2 pid "$PM2_APP" | awk 'NF {print; exit}')"
    [[ "$pm2_pid" =~ ^[1-9][0-9]*$ ]] || die "PM2_APP" "BLOCKED" "PM2 app $PM2_APP is not running"

    require_directory "$APP_ROOT/.next"
    require_directory "$APP_ROOT/node_modules"
    require_directory "$APP_ROOT/backend/vendor"
    require_file "$APP_ROOT/backend/vendor/autoload.php"
    require_file "$APP_ROOT/scripts/deploy/write-mysql-client-config.php"

    local managed_root
    for managed_root in "$BACKUP_ROOT" "$RELEASES_ROOT"; do
        if [[ -d "$managed_root" ]]; then
            [[ -w "$managed_root" ]] || die "MANAGED_ROOT" "BLOCKED" "Directory is not writable: $managed_root"
        else
            [[ -d "$(dirname "$managed_root")" && -w "$(dirname "$managed_root")" ]] \
                || die "MANAGED_ROOT" "BLOCKED" "Cannot create managed directory: $managed_root"
        fi
    done

    safe_stage_path || die "STAGE_DIR" "BLOCKED" "Staging path is outside the configured releases root"
    [[ ! -e "$STAGE_DIR" ]] || die "STAGE_DIR" "BLOCKED" "Staging path already exists: $STAGE_DIR"
    [[ "$ROLLBACK_RUNTIME_PATH" == "$RELEASES_ROOT"/mitoo-rollback-* ]] \
        || die "ROLLBACK_RUNTIME" "BLOCKED" "Rollback runtime path is outside the configured releases root"
    [[ ! -e "$ROLLBACK_RUNTIME_PATH" ]] \
        || die "ROLLBACK_RUNTIME" "BLOCKED" "Rollback runtime path already exists: $ROLLBACK_RUNTIME_PATH"
    [[ "$FAILED_RUNTIME_PATH" == "$RELEASES_ROOT"/mitoo-failed-* ]] \
        || die "FAILED_RUNTIME" "BLOCKED" "Failed runtime path is outside the configured releases root"
    [[ ! -e "$FAILED_RUNTIME_PATH" ]] \
        || die "FAILED_RUNTIME" "BLOCKED" "Failed runtime path already exists: $FAILED_RUNTIME_PATH"
    [[ "$RELEASE_RECORD" == "$BACKUP_ROOT"/mitoo-release-* ]] \
        || die "RELEASE_RECORD" "BLOCKED" "Release record path is outside the configured backup root"
    [[ ! -e "$RELEASE_RECORD" ]] \
        || die "RELEASE_RECORD" "BLOCKED" "Release record already exists: $RELEASE_RECORD"
    if git -C "$APP_ROOT" show-ref --verify --quiet "refs/heads/$BACKUP_BRANCH"; then
        die "BACKUP_BRANCH" "BLOCKED" "Backup branch already exists: $BACKUP_BRANCH"
    fi

    check_local_next_health 1 0
}

create_mysql_client_config() {
    if [[ -z "${MYSQL_CNF:-}" ]]; then
        MYSQL_CNF="$(mktemp "${TMPDIR:-/tmp}/mitoo-mysql-client.XXXXXX")"
    fi
    if [[ -z "${MYSQL_DATABASE_FILE:-}" ]]; then
        MYSQL_DATABASE_FILE="$(mktemp "${TMPDIR:-/tmp}/mitoo-mysql-database.XXXXXX")"
    fi
    chmod 600 "$MYSQL_CNF" "$MYSQL_DATABASE_FILE"

    "$PHP_BIN" "$APP_ROOT/scripts/deploy/write-mysql-client-config.php" \
        "$APP_ROOT" "$MYSQL_CNF" "$MYSQL_DATABASE_FILE" >/dev/null

    IFS= read -r MYSQL_DATABASE_NAME < "$MYSQL_DATABASE_FILE"
    [[ "$MYSQL_DATABASE_NAME" =~ ^[A-Za-z0-9_\$-]+$ ]] || die "MYSQL_DATABASE_NAME" "BLOCKED" "Database name is invalid"
}

check_mysql_listener() {
    require_command ss
    local listeners
    listeners="$(ss -ltnH)"

    printf '%s\n' "$listeners" | awk '{print $4}' | grep -Eq '(^|\])127\.0\.0\.1:3306$|^127\.0\.0\.1:3306$' \
        || die "MYSQL_LISTENER" "BLOCKED" "MySQL is not listening on 127.0.0.1:3306"

    if printf '%s\n' "$listeners" | awk '{print $4}' | grep -Eq '^(0\.0\.0\.0|\*):3306$|^\[::\]:3306$|^:::3306$'; then
        die "MYSQL_LISTENER" "BLOCKED" "MySQL is exposed on a wildcard address"
    fi

    emit "MYSQL_LISTENER" "PASS"
}

read_mysql_status() {
    [[ -n "${MYSQL_CNF:-}" ]] || create_mysql_client_config

    local status_output
    status_output="$(mysql --defaults-extra-file="$MYSQL_CNF" --batch --skip-column-names \
        --execute="SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Threads_running')")"

    MYSQL_THREADS_CONNECTED="$(printf '%s\n' "$status_output" | awk '$1 == "Threads_connected" {print $2}')"
    MYSQL_THREADS_RUNNING="$(printf '%s\n' "$status_output" | awk '$1 == "Threads_running" {print $2}')"

    [[ "$MYSQL_THREADS_CONNECTED" =~ ^[0-9]+$ ]] || die "MYSQL_STATUS" "BLOCKED" "Unable to read Threads_connected"
    [[ "$MYSQL_THREADS_RUNNING" =~ ^[0-9]+$ ]] || die "MYSQL_STATUS" "BLOCKED" "Unable to read Threads_running"
}

enforce_mysql_thresholds() {
    local connected="$1"
    local running="$2"
    local max_connected="${3:-$MYSQL_MAX_CONNECTED}"
    local max_running="${4:-$MYSQL_MAX_RUNNING}"

    if ((connected >= max_connected || running >= max_running)); then
        emit "MYSQL_SAFETY_GATE" "BLOCKED"
        printf 'ERROR: MySQL thresholds exceeded: connected=%s/%s running=%s/%s\n' \
            "$connected" "$max_connected" "$running" "$max_running" >&2
        return 1
    fi

    emit "MYSQL_SAFETY_GATE" "PASS"
}

check_mysql_safety() {
    check_mysql_listener
    read_mysql_status
    enforce_mysql_thresholds "$MYSQL_THREADS_CONNECTED" "$MYSQL_THREADS_RUNNING"
}

validate_api_response_files() {
    local status_file="$1"
    local headers_file="$2"
    local body_file="$3"
    local status

    status="$(tr -d '\r\n' < "$status_file")"
    [[ "$status" == "200" ]] || die "API_SMOKE_HTTP" "BLOCKED" "Collections API returned HTTP $status"
    grep -Eiq '^Content-Type:[[:space:]]*[^;]*application/json' "$headers_file" \
        || die "API_SMOKE_CONTENT_TYPE" "BLOCKED" "Collections API did not return application/json"

    if grep -Eiq '^[[:space:]]*(<html|<!DOCTYPE|<br[[:space:]/>]|<b>Warning)' "$body_file"; then
        die "API_SMOKE_BODY" "BLOCKED" "Collections API returned HTML or a PHP warning"
    fi

    # The single-quoted program is PHP source and must not be expanded by Bash.
    # shellcheck disable=SC2016
    "$PHP_BIN" -r '
        $body = file_get_contents($argv[1]);
        $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) { exit(2); }
        if (array_is_list($decoded)) { exit(0); }
        if (array_key_exists("data", $decoded) && is_array($decoded["data"])) { exit(0); }
        exit(3);
    ' "$body_file" || die "API_SMOKE_JSON" "BLOCKED" "Collections API body is not the expected JSON collection shape"

    emit "API_SMOKE_JSON" "PASS"
}

smoke_laravel_api() {
    local output_dir="$1"
    mkdir -p "$output_dir"
    local status_file="$output_dir/api-status.txt"
    local headers_file="$output_dir/api-headers.txt"
    local body_file="$output_dir/api-body.json"

    curl --silent --show-error \
        --header "Host: $PUBLIC_DOMAIN" \
        --header 'Accept: application/json' \
        --dump-header "$headers_file" \
        --output "$body_file" \
        --write-out '%{http_code}' \
        'http://127.0.0.1/api/public/collections' > "$status_file"

    validate_api_response_files "$status_file" "$headers_file" "$body_file"
}

check_database_connection() {
    local status_file
    status_file="$(mktemp "${TMPDIR:-/tmp}/mitoo-migration-status.XXXXXX")"
    "$PHP_BIN" "$APP_ROOT/backend/artisan" migrate:status --no-ansi > "$status_file"
    if grep -Eq '(^|[[:space:]])Pending([[:space:]]|$)' "$status_file"; then
        emit "MIGRATION_PENDING_CURRENT" "YES"
    else
        emit "MIGRATION_PENDING_CURRENT" "NO"
    fi
    rm -f -- "$status_file"
    emit "DATABASE_CONNECTION" "PASS"
}

run_preflight() {
    validate_execution_user
    validate_git_repository
    validate_deploy_sha
    classify_worktree
    validate_runtime_commands
    check_disk_space
    create_mysql_client_config
    mysql --defaults-extra-file="$MYSQL_CNF" --batch --skip-column-names --execute='SELECT 1' >/dev/null
    check_mysql_safety
    check_database_connection

    local smoke_dir
    smoke_dir="$(mktemp -d "${TMPDIR:-/tmp}/mitoo-smoke-current.XXXXXX")"
    smoke_laravel_api "$smoke_dir"
    find "$smoke_dir" -depth -delete

    emit "CURRENT_SHA" "$CURRENT_SHA"
    emit "DEPLOY_SHA" "$DEPLOY_SHA"
    emit "ORIGIN_MAIN_SHA" "$ORIGIN_MAIN_SHA"
    emit "NODE_VERSION" "$(node --version)"
    emit "PHP_VERSION" "$($PHP_BIN -r 'echo PHP_VERSION;')"
    emit "MYSQL_THREADS_CONNECTED" "$MYSQL_THREADS_CONNECTED"
    emit "MYSQL_THREADS_RUNNING" "$MYSQL_THREADS_RUNNING"
    emit "DISK_AVAILABLE" "$DISK_AVAILABLE"
    emit "PREFLIGHT" "PASS"
}

secure_record_file() {
    local path="$1"
    touch "$path"
    chmod 600 "$path"
}

create_release_record() {
    [[ ! -e "$RELEASE_RECORD" ]] || die "RELEASE_RECORD" "BLOCKED" "Release record already exists"
    mkdir -p "$RELEASE_RECORD/env" "$RELEASE_RECORD/tracked-files" "$RELEASE_RECORD/tracked-metadata"
    chmod 700 "$RELEASE_RECORD" "$RELEASE_RECORD/env" "$RELEASE_RECORD/tracked-files" "$RELEASE_RECORD/tracked-metadata"

    local file
    for file in \
        previous-sha.txt deploy-sha.txt git-status-before.txt tracked-diff-stat.txt \
        migration-status-before.txt migration-status-release.txt pm2-before.json \
        nginx-test-before.txt mysql-status-before.txt stage-dir.txt \
        rollback-runtime-path.txt activation.log smoke-results.txt; do
        secure_record_file "$RELEASE_RECORD/$file"
    done

    printf '%s\n' "$CURRENT_SHA" > "$RELEASE_RECORD/previous-sha.txt"
    printf '%s\n' "$DEPLOY_SHA" > "$RELEASE_RECORD/deploy-sha.txt"
    printf '%s\n' "$STAGE_DIR" > "$RELEASE_RECORD/stage-dir.txt"
    printf '%s\n' "$ROLLBACK_RUNTIME_PATH" > "$RELEASE_RECORD/rollback-runtime-path.txt"
    git -C "$APP_ROOT" status --porcelain=v1 --untracked-files=all > "$RELEASE_RECORD/git-status-before.txt"
    git -C "$APP_ROOT" diff --stat > "$RELEASE_RECORD/tracked-diff-stat.txt"
    pm2 jlist > "$RELEASE_RECORD/pm2-before.json"
    nginx -t > "$RELEASE_RECORD/nginx-test-before.txt" 2>&1
    {
        printf 'Threads_connected=%s\n' "$MYSQL_THREADS_CONNECTED"
        printf 'Threads_running=%s\n' "$MYSQL_THREADS_RUNNING"
        ss -ltnH | awk '$4 ~ /:3306$/ {print}'
    } > "$RELEASE_RECORD/mysql-status-before.txt"
    "$PHP_BIN" "$APP_ROOT/backend/artisan" migrate:status --no-ansi > "$RELEASE_RECORD/migration-status-before.txt"

    find "$RELEASE_RECORD" -maxdepth 1 -type f -exec chmod 600 {} +
    exec > >(tee -a "$RELEASE_RECORD/activation.log") 2>&1
    emit "RELEASE_RECORD" "$RELEASE_RECORD"
}

copy_secret_file() {
    local source_path="$1"
    local destination_path="$2"
    [[ -f "$source_path" ]] || return 0
    mkdir -p "$(dirname "$destination_path")"
    install -m 600 "$source_path" "$destination_path"
}

backup_environment() {
    local relative_path
    for relative_path in .env .env.local .env.production backend/.env backend/.env.production; do
        copy_secret_file "$APP_ROOT/$relative_path" "$RELEASE_RECORD/env/$relative_path"
    done

    for relative_path in "${TRACKED_ALLOWED[@]}"; do
        [[ "$relative_path" == "backend/artisan" ]] && continue
        [[ -f "$APP_ROOT/$relative_path" ]] || die "TRACKED_BACKUP" "BLOCKED" "Allowed tracked path is not a regular file: $relative_path"
        copy_secret_file "$APP_ROOT/$relative_path" "$RELEASE_RECORD/tracked-files/$relative_path"
        mkdir -p "$(dirname "$RELEASE_RECORD/tracked-metadata/$relative_path")"
        stat -c '%u %g %a' "$APP_ROOT/$relative_path" > "$RELEASE_RECORD/tracked-metadata/$relative_path"
    done

    find "$RELEASE_RECORD/env" "$RELEASE_RECORD/tracked-files" "$RELEASE_RECORD/tracked-metadata" -type d -exec chmod 700 {} +
    find "$RELEASE_RECORD/env" "$RELEASE_RECORD/tracked-files" "$RELEASE_RECORD/tracked-metadata" -type f -exec chmod 600 {} +

    emit "ENVIRONMENT_BACKUP" "PASS"
}

backup_database() {
    local dump_file="$RELEASE_RECORD/database-before-deploy.sql.gz"
    local checksum_file="$RELEASE_RECORD/database-before-deploy.sha256"
    secure_record_file "$dump_file"
    secure_record_file "$checksum_file"

    mysqldump --defaults-extra-file="$MYSQL_CNF" \
        --single-transaction \
        --quick \
        --triggers \
        --hex-blob \
        --default-character-set=utf8mb4 \
        "$MYSQL_DATABASE_NAME" | gzip -c > "$dump_file"

    [[ -s "$dump_file" ]] || die "DATABASE_BACKUP" "BLOCKED" "Database backup is empty"
    gzip -t "$dump_file"
    sha256sum "$dump_file" > "$checksum_file"
    chmod 600 "$dump_file" "$checksum_file"
    DATABASE_BACKUP_OK=1
    emit "DATABASE_BACKUP" "PASS"
}

copy_environment_to_stage() {
    local relative_path
    for relative_path in .env .env.local .env.production backend/.env backend/.env.production; do
        if [[ -f "$RELEASE_RECORD/env/$relative_path" ]]; then
            mkdir -p "$(dirname "$STAGE_DIR/$relative_path")"
            install -m 640 "$RELEASE_RECORD/env/$relative_path" "$STAGE_DIR/$relative_path"
            chgrp "$WWW_GROUP" "$STAGE_DIR/$relative_path"
        fi
    done
}

prepare_stage() {
    safe_stage_path || die "STAGE_DIR" "BLOCKED" "Refusing unsafe staging path"
    [[ ! -e "$STAGE_DIR" ]] || die "STAGE_DIR" "BLOCKED" "Staging path already exists"
    mkdir -p "$RELEASES_ROOT"
    git -C "$APP_ROOT" worktree add --detach "$STAGE_DIR" "$DEPLOY_SHA"
    STAGE_WORKTREE_ADDED=1
    copy_environment_to_stage
    emit "STAGE_WORKTREE" "READY"
}

clear_laravel_manifests() {
    local backend_root="$1"
    mkdir -p "$backend_root/bootstrap/cache"
    find "$backend_root/bootstrap/cache" -maxdepth 1 -type f -name '*.php' -delete
}

assert_collision_manifest_absent() {
    local backend_root="$1"
    if grep -R --include='*.php' 'NunoMaduro\\Collision' "$backend_root/bootstrap/cache" >/dev/null 2>&1; then
        die "LARAVEL_STALE_MANIFEST" "BLOCKED" "Collision provider remains in production Laravel manifests"
    fi
    emit "LARAVEL_STALE_MANIFEST" "ABSENT"
}

normalize_source_modes() {
    local root="$1"
    local relative_path
    while IFS= read -r -d '' relative_path; do
        case "$relative_path" in
            backend/.env|backend/.env.production|backend/storage/*|backend/bootstrap/cache/*)
                continue
                ;;
        esac
        [[ -f "$root/$relative_path" ]] || continue
        chmod 644 "$root/$relative_path"
        local parent
        parent="$(dirname "$root/$relative_path")"
        while [[ "$parent" == "$root/backend"/* ]]; do
            chmod 755 "$parent"
            parent="$(dirname "$parent")"
        done
    done < <(git -C "$root" ls-files -z backend)

    chmod 755 "$root/backend"
    chmod 755 "$root/backend/artisan"
}

normalize_environment_modes() {
    local root="$1"
    local relative_path
    for relative_path in backend/.env backend/.env.production; do
        [[ -f "$root/$relative_path" ]] || continue
        if ! is_enabled "${SKIP_OWNERSHIP_CHANGES:-0}"; then
            chgrp "$WWW_GROUP" "$root/$relative_path"
        fi
        chmod 640 "$root/$relative_path"
    done
}

normalize_writable_modes() {
    local root="$1"
    local writable_path
    for writable_path in "$root/backend/storage" "$root/backend/bootstrap/cache"; do
        mkdir -p "$writable_path"
        if ! is_enabled "${SKIP_OWNERSHIP_CHANGES:-0}"; then
            chgrp -R "$WWW_GROUP" "$writable_path"
        fi
        find "$writable_path" -type d -exec chmod 2775 {} +
        find "$writable_path" -type f -exec chmod 664 {} +
    done
}

normalize_laravel_permissions() {
    local root="$1"
    normalize_source_modes "$root"
    normalize_environment_modes "$root"
    normalize_writable_modes "$root"
    emit "LARAVEL_PERMISSIONS" "PASS"
}

laravel_boot_as_www() {
    local root="$1"
    runuser -u "$WWW_USER" -- "$PHP_BIN" "$root/backend/artisan" about --only=environment >/dev/null
    emit "LARAVEL_BOOT_AS_WWW" "PASS"
}

validate_backend() {
    (
        cd "$STAGE_DIR/backend"
        composer install --no-interaction --prefer-dist --no-progress
        "$PHP_BIN" -l app/Http/Controllers/Api/CollectionController.php
        "$PHP_BIN" artisan test

        clear_laravel_manifests "$STAGE_DIR/backend"
        composer install \
            --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-progress --no-scripts
        clear_laravel_manifests "$STAGE_DIR/backend"
        composer dump-autoload \
            --no-dev --optimize --classmap-authoritative --no-interaction --no-scripts
    )
    "$PHP_BIN" "$STAGE_DIR/backend/artisan" package:discover --ansi
    "$PHP_BIN" "$STAGE_DIR/backend/artisan" optimize:clear
    "$PHP_BIN" "$STAGE_DIR/backend/artisan" config:cache
    assert_collision_manifest_absent "$STAGE_DIR/backend"
    normalize_laravel_permissions "$STAGE_DIR"
    laravel_boot_as_www "$STAGE_DIR"
    emit "BACKEND_VALIDATION" "PASS"
}

validate_frontend() {
    (
        cd "$STAGE_DIR"
        npm ci --no-audit --no-fund
        npm run test:performance
        npx tsc --noEmit
        npm run lint -- --quiet
        npm run build
    )
    emit "FRONTEND_VALIDATION" "PASS"
}

detect_pending_migrations() {
    "$PHP_BIN" "$STAGE_DIR/backend/artisan" migrate:status --no-ansi > "$RELEASE_RECORD/migration-status-release.txt"
    if grep -Eq '(^|[[:space:]])Pending([[:space:]]|$)' "$RELEASE_RECORD/migration-status-release.txt"; then
        MIGRATION_PENDING=1
    else
        MIGRATION_PENDING=0
    fi
}

enforce_migration_policy() {
    local pending="$1"
    local allowed="${2:-$ALLOW_MIGRATIONS}"
    local backup_ok="${3:-$DATABASE_BACKUP_OK}"

    if [[ "$pending" == "1" && "$allowed" != "1" ]]; then
        emit "MIGRATION_STATUS" "BLOCKED_PENDING"
        emit "MIGRATION_EXECUTED" "NO"
        return 1
    fi

    if [[ "$pending" == "1" && "$backup_ok" != "1" ]]; then
        die "MIGRATION_STATUS" "BLOCKED" "Approved migration cannot run before a verified database backup"
    fi

    emit "MIGRATION_STATUS" "PASS"
}

check_migrations() {
    detect_pending_migrations
    enforce_migration_policy "$MIGRATION_PENDING" "$ALLOW_MIGRATIONS" "$DATABASE_BACKUP_OK"
}

run_approved_migrations() {
    if [[ "$MIGRATION_PENDING" != "1" ]]; then
        emit "MIGRATION_EXECUTED" "NO"
        return 0
    fi

    [[ "$ALLOW_MIGRATIONS" == "1" ]] || die "MIGRATION_STATUS" "BLOCKED" "Pending migrations were not approved"
    [[ "$DATABASE_BACKUP_OK" == "1" ]] || die "MIGRATION_STATUS" "BLOCKED" "Database backup did not pass"

    log "Approved migrations will run. Database rollback is never automatic."
    MIGRATION_EXECUTED=1
    emit "DATABASE_ROLLBACK_REQUIRED" "MANUAL_REVIEW_IF_MIGRATION_STARTS"
    secure_record_file "$RELEASE_RECORD/migration-execution.txt"
    "$PHP_BIN" "$STAGE_DIR/backend/artisan" migrate --force 2>&1 | tee "$RELEASE_RECORD/migration-execution.txt"
    chmod 600 "$RELEASE_RECORD/migration-execution.txt"
    emit "MIGRATION_EXECUTED" "YES"
    emit "DATABASE_ROLLBACK_REQUIRED" "MANUAL_REVIEW_IF_ACTIVATION_FAILS"
}

restore_environment_and_tracked_files() {
    local relative_path
    for relative_path in .env .env.local .env.production backend/.env backend/.env.production; do
        if [[ -f "$RELEASE_RECORD/env/$relative_path" ]]; then
            mkdir -p "$(dirname "$APP_ROOT/$relative_path")"
            install -m 600 "$RELEASE_RECORD/env/$relative_path" "$APP_ROOT/$relative_path"
        fi
    done

    for relative_path in "${TRACKED_ALLOWED[@]}"; do
        [[ "$relative_path" == "backend/artisan" ]] && continue
        if [[ -f "$RELEASE_RECORD/tracked-files/$relative_path" ]]; then
            local uid gid mode
            read -r uid gid mode < "$RELEASE_RECORD/tracked-metadata/$relative_path"
            mkdir -p "$(dirname "$APP_ROOT/$relative_path")"
            install -m "$mode" "$RELEASE_RECORD/tracked-files/$relative_path" "$APP_ROOT/$relative_path"
            if [[ "$EUID" -eq 0 ]]; then
                chown "$uid:$gid" "$APP_ROOT/$relative_path"
            fi
        fi
    done
}

move_old_runtime_to_rollback() {
    [[ ! -e "$ROLLBACK_RUNTIME_PATH" ]] || die "ROLLBACK_RUNTIME" "BLOCKED" "Rollback runtime path already exists"
    mkdir -p "$ROLLBACK_RUNTIME_PATH/backend"
    chmod 700 "$ROLLBACK_RUNTIME_PATH" "$ROLLBACK_RUNTIME_PATH/backend"

    mv "$APP_ROOT/.next" "$ROLLBACK_RUNTIME_PATH/.next"
    OLD_NEXT_MOVED=1
    mv "$APP_ROOT/node_modules" "$ROLLBACK_RUNTIME_PATH/node_modules"
    OLD_NODE_MOVED=1
    mv "$APP_ROOT/backend/vendor" "$ROLLBACK_RUNTIME_PATH/backend/vendor"
    OLD_VENDOR_MOVED=1
}

move_new_runtime_to_production() {
    require_directory "$STAGE_DIR/.next"
    require_directory "$STAGE_DIR/node_modules"
    require_directory "$STAGE_DIR/backend/vendor"

    mv "$STAGE_DIR/.next" "$APP_ROOT/.next"
    NEW_NEXT_MOVED=1
    mv "$STAGE_DIR/node_modules" "$APP_ROOT/node_modules"
    NEW_NODE_MOVED=1
    mv "$STAGE_DIR/backend/vendor" "$APP_ROOT/backend/vendor"
    NEW_VENDOR_MOVED=1
}

rebuild_laravel_cache() {
    local root="$1"
    clear_laravel_manifests "$root/backend"
    "$PHP_BIN" "$root/backend/artisan" package:discover --ansi
    "$PHP_BIN" "$root/backend/artisan" optimize:clear
    "$PHP_BIN" "$root/backend/artisan" config:cache
    assert_collision_manifest_absent "$root/backend"
}

reload_php_fpm() {
    "$PHP_FPM_RELOAD" reload
    emit "PHP_FPM_RELOAD" "PASS"
}

smoke_public_pages() {
    local results_file="$RELEASE_RECORD/smoke-results.txt"
    local route
    local status
    for route in / /san-pham /bai-viet /bo-suu-tap /sitemap.xml; do
        status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
            --resolve "${PUBLIC_DOMAIN}:443:127.0.0.1" "https://${PUBLIC_DOMAIN}${route}" || true)"
        printf 'PUBLIC %s %s\n' "$route" "$status" >> "$results_file"
        http_status_allowed "$status" || die "PUBLIC_SMOKE" "BLOCKED" "Local SNI smoke failed for $route with HTTP $status"
    done
    emit "PUBLIC_SMOKE" "PASS"
}

check_pm2_online() {
    local pid
    pid="$(pm2 pid "$PM2_APP" | awk 'NF {print; exit}')"
    [[ "$pid" =~ ^[1-9][0-9]*$ ]] || die "PM2_ONLINE" "BLOCKED" "PM2 app $PM2_APP has no online PID"
    emit "PM2_PID" "$pid"
}

ai_scheduler_pm2_exists() {
    pm2 describe "$AI_SCHEDULER_PM2_APP" >/dev/null 2>&1
}

check_ai_scheduler_online() {
    local pid
    pid="$(pm2 pid "$AI_SCHEDULER_PM2_APP" | awk 'NF {print; exit}')"
    [[ "$pid" =~ ^[1-9][0-9]*$ ]] \
        || die "AI_SCHEDULER_ONLINE" "BLOCKED" "PM2 app $AI_SCHEDULER_PM2_APP has no online PID"
    pm2 describe "$AI_SCHEDULER_PM2_APP" | grep -Eq 'status.*online' \
        || die "AI_SCHEDULER_ONLINE" "BLOCKED" "PM2 app $AI_SCHEDULER_PM2_APP is not online"
    emit "AI_SCHEDULER_PID" "$pid"
}

restart_ai_scheduler_if_present() {
    if ai_scheduler_pm2_exists; then
        pm2 restart "$AI_SCHEDULER_PM2_APP" --update-env
        check_ai_scheduler_online
        AI_SCHEDULER_BOOTSTRAP_REQUIRED=0
        emit "AI_SCHEDULER_RESTART" "PASS"
    else
        AI_SCHEDULER_BOOTSTRAP_REQUIRED=1
        emit "AI_SCHEDULER_BOOTSTRAP_REQUIRED" "YES"
    fi
}

validate_ai_queue_schedule() {
    local schedule_output
    schedule_output="$(cd "$APP_ROOT/backend" && "$PHP_BIN" artisan schedule:list --no-ansi)"
    grep -Fq 'ai:queue-process' <<< "$schedule_output" \
        || die "AI_QUEUE_SCHEDULE" "BLOCKED" "Laravel schedule does not contain ai:queue-process"
    emit "AI_QUEUE_SCHEDULE" "PASS"
}

post_activation_checks() {
    check_local_next_health 18 5
    smoke_public_pages
    smoke_laravel_api "$RELEASE_RECORD/smoke-api"
    read_mysql_status
    enforce_mysql_thresholds "$MYSQL_THREADS_CONNECTED" "$MYSQL_THREADS_RUNNING"
    [[ "$(git -C "$APP_ROOT" rev-parse HEAD)" == "$DEPLOY_SHA" ]] \
        || die "DEPLOYED_SHA" "BLOCKED" "Production HEAD does not match DEPLOY_SHA"
    check_pm2_online
    if [[ "$AI_SCHEDULER_BOOTSTRAP_REQUIRED" == "0" ]]; then
        check_ai_scheduler_online
    else
        emit "AI_SCHEDULER_BOOTSTRAP_REQUIRED" "YES"
    fi
    validate_ai_queue_schedule
    pm2 save
    emit "POST_ACTIVATION" "PASS"
}

activate_release() {
    cd "$APP_ROOT"
    git branch "$BACKUP_BRANCH" "$CURRENT_SHA"
    ACTIVATION_STARTED=1

    pm2 stop "$PM2_APP"
    move_old_runtime_to_rollback

    git reset --hard "$DEPLOY_SHA"
    restore_environment_and_tracked_files
    move_new_runtime_to_production

    normalize_laravel_permissions "$APP_ROOT"
    rebuild_laravel_cache "$APP_ROOT"
    laravel_boot_as_www "$APP_ROOT"
    reload_php_fpm
    pm2 restart "$PM2_APP" --update-env
    restart_ai_scheduler_if_present
    post_activation_checks

    ACTIVATION_SUCCEEDED=1
    emit "ACTIVATION" "PASS"
}

move_failed_runtime_component() {
    local source_path="$1"
    local destination_path="$2"
    [[ -e "$source_path" ]] || return 0
    mkdir -p "$(dirname "$destination_path")"
    mv "$source_path" "$destination_path"
}

restore_old_runtime_components() {
    if [[ "$OLD_NEXT_MOVED" == "1" && -d "$ROLLBACK_RUNTIME_PATH/.next" ]]; then
        mv "$ROLLBACK_RUNTIME_PATH/.next" "$APP_ROOT/.next"
    fi
    if [[ "$OLD_NODE_MOVED" == "1" && -d "$ROLLBACK_RUNTIME_PATH/node_modules" ]]; then
        mv "$ROLLBACK_RUNTIME_PATH/node_modules" "$APP_ROOT/node_modules"
    fi
    if [[ "$OLD_VENDOR_MOVED" == "1" && -d "$ROLLBACK_RUNTIME_PATH/backend/vendor" ]]; then
        mkdir -p "$APP_ROOT/backend"
        mv "$ROLLBACK_RUNTIME_PATH/backend/vendor" "$APP_ROOT/backend/vendor"
    fi
}

rollback_release() {
    ROLLBACK_STARTED=1
    set +e
    log "Activation failed; starting automatic source/runtime rollback."

    local source_status=0
    local runtime_status=0
    local pm2_status=0

    pm2 stop "$PM2_APP" >/dev/null 2>&1
    mkdir -p "$FAILED_RUNTIME_PATH/backend" || runtime_status=1
    chmod 700 "$FAILED_RUNTIME_PATH" "$FAILED_RUNTIME_PATH/backend" || runtime_status=1

    if [[ "$NEW_NEXT_MOVED" == "1" ]]; then
        move_failed_runtime_component "$APP_ROOT/.next" "$FAILED_RUNTIME_PATH/.next" || runtime_status=1
    fi
    if [[ "$NEW_NODE_MOVED" == "1" ]]; then
        move_failed_runtime_component "$APP_ROOT/node_modules" "$FAILED_RUNTIME_PATH/node_modules" || runtime_status=1
    fi
    if [[ "$NEW_VENDOR_MOVED" == "1" ]]; then
        move_failed_runtime_component "$APP_ROOT/backend/vendor" "$FAILED_RUNTIME_PATH/backend/vendor" || runtime_status=1
    fi

    git -C "$APP_ROOT" reset --hard "$CURRENT_SHA" || source_status=1
    restore_environment_and_tracked_files || source_status=1
    restore_old_runtime_components || runtime_status=1

    normalize_laravel_permissions "$APP_ROOT" || runtime_status=1
    rebuild_laravel_cache "$APP_ROOT" || runtime_status=1
    laravel_boot_as_www "$APP_ROOT" || runtime_status=1
    reload_php_fpm || runtime_status=1
    pm2 restart "$PM2_APP" --update-env || pm2_status=1
    if ai_scheduler_pm2_exists; then
        pm2 restart "$AI_SCHEDULER_PM2_APP" --update-env || pm2_status=1
        check_ai_scheduler_online || pm2_status=1
    fi
    check_local_next_health 18 5 || runtime_status=1
    check_pm2_online || pm2_status=1

    if [[ "$source_status" -eq 0 ]]; then
        emit "ROLLBACK_SOURCE" "PASS"
    else
        emit "ROLLBACK_SOURCE" "FAILED"
    fi
    if [[ "$runtime_status" -eq 0 ]]; then
        emit "ROLLBACK_RUNTIME" "PASS"
    else
        emit "ROLLBACK_RUNTIME" "FAILED"
    fi
    if [[ "$pm2_status" -eq 0 ]]; then
        emit "ROLLBACK_PM2" "PASS"
    else
        emit "ROLLBACK_PM2" "FAILED"
    fi

    if [[ "$MIGRATION_EXECUTED" == "1" ]]; then
        emit "DATABASE_ROLLBACK" "NOT_AUTOMATIC"
    else
        emit "DATABASE_ROLLBACK" "NOT_REQUIRED"
    fi

    set -e
}

# shellcheck source=mitoo-deploy-orchestrator.sh
# shellcheck disable=SC1091
source "$MITOO_DEPLOY_LIB_DIR/mitoo-deploy-orchestrator.sh"
