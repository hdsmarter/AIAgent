#!/bin/bash
# test-health.sh — BDD-style health check tests
# Usage: ./tests/test-health.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PASS=0
FAIL=0

describe() { printf "\n\033[1m%s\033[0m\n" "$1"; }
it() { printf "  %-50s" "$1"; }
pass() { printf "\033[0;32mPASS\033[0m\n"; PASS=$((PASS + 1)); }
fail() { printf "\033[0;31mFAIL\033[0m — %s\n" "$1"; FAIL=$((FAIL + 1)); }

# --- Tests ---

describe "Gateway"

it "should have openclaw installed"
if command -v openclaw &>/dev/null; then pass; else fail "openclaw not found"; fi

it "should respond to health check"
if openclaw health &>/dev/null; then pass; else fail "gateway not responding"; fi

describe "Channels"

it "should report telegram status"
if openclaw channels status 2>&1 | grep -qi "telegram.*running\|telegram.*enabled"; then pass; else fail "telegram not running"; fi

it "should report line status"
if openclaw channels status 2>&1 | grep -qi "line.*running\|line.*enabled"; then pass; else fail "line not running"; fi

describe "Workspace"

it "should have SOUL.md"
if [[ -f "$REPO_ROOT/workspace/SOUL.md" ]]; then pass; else fail "missing"; fi

it "should have AGENTS.md"
if [[ -f "$REPO_ROOT/workspace/AGENTS.md" ]]; then pass; else fail "missing"; fi

it "should have IDENTITY.md"
if [[ -f "$REPO_ROOT/workspace/IDENTITY.md" ]]; then pass; else fail "missing"; fi

it "should have memory directory"
if [[ -d "$REPO_ROOT/workspace/memory" ]]; then pass; else fail "missing"; fi

describe "Scripts"

it "should have executable setup.sh"
if [[ -x "$REPO_ROOT/scripts/setup.sh" ]]; then pass; else fail "not executable"; fi

it "should have executable health-check.sh"
if [[ -x "$REPO_ROOT/scripts/health-check.sh" ]]; then pass; else fail "not executable"; fi

it "should have executable collect-status.sh"
if [[ -x "$REPO_ROOT/scripts/collect-status.sh" ]]; then pass; else fail "not executable"; fi

# --- Summary ---

echo ""
echo "────────────────────────────────"
printf "Results: \033[0;32m%d passed\033[0m, \033[0;31m%d failed\033[0m\n" "$PASS" "$FAIL"

exit $FAIL
