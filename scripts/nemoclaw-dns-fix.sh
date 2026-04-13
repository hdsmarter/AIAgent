#!/bin/bash
# nemoclaw-dns-fix.sh — Fix DNS inside NemoClaw sandbox
# Runs fix-coredns.sh (patch CoreDNS to 8.8.8.8) + setup-dns-proxy.sh (sandbox DNS proxy)
# Safe to run multiple times (idempotent)
#
# Usage: ./scripts/nemoclaw-dns-fix.sh [--check]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

NEMOCLAW_SCRIPTS="$HOME/.nemoclaw/source/scripts"
GATEWAY_NAME="nemoclaw"
SANDBOX_NAME="nemoclaw"
CHECK_ONLY=false

[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true

# ── Prerequisites ──────────────────────────────────────────────────

if ! command -v docker &>/dev/null; then
  log_error "Docker not found"
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  log_error "Docker not running"
  exit 1
fi

# Check if sandbox is running
if ! nemoclaw nemoclaw status 2>/dev/null | grep -q "Ready"; then
  log_warn "Sandbox not ready — skipping DNS fix"
  exit 0
fi

# ── Check mode: test DNS from sandbox ──────────────────────────────

check_dns() {
  local result
  result=$(ssh -o "ProxyCommand=$HOME/.local/bin/openshell ssh-proxy --gateway-name $GATEWAY_NAME --name $SANDBOX_NAME" \
    -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes \
    sandbox@openshell-nemoclaw \
    "getent hosts github.com 2>/dev/null" 2>/dev/null || true)
  if [[ -n "$result" ]]; then
    return 0
  else
    return 1
  fi
}

if $CHECK_ONLY; then
  if check_dns; then
    log_ok "DNS is working"
    exit 0
  else
    log_error "DNS is broken"
    exit 1
  fi
fi

# ── Fix CoreDNS upstream ──────────────────────────────────────────

log_step "Fixing CoreDNS upstream..."

CLUSTER=$(docker ps --filter "name=openshell-cluster" --format '{{.Names}}' | head -1)
if [[ -z "$CLUSTER" ]]; then
  log_error "No openshell-cluster container found"
  exit 1
fi

docker exec "$CLUSTER" kubectl patch configmap coredns -n kube-system --type merge \
  -p '{"data":{"Corefile":".:53 {\n    errors\n    health\n    ready\n    kubernetes cluster.local in-addr.arpa ip6.arpa {\n      pods insecure\n      fallthrough in-addr.arpa ip6.arpa\n    }\n    hosts /etc/coredns/NodeHosts {\n      ttl 60\n      reload 15s\n      fallthrough\n    }\n    prometheus :9153\n    cache 30\n    loop\n    reload\n    loadbalance\n    forward . 8.8.8.8\n}\n"}}' >/dev/null 2>&1

docker exec "$CLUSTER" kubectl rollout restart deploy/coredns -n kube-system >/dev/null 2>&1
docker exec "$CLUSTER" kubectl rollout status deploy/coredns -n kube-system --timeout=30s >/dev/null 2>&1
log_ok "CoreDNS patched → 8.8.8.8"

# ── Setup sandbox DNS proxy ────────────────��──────────────────────

log_step "Setting up sandbox DNS proxy..."

if [[ -x "$NEMOCLAW_SCRIPTS/setup-dns-proxy.sh" ]]; then
  cd "$HOME/.nemoclaw/source"
  OUTPUT=$(bash scripts/setup-dns-proxy.sh "$GATEWAY_NAME" "$SANDBOX_NAME" 2>&1)
  PASS_COUNT=$(echo "$OUTPUT" | grep -c "\\[PASS\\]" || true)
  FAIL_COUNT=$(echo "$OUTPUT" | grep -c "\\[FAIL\\]" || true)
  log_ok "DNS proxy: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"
  if [[ "$FAIL_COUNT" -gt 0 ]]; then
    echo "$OUTPUT" | grep "\\[FAIL\\]"
  fi
else
  log_error "setup-dns-proxy.sh not found at $NEMOCLAW_SCRIPTS"
  exit 1
fi

# ── Verify ───────────��────────────────────────────────────────────

log_step "Verifying DNS..."
sleep 2

if check_dns; then
  log_ok "DNS fix complete — all working"
else
  log_warn "DNS verification failed — may need more time"
fi
