#!/usr/bin/env bash

set -Eeuo pipefail
umask 022

: "${PRODUCTION_ROOT:=/www/wwwroot/kinhmathongnhung.vn}"
: "${AI_SCHEDULER_PM2_APP:=glass-ai-scheduler}"

PM2_CONFIG="$PRODUCTION_ROOT/ecosystem.ai-scheduler.config.cjs"
PHP_BIN="/www/server/php/82/bin/php"

[[ -d "$PRODUCTION_ROOT/backend" ]] || {
    printf 'AI_SCHEDULER_BOOTSTRAP=FAILED\n' >&2
    printf 'ERROR: backend directory is missing: %s\n' "$PRODUCTION_ROOT/backend" >&2
    exit 1
}
[[ -x "$PHP_BIN" ]] || {
    printf 'AI_SCHEDULER_BOOTSTRAP=FAILED\n' >&2
    printf 'ERROR: PHP binary is not executable: %s\n' "$PHP_BIN" >&2
    exit 1
}
[[ -f "$PM2_CONFIG" ]] || {
    printf 'AI_SCHEDULER_BOOTSTRAP=FAILED\n' >&2
    printf 'ERROR: PM2 config is missing: %s\n' "$PM2_CONFIG" >&2
    exit 1
}
command -v pm2 >/dev/null 2>&1 || {
    printf 'AI_SCHEDULER_BOOTSTRAP=FAILED\n' >&2
    printf 'ERROR: pm2 is unavailable\n' >&2
    exit 1
}

if pm2 describe "$AI_SCHEDULER_PM2_APP" >/dev/null 2>&1; then
    pm2 restart "$AI_SCHEDULER_PM2_APP" --update-env
    printf 'AI_SCHEDULER_ACTION=RESTARTED\n'
else
    pm2 start "$PM2_CONFIG" --only "$AI_SCHEDULER_PM2_APP"
    printf 'AI_SCHEDULER_ACTION=STARTED\n'
fi

SCHEDULER_PID="$(pm2 pid "$AI_SCHEDULER_PM2_APP" | awk 'NF {print; exit}')"
[[ "$SCHEDULER_PID" =~ ^[1-9][0-9]*$ ]] || {
    printf 'AI_SCHEDULER_BOOTSTRAP=FAILED\n' >&2
    printf 'ERROR: scheduler has no online PID\n' >&2
    exit 1
}
pm2 describe "$AI_SCHEDULER_PM2_APP" | grep -Eq 'status.*online' || {
    printf 'AI_SCHEDULER_BOOTSTRAP=FAILED\n' >&2
    printf 'ERROR: scheduler process is not online\n' >&2
    exit 1
}

pm2 save
printf 'AI_SCHEDULER_PID=%s\n' "$SCHEDULER_PID"
printf 'AI_SCHEDULER_BOOTSTRAP=PASS\n'
