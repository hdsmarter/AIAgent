#!/bin/bash
# health-check.sh — Parallel channel health check
# Usage: ./scripts/health-check.sh [--json]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

JSON_OUTPUT=false
[[ "${1:-}" == "--json" ]] && JSON_OUTPUT=true

CHANNELS=("telegram" "line")
ERRORS=0

check_gateway() {
  # Try NemoClaw first, fall back to direct OpenClaw
  if command -v nemoclaw &>/dev/null; then
    if nemoclaw nemoclaw status 2>/dev/null | grep -qi "running"; then
      echo "running"
    else
      echo "offline"
    fi
  elif openclaw health &>/dev/null; then
    echo "running"
  else
    echo "offline"
  fi
}

check_channels() {
  # Try NemoClaw sandbox, fall back to direct OpenClaw
  local output
  if command -v nemoclaw &>/dev/null; then
    output=$(nemoclaw nemoclaw connect -- openclaw channels status 2>&1)
  else
    output=$(openclaw channels status 2>&1)
  fi
  for ch in "${CHANNELS[@]}"; do
    if echo "$output" | grep -qi "${ch}.*running"; then
      CHANNEL_STATUS[$ch]="ok"
    else
      CHANNEL_STATUS[$ch]="error"
      ERRORS=$((ERRORS + 1))
    fi
  done
}

# Gateway check
GATEWAY_STATUS=$(check_gateway)

# Channel checks
declare -A CHANNEL_STATUS
check_channels

if $JSON_OUTPUT; then
  # JSON output for dashboard consumption
  cat <<EOF
{
  "timestamp": "$(json_timestamp)",
  "gateway": "$GATEWAY_STATUS",
  "channels": {
    "telegram": "${CHANNEL_STATUS[telegram]}",
    "line": "${CHANNEL_STATUS[line]}"
  },
  "errors": $ERRORS,
  "healthy": $([ $ERRORS -eq 0 ] && [ "$GATEWAY_STATUS" = "running" ] && echo true || echo false)
}
EOF
else
  # Human-readable output
  echo "⚡ HD Smarter 天使 Health Check — $(date)"
  echo "────────────────────────────────"

  if [[ "$GATEWAY_STATUS" == "running" ]]; then
    log_ok "Gateway: running"
  else
    log_error "Gateway: offline"
    ERRORS=$((ERRORS + 1))
  fi

  for ch in "${CHANNELS[@]}"; do
    if [[ "${CHANNEL_STATUS[$ch]}" == "ok" ]]; then
      log_ok "Channel $ch: connected"
    else
      log_error "Channel $ch: error"
    fi
  done

  echo "────────────────────────────────"
  if [[ $ERRORS -eq 0 ]]; then
    log_ok "All systems healthy"
  else
    log_error "$ERRORS issue(s) detected"
  fi
fi

exit $ERRORS
