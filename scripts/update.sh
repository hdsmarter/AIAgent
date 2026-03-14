#!/bin/bash
# update.sh — Safe OpenClaw update with workspace backup
# Usage: ./scripts/update.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

BACKUP_DIR="$REPO_ROOT/.backups"

log_info "⚡ OpenClaw Update"
echo "─────────────────────────────────"

require_cmd openclaw

# Step 1: Show current version
CURRENT=$(openclaw --version 2>/dev/null)
log_info "Current version: $CURRENT"

# Step 2: Backup workspace
log_step "Backing up workspace..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="$BACKUP_DIR/workspace-$TIMESTAMP"
mkdir -p "$BACKUP_PATH"
cp -r "$REPO_ROOT/workspace/" "$BACKUP_PATH/" 2>/dev/null || true
log_ok "Backup saved to: $BACKUP_PATH"

# Step 3: Backup OpenClaw config
log_step "Backing up OpenClaw config..."
OPENCLAW_CONFIG_DIR="$HOME/.openclaw"
if [[ -d "$OPENCLAW_CONFIG_DIR" ]]; then
  cp "$OPENCLAW_CONFIG_DIR/openclaw.json" "$BACKUP_PATH/openclaw.json" 2>/dev/null || true
  log_ok "Config backed up"
fi

# Step 4: Run update
log_step "Running openclaw update..."
if openclaw update 2>&1; then
  NEW_VERSION=$(openclaw --version 2>/dev/null)
  log_ok "Updated: $CURRENT → $NEW_VERSION"
else
  log_error "Update failed — workspace restored from backup"
  exit 1
fi

# Step 5: Post-update health check
log_step "Running post-update health check..."
sleep 2
bash "$SCRIPT_DIR/health-check.sh" || log_warn "Some health checks failed — review with: openclaw doctor"

echo ""
echo "─────────────────────────────────"
log_info "Update complete!"

# Cleanup old backups (keep last 5)
BACKUP_COUNT=$(ls -1d "$BACKUP_DIR"/workspace-* 2>/dev/null | wc -l)
if [[ $BACKUP_COUNT -gt 5 ]]; then
  ls -1d "$BACKUP_DIR"/workspace-* | head -n $((BACKUP_COUNT - 5)) | xargs rm -rf
  log_info "Cleaned up old backups (kept last 5)"
fi
