#!/usr/bin/env bash

# This module is sourced by mitoo-deploy-lib.sh after all deploy primitives are
# defined. It owns lifecycle cleanup, error handling and the top-level flow.

cleanup_stage_after_success() {
    if [[ "$STAGE_WORKTREE_ADDED" == "1" ]] && safe_stage_path && [[ -d "$STAGE_DIR" ]]; then
        git -C "$APP_ROOT" worktree remove --force "$STAGE_DIR"
        STAGE_WORKTREE_ADDED=0
    fi
}

cleanup_temporary_secrets() {
    if [[ -n "${MYSQL_CNF:-}" && -f "$MYSQL_CNF" ]]; then
        rm -f -- "$MYSQL_CNF"
    fi
    if [[ -n "${MYSQL_DATABASE_FILE:-}" && -f "$MYSQL_DATABASE_FILE" ]]; then
        rm -f -- "$MYSQL_DATABASE_FILE"
    fi
}

write_release_summary() {
    emit "CURRENT_SHA" "$CURRENT_SHA"
    emit "DEPLOY_SHA" "$DEPLOY_SHA"
    emit "RELEASE_RECORD" "$RELEASE_RECORD"
    emit "ROLLBACK_RUNTIME_PATH" "$ROLLBACK_RUNTIME_PATH"
    emit "MIGRATION_EXECUTED" "$([[ "$MIGRATION_EXECUTED" == "1" ]] && printf YES || printf NO)"
    emit "AI_SCHEDULER_BOOTSTRAP_REQUIRED" "$([[ "$AI_SCHEDULER_BOOTSTRAP_REQUIRED" == "1" ]] && printf YES || printf NO)"
    emit "PRODUCTION_CHANGED" "$([[ "$ACTIVATION_SUCCEEDED" == "1" ]] && printf YES || printf NO)"
}

handle_deploy_error() {
    local exit_code="$1"
    local line_number="$2"
    trap - ERR
    set +e
    emit "DEPLOY_ERROR_LINE" "$line_number"
    emit "DEPLOY_RESULT" "FAILED"
    if [[ "$ACTIVATION_STARTED" == "1" && "$ACTIVATION_SUCCEEDED" != "1" && "$ROLLBACK_STARTED" != "1" ]]; then
        rollback_release
    elif [[ "$MIGRATION_EXECUTED" == "1" ]]; then
        emit "DATABASE_ROLLBACK" "NOT_AUTOMATIC"
    fi
    cleanup_temporary_secrets
    exit "$exit_code"
}

main() {
    trap 'handle_deploy_error $? $LINENO' ERR
    trap cleanup_temporary_secrets EXIT

    initialize_context
    acquire_lock
    run_preflight

    if is_enabled "$CHECK_ONLY"; then
        emit "CHECK_ONLY" "PASS"
        emit "PRODUCTION_CHANGED" "NO"
        return 0
    fi

    create_release_record
    backup_environment
    backup_database
    prepare_stage
    validate_backend
    validate_frontend
    check_migrations
    run_approved_migrations
    activate_release
    cleanup_stage_after_success
    write_release_summary
    emit "DEPLOY_RESULT" "PASS"
}
