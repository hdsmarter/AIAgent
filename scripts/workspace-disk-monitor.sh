#!/usr/bin/env bash
#
# workspace-disk-monitor.sh — Phase 6F
#
# Writes Prometheus textfile collector format to /var/tmp/workspace_disk.prom.
# Run every 10 minutes via LaunchAgent (com.hdsmarter.workspace-monitor.plist).
#
# Metrics exposed:
#   workspace_files_total — count of files under workspace/output
#   workspace_bytes_total — total bytes
#   workspace_avail_bytes — available disk space on the mount
#
# A node_exporter with --collector.textfile.directory=/var/tmp can scrape these.

set -euo pipefail

WORKSPACE="${WORKSPACE_DIR:-$HOME/Documents/OpenClaw/workspace/output}"
OUT="${OUT_FILE:-/var/tmp/workspace_disk.prom}"
TMP="${OUT}.tmp"

# Defensive: workspace may not exist on first run
if [ ! -d "$WORKSPACE" ]; then
  mkdir -p "$WORKSPACE"
fi

FILES=$(find "$WORKSPACE" -type f 2>/dev/null | wc -l | tr -d ' ')
BYTES=$(du -sk "$WORKSPACE" 2>/dev/null | awk '{print $1*1024}')
AVAIL=$(df -k "$WORKSPACE" | tail -1 | awk '{print $4*1024}')

# Atomic write — move .tmp into place so collector never sees partial file
cat > "$TMP" <<EOF
# HELP workspace_files_total Number of files under workspace/output
# TYPE workspace_files_total gauge
workspace_files_total ${FILES:-0}
# HELP workspace_bytes_total Total bytes under workspace/output
# TYPE workspace_bytes_total gauge
workspace_bytes_total ${BYTES:-0}
# HELP workspace_avail_bytes Available disk bytes on the workspace mount
# TYPE workspace_avail_bytes gauge
workspace_avail_bytes ${AVAIL:-0}
EOF

mv "$TMP" "$OUT"

echo "[$(date -u +%FT%TZ)] workspace_disk: files=${FILES} bytes=${BYTES} avail=${AVAIL}"
