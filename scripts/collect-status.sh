#!/bin/bash
# Collect AIAgent status and push to GitHub Pages
# Runs periodically via cron or GitHub Actions

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATUS_FILE="$REPO_ROOT/dashboard/data/status.json"

mkdir -p "$(dirname "$STATUS_FILE")"

# Detect runtime mode
USE_NEMOCLAW=false
if command -v nemoclaw &>/dev/null; then
  USE_NEMOCLAW=true
fi

# Collect gateway health
if $USE_NEMOCLAW; then
  HEALTH=$(nemoclaw nemoclaw status --json 2>/dev/null || echo '{"error": "sandbox offline"}')
else
  HEALTH=$(openclaw health --json 2>/dev/null || echo '{"error": "gateway offline"}')
fi

# Collect channel status (via sandbox or direct)
if $USE_NEMOCLAW; then
  CHANNELS=$(nemoclaw nemoclaw connect -- openclaw channels status --json 2>/dev/null || echo '{"error": "unavailable"}')
else
  CHANNELS=$(openclaw channels status --json 2>/dev/null || echo '{"error": "unavailable"}')
fi

# Collect active sessions
if $USE_NEMOCLAW; then
  SESSIONS=$(nemoclaw nemoclaw connect -- openclaw sessions list --json 2>/dev/null || echo '[]')
else
  SESSIONS=$(openclaw sessions list --json 2>/dev/null || echo '[]')
fi

# Build status JSON
RUNTIME_MODE=$($USE_NEMOCLAW && echo "nemoclaw" || echo "openclaw")
cat > "$STATUS_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname)",
  "runtime": "$RUNTIME_MODE",
  "gateway": $HEALTH,
  "channels": $CHANNELS,
  "sessions": $SESSIONS,
  "version": "$(openclaw --version 2>/dev/null || echo 'unknown')",
  "nemoclaw_version": "$(nemoclaw --version 2>/dev/null || echo 'n/a')"
}
EOF

echo "Status collected at $(date)"
