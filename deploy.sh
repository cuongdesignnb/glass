#!/usr/bin/env bash

set -Eeuo pipefail
umask 022

MITOO_DEPLOY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
export MITOO_DEPLOY_SCRIPT_DIR

# shellcheck source=scripts/deploy/mitoo-deploy-lib.sh
source "$MITOO_DEPLOY_SCRIPT_DIR/scripts/deploy/mitoo-deploy-lib.sh"

main "$@"
