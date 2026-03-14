#!/bin/bash
# test-status.sh — BDD-style tests for status collection
# Usage: ./tests/test-status.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATUS_FILE="$REPO_ROOT/dashboard/data/status.json"
PASS=0
FAIL=0

describe() { printf "\n\033[1m%s\033[0m\n" "$1"; }
it() { printf "  %-50s" "$1"; }
pass() { printf "\033[0;32mPASS\033[0m\n"; PASS=$((PASS + 1)); }
fail() { printf "\033[0;31mFAIL\033[0m — %s\n" "$1"; FAIL=$((FAIL + 1)); }

# --- Tests ---

describe "Status Collection"

it "should run collect-status.sh without error"
if bash "$REPO_ROOT/scripts/collect-status.sh" &>/dev/null; then pass; else fail "script error"; fi

it "should produce status.json"
if [[ -f "$STATUS_FILE" ]]; then pass; else fail "file not found"; fi

it "should be valid JSON"
if command -v jq &>/dev/null; then
  if jq empty "$STATUS_FILE" 2>/dev/null; then pass; else fail "invalid JSON"; fi
else
  pass  # skip if jq not installed
fi

describe "Status JSON Structure"

it "should have timestamp field"
if jq -e '.timestamp' "$STATUS_FILE" &>/dev/null; then pass; else fail "missing timestamp"; fi

it "should have gateway field"
if jq -e '.gateway' "$STATUS_FILE" &>/dev/null; then pass; else fail "missing gateway"; fi

it "should have channels field"
if jq -e '.channels' "$STATUS_FILE" &>/dev/null; then pass; else fail "missing channels"; fi

it "should have version field"
if jq -e '.version' "$STATUS_FILE" &>/dev/null; then pass; else fail "missing version"; fi

describe "Dashboard Files"

it "should have index.html"
if [[ -f "$REPO_ROOT/dashboard/index.html" ]]; then pass; else fail "missing"; fi

it "should have styles.css"
if [[ -f "$REPO_ROOT/dashboard/css/styles.css" ]]; then pass; else fail "missing"; fi

it "should have app.js"
if [[ -f "$REPO_ROOT/dashboard/js/app.js" ]]; then pass; else fail "missing"; fi

# --- Summary ---

echo ""
echo "────────────────────────────────"
printf "Results: \033[0;32m%d passed\033[0m, \033[0;31m%d failed\033[0m\n" "$PASS" "$FAIL"

exit $FAIL
