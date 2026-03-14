#!/bin/bash
# test-dashboard.sh — BDD-style tests for dashboard files
# Usage: ./tests/test-dashboard.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DASH="$REPO_ROOT/dashboard"
SKILLS_DIR="$HOME/.claude/skills"
PASS=0
FAIL=0

describe() { printf "\n\033[1m%s\033[0m\n" "$1"; }
it() { printf "  %-55s" "$1"; }
pass() { printf "\033[0;32mPASS\033[0m\n"; PASS=$((PASS + 1)); }
fail() { printf "\033[0;31mFAIL\033[0m — %s\n" "$1"; FAIL=$((FAIL + 1)); }

# ─── Dashboard Files ──────────────────────────

describe "Dashboard Files"

it "should have index.html"
if [[ -f "$DASH/index.html" ]]; then pass; else fail "not found"; fi

it "should have all 9 JS files"
EXPECTED_JS="i18n.js pixel-sprites.js office-scene.js status-fetcher.js chat-client.js notifications.js chat-panel.js settings-panel.js app.js"
ALL_FOUND=true
for f in $EXPECTED_JS; do
  [[ -f "$DASH/js/$f" ]] || ALL_FOUND=false
done
if $ALL_FOUND; then pass; else fail "missing JS file(s)"; fi

it "should have styles.css"
if [[ -f "$DASH/css/styles.css" ]]; then pass; else fail "not found"; fi

it "should not use innerHTML (XSS safety)"
if grep -rn 'innerHTML' "$DASH/js/"*.js >/dev/null 2>&1; then
  fail "innerHTML found"
else
  pass
fi

it "should have roundRect polyfill"
if grep -q 'roundRect' "$DASH/js/pixel-sprites.js" && \
   grep -q 'prototype.roundRect' "$DASH/js/pixel-sprites.js"; then
  pass
else
  fail "polyfill missing"
fi

it "should have viewport-fit=cover meta"
if grep -q 'viewport-fit=cover' "$DASH/index.html"; then pass; else fail "missing"; fi

it "should have mobile media queries"
if grep -q '@media.*max-width.*640px' "$DASH/css/styles.css"; then pass; else fail "missing"; fi

# ─── i18n ────────────────────────────────────

describe "i18n"

it "should have i18n.js with zh-TW strings"
if grep -q 'zh-TW' "$DASH/js/i18n.js"; then pass; else fail "missing zh-TW"; fi

it "should have i18n.js with zh-CN strings"
if grep -q 'zh-CN' "$DASH/js/i18n.js"; then pass; else fail "missing zh-CN"; fi

it "should have i18n.js with en strings"
if grep -q "'en'" "$DASH/js/i18n.js"; then pass; else fail "missing en"; fi

it "should load i18n.js before all other scripts"
I18N_LINE=$(grep -n 'i18n.js' "$DASH/index.html" | head -1 | cut -d: -f1)
PIXEL_LINE=$(grep -n 'pixel-sprites.js' "$DASH/index.html" | head -1 | cut -d: -f1)
if [[ -n "$I18N_LINE" && -n "$PIXEL_LINE" && "$I18N_LINE" -lt "$PIXEL_LINE" ]]; then
  pass
else
  fail "i18n.js not first"
fi

# ─── Agents ──────────────────────────────────

describe "Agents"

it "should have 16 agent palettes"
PALETTE_COUNT=$(grep -c 'shirt:' "$DASH/js/pixel-sprites.js" || true)
if [[ "$PALETTE_COUNT" -ge 16 ]]; then pass; else fail "found $PALETTE_COUNT palettes"; fi

it "should have 16 seats in office-scene"
SEAT_COUNT=$(grep -c 'col:.*row:.*dir:' "$DASH/js/office-scene.js" || true)
if [[ "$SEAT_COUNT" -ge 16 ]]; then pass; else fail "found $SEAT_COUNT seats"; fi

it "should have 16 agent name keys in i18n"
AGENT_KEYS=$(grep -c "'agent\." "$DASH/js/i18n.js" || true)
if [[ "$AGENT_KEYS" -ge 16 ]]; then pass; else fail "found $AGENT_KEYS agent keys"; fi

