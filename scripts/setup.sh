#!/bin/bash
# setup.sh — One-command OpenClaw workspace setup (Unix Pipe style)
# Usage: ./scripts/setup.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

log_info "⚡ OpenClaw Workspace Setup"
echo "─────────────────────────────────"

# Step 1: Check prerequisites
log_step "Checking prerequisites..."
require_cmd git
require_cmd jq

# Check for NemoClaw (preferred) or OpenClaw (fallback)
USE_NEMOCLAW=false
if command -v nemoclaw &>/dev/null; then
  USE_NEMOCLAW=true
  NEMOCLAW_VERSION=$(nemoclaw --version 2>/dev/null || echo "unknown")
  log_ok "NemoClaw: $NEMOCLAW_VERSION"
  # Verify Docker is running (required for NemoClaw sandbox)
  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    log_ok "Docker: running"
  else
    log_error "Docker Desktop is required for NemoClaw but not running"
    exit 1
  fi
else
  require_cmd openclaw
  log_warn "NemoClaw not found — using direct OpenClaw mode"
fi

OPENCLAW_VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
log_ok "OpenClaw: $OPENCLAW_VERSION"

# Step 2: Check gateway
log_step "Checking gateway..."
if $USE_NEMOCLAW; then
  if nemoclaw nemoclaw status 2>/dev/null | grep -qi "running"; then
    log_ok "NemoClaw sandbox is running"
  else
    log_warn "NemoClaw sandbox not running — attempting start..."
    nemoclaw start &>/dev/null || true
    sleep 3
    if nemoclaw nemoclaw status 2>/dev/null | grep -qi "running"; then
      log_ok "NemoClaw sandbox started successfully"
    else
      log_error "Failed to start NemoClaw. Run: nemoclaw start"
      exit 1
    fi
  fi
elif openclaw health &>/dev/null; then
  log_ok "Gateway is running"
else
  log_warn "Gateway not running — attempting start..."
  openclaw start &>/dev/null || true
  sleep 2
  if openclaw health &>/dev/null; then
    log_ok "Gateway started successfully"
  else
    log_error "Failed to start gateway. Run: openclaw start"
    exit 1
  fi
fi

# Step 3: Check workspace files
log_step "Checking workspace files..."
WORKSPACE_DIR="$REPO_ROOT/workspace"
REQUIRED_FILES=(SOUL.md AGENTS.md IDENTITY.md USER.md TOOLS.md HEARTBEAT.md MEMORY.md)
MISSING=0

for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$WORKSPACE_DIR/$f" ]]; then
    log_ok "workspace/$f"
  else
    log_warn "Missing: workspace/$f"
    MISSING=$((MISSING + 1))
  fi
done

if [[ $MISSING -gt 0 ]]; then
  log_warn "$MISSING workspace file(s) missing — see workspace/ README for templates"
fi

# Step 4: Check channels
log_step "Checking channels..."
openclaw channels status 2>&1 | while IFS= read -r line; do
  case "$line" in
    *running*) log_ok "$line" ;;
    *Warning*|*warn*) log_warn "$line" ;;
    *error*|*Error*) log_error "$line" ;;
  esac
done

# Step 5: Create data directories
log_step "Ensuring directories..."
mkdir -p "$REPO_ROOT/dashboard/data"
mkdir -p "$REPO_ROOT/workspace/memory"
log_ok "Directory structure ready"

# Step 6: Run initial status collection
log_step "Collecting initial status..."
if [[ -x "$SCRIPT_DIR/collect-status.sh" ]]; then
  bash "$SCRIPT_DIR/collect-status.sh" && log_ok "Status collected" || log_warn "Status collection failed"
else
  log_warn "collect-status.sh not executable — run: chmod +x scripts/collect-status.sh"
fi

echo ""
echo "─────────────────────────────────"
log_info "Setup complete! Run 'openclaw doctor' for detailed diagnostics."
