#!/bin/bash
# common.sh — Shared functions for OpenClaw scripts (DRY)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Repo root (relative to any script that sources this)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log_info()  { printf "${BLUE}[INFO]${NC}  %s\n" "$*"; }
log_ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
log_warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
log_error() { printf "${RED}[ERROR]${NC} %s\n" "$*" >&2; }
log_step()  { printf "${CYAN}[STEP]${NC}  %s\n" "$*"; }

# Check if a command exists
require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" &>/dev/null; then
    log_error "Required command not found: $cmd"
    exit 1
  fi
}

# Run a command and report success/failure
run_check() {
  local label="$1"
  shift
  if "$@" &>/dev/null; then
    log_ok "$label"
    return 0
  else
    log_error "$label"
    return 1
  fi
}

# JSON timestamp (UTC)
json_timestamp() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

# Ensure openclaw is available
require_openclaw() {
  require_cmd openclaw
  if ! openclaw health &>/dev/null; then
    log_error "OpenClaw gateway is not responding"
    exit 1
  fi
}
