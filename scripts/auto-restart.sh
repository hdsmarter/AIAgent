#!/bin/bash
# auto-restart.sh — Check OpenClaw gateway health and restart if offline
# Used by launchd plist for automatic recovery
# Usage: ./scripts/auto-restart.sh

LOGFILE="/tmp/openclaw/auto-restart.log"
mkdir -p /tmp/openclaw

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOGFILE"
}

# Check if gateway is responding
if curl -s --connect-timeout 3 http://127.0.0.1:18789/health | grep -q '"ok":true'; then
  # Healthy — no action needed
  exit 0
fi

log "[WARN] OpenClaw gateway offline, attempting restart..."

# Kill any stale gateway process
pkill -f "openclaw gateway" 2>/dev/null || true
sleep 2

# Start gateway in background
cd /Users/tonyjiang/Documents/OpenClaw
nohup /opt/homebrew/bin/openclaw gateway --port 18789 >> /tmp/openclaw/gateway.log 2>&1 &
GATEWAY_PID=$!
log "[INFO] Started gateway PID=$GATEWAY_PID"

# Wait and verify
sleep 5
if curl -s --connect-timeout 3 http://127.0.0.1:18789/health | grep -q '"ok":true'; then
  log "[OK] Gateway recovered successfully (PID=$GATEWAY_PID)"
else
  log "[ERROR] Gateway failed to start"
  exit 1
fi
