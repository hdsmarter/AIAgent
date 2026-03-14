#!/bin/bash
# Collect OpenClaw agent status and push to GitHub Pages
# Runs periodically via cron or GitHub Actions

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATUS_FILE="$REPO_ROOT/dashboard/data/status.json"

mkdir -p "$(dirname "$STATUS_FILE")"

# Collect gateway health
HEALTH=$(openclaw health --json 2>/dev/null || echo '{"error": "gateway offline"}')

# Collect channel status
CHANNELS=$(openclaw channels status --json 2>/dev/null || echo '{"error": "unavailable"}')

# Collect active sessions
SESSIONS=$(openclaw sessions list --json 2>/dev/null || echo '[]')

# Build status JSON
cat > "$STATUS_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname)",
  "gateway": $HEALTH,
  "channels": $CHANNELS,
  "sessions": $SESSIONS,
  "version": "$(openclaw --version 2>/dev/null || echo 'unknown')"
}
EOF

echo "Status collected at $(date)"