# ─── Chat Client ─────────────────────────────

describe "Chat Client"

it "should have chat-client.js (not gateway-client.js)"
if [[ -f "$DASH/js/chat-client.js" ]] && ! grep -q 'gateway-client' "$DASH/index.html"; then
  pass
else
  fail "chat-client.js missing or gateway-client still referenced"
fi

it "should support Telegram mode"
if grep -q 'telegram' "$DASH/js/chat-client.js" && grep -q 'api.telegram.org' "$DASH/js/chat-client.js"; then
  pass
else
  fail "no Telegram support"
fi

it "should support Gateway WebSocket mode"
if grep -q 'WebSocket' "$DASH/js/chat-client.js"; then pass; else fail "no WebSocket"; fi

it "should have exponential backoff"
if grep -q 'reconnectMax\|reconnectDelay.*\*.*2\|_reconnectDelay' "$DASH/js/chat-client.js"; then
  pass
else
  fail "no backoff"
fi

# ─── Chat Panel ───────────────────────────────

describe "Chat Panel"

it "should use I18n.t() for UI text"
if grep -q 'I18n.t(' "$DASH/js/chat-panel.js"; then pass; else fail "not using I18n"; fi

it "should use DOM methods (no innerHTML)"
if grep -q 'innerHTML' "$DASH/js/chat-panel.js" 2>/dev/null; then
  fail "uses innerHTML"
else
  pass
fi

# ─── Settings Panel ──────────────────────────

describe "Settings Panel"

it "should have language selector"
if grep -q 'langSelect\|langLabel' "$DASH/js/settings-panel.js"; then pass; else fail "missing"; fi

it "should have chat mode selector"
if grep -q 'modeSelect\|chatMode' "$DASH/js/settings-panel.js"; then pass; else fail "missing"; fi

it "should have test connection feature"
if grep -q 'testConnection' "$DASH/js/settings-panel.js"; then pass; else fail "missing"; fi

# ─── Script Load Order ───────────────────────

describe "Script Load Order"

it "should load chat-client before app.js"
CC_LINE=$(grep -n 'chat-client' "$DASH/index.html" | head -1 | cut -d: -f1)
APP_LINE=$(grep -n 'app.js' "$DASH/index.html" | head -1 | cut -d: -f1)
if [[ -n "$CC_LINE" && -n "$APP_LINE" && "$CC_LINE" -lt "$APP_LINE" ]]; then
  pass
else
  fail "wrong order"
fi

it "should load chat-panel before app.js"
CP_LINE=$(grep -n 'chat-panel' "$DASH/index.html" | head -1 | cut -d: -f1)
if [[ -n "$CP_LINE" && -n "$APP_LINE" && "$CP_LINE" -lt "$APP_LINE" ]]; then
  pass
else
  fail "wrong order"
fi

# ─── Skills ──────────────────────────────────

describe "Claude Skills"

SKILL_SLUGS="nexus-data-analyst nexus-marketing nexus-finance nexus-hr nexus-supply-chain nexus-it-architect nexus-project-mgr nexus-customer-svc nexus-legal nexus-product-mgr nexus-ux-designer nexus-content nexus-bd nexus-quality nexus-security nexus-hr-director"

it "should have 16 skill directories"
SKILL_COUNT=0
for slug in $SKILL_SLUGS; do
  [[ -d "$SKILLS_DIR/$slug" ]] && SKILL_COUNT=$((SKILL_COUNT + 1))
done
if [[ "$SKILL_COUNT" -ge 16 ]]; then pass; else fail "found $SKILL_COUNT/16 skills"; fi

it "should have SKILL.md in each skill directory"
ALL_SKILLS=true
for slug in $SKILL_SLUGS; do
  [[ -f "$SKILLS_DIR/$slug/SKILL.md" ]] || ALL_SKILLS=false
done
if $ALL_SKILLS; then pass; else fail "missing SKILL.md files"; fi

# ─── Summary ──────────────────────────────────

printf "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
printf "  Results: \033[0;32m%d passed\033[0m" "$PASS"
if [[ $FAIL -gt 0 ]]; then
  printf ", \033[0;31m%d failed\033[0m" "$FAIL"
fi
printf "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

exit "$FAIL"
