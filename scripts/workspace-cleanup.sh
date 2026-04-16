#!/usr/bin/env bash
#
# workspace-cleanup.sh — Phase 6F
#
# Deletes files in workspace/output older than 7 days.
# Run daily at 02:00 via LaunchAgent (com.hdsmarter.workspace-monitor.plist
# uses StartInterval for monitor; for daily cleanup use StartCalendarInterval
# in the cleanup plist or invoke from the same plist via a wrapper).
#
# Safety:
#   - Only operates inside $WORKSPACE/output (verified to exist + non-root)
#   - Logs each deleted file to stdout
#   - Refuses to run if WORKSPACE evaluates to / or $HOME

set -euo pipefail

WORKSPACE="${WORKSPACE_DIR:-$HOME/Documents/OpenClaw/workspace/output}"
LOG_TAG="[workspace-cleanup]"

# ── Safety guards ──
case "$WORKSPACE" in
  ""|"/"|"$HOME"|"$HOME/")
    echo "$LOG_TAG REFUSE: WORKSPACE='$WORKSPACE' is unsafe (root or HOME)" >&2
    exit 2
    ;;
esac

if [ ! -d "$WORKSPACE" ]; then
  echo "$LOG_TAG INFO: workspace not found, nothing to clean: $WORKSPACE"
  exit 0
fi

# Don't sweep workspace/output/uploads (user uploads — different retention)
PRUNE_OPT=""
if [ -d "$WORKSPACE/uploads" ]; then
  PRUNE_OPT="-path $WORKSPACE/uploads -prune -o"
fi

# Count first (informational), then delete
BEFORE_COUNT=$(find "$WORKSPACE" -maxdepth 1 -type f -mtime +7 2>/dev/null | wc -l | tr -d ' ')

# Delete files >7 days old at the top level (not recursive into uploads/)
find "$WORKSPACE" -maxdepth 1 -type f -mtime +7 -print -delete 2>/dev/null || true

echo "$LOG_TAG [$(date -u +%FT%TZ)] Cleaned ${BEFORE_COUNT} file(s) older than 7 days from ${WORKSPACE}"
