#!/usr/bin/env bash
#
# test-line-externalise.sh — BDD tests for scripts/line-externalise-credentials.sh
#
# Covers (HEALTH-CHECK H5 / INFRA-8):
#   ✓ Migrates inline tokens to files
#   ✓ Writes credential files with chmod 600
#   ✓ Rewrites openclaw.json to reference tokenFile/secretFile
#   ✓ Removes raw channelAccessToken/channelSecret from config
#   ✓ Idempotent: re-run after migration is a no-op
#   ✓ Fails fast when config contains a SecretRef object (H5 root cause)
#   ✓ Fails fast when nothing to migrate
#   ✓ Refuses to overwrite existing credential files
#   ✓ Backs up original config before mutating
#   ✓ Dry-run mode makes zero side-effects
#
# Design:
#   * Hermetic — each test uses its own tmpdir; real ~/.openclaw is untouched.
#   * No real LINE credentials — uses obvious fake strings.
#   * Uses trap+exit handler to always clean up tmpdirs.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATE_SH="$REPO_ROOT/scripts/line-externalise-credentials.sh"

PASS=0
FAIL=0

describe() { printf "\n\033[1m%s\033[0m\n" "$1"; }
it()       { printf "  %-60s" "$1"; }
pass()     { printf "\033[0;32mPASS\033[0m\n"; PASS=$((PASS + 1)); }
fail()     { printf "\033[0;31mFAIL\033[0m — %s\n" "$1"; FAIL=$((FAIL + 1)); }

# Per-test fixture: fresh tmp dirs, fake openclaw.json with plaintext creds.
setup_fixture() {
  local tmp
  tmp="$(mktemp -d)"
  mkdir -p "$tmp/conf" "$tmp/creds"
  cat > "$tmp/conf/openclaw.json" <<'EOF'
{
  "channels": {
    "line": {
      "enabled": true,
      "channelAccessToken": "FAKE_TOKEN_FOR_TEST_abcdef1234567890",
      "channelSecret": "FAKE_SECRET_FOR_TEST_9876543210abcdef"
    }
  }
}
EOF
  chmod 600 "$tmp/conf/openclaw.json"
  echo "$tmp"
}

run_migrate() {
  # Prevent common.sh from overriding CONFIG_PATH/CREDS_DIR via env pollution.
  bash "$MIGRATE_SH" --config "$1" --creds-dir "$2" "${@:3}"
}

# ── Tests ────────────────────────────────────────────────────

describe "Happy path — plaintext → tokenFile/secretFile"
TMP="$(setup_fixture)"
trap 'rm -rf "$TMP"' EXIT

it "should exit 0 on migration"
if run_migrate "$TMP/conf/openclaw.json" "$TMP/creds" >/dev/null; then pass; else fail "migrate exited non-zero"; fi

it "should write token file with 600 perms"
tok="$TMP/creds/line-channel-access-token.txt"
if [[ -f "$tok" && "$(stat -f '%OLp' "$tok" 2>/dev/null || stat -c '%a' "$tok")" == "600" ]]; then pass; else fail "perm != 600 or file missing"; fi

it "should write secret file with 600 perms"
sec="$TMP/creds/line-channel-secret.txt"
if [[ -f "$sec" && "$(stat -f '%OLp' "$sec" 2>/dev/null || stat -c '%a' "$sec")" == "600" ]]; then pass; else fail "perm != 600 or file missing"; fi

it "should write creds dir with 700 perms"
if [[ "$(stat -f '%OLp' "$TMP/creds" 2>/dev/null || stat -c '%a' "$TMP/creds")" == "700" ]]; then pass; else fail "creds dir not 700"; fi

it "should store token content verbatim (no trailing newline)"
if [[ "$(cat "$tok")" == "FAKE_TOKEN_FOR_TEST_abcdef1234567890" ]]; then pass; else fail "token content differs"; fi

it "should remove channelAccessToken from config"
if ! jq -e '.channels.line.channelAccessToken' "$TMP/conf/openclaw.json" >/dev/null 2>&1; then pass; else fail "channelAccessToken still present"; fi

it "should remove channelSecret from config"
if ! jq -e '.channels.line.channelSecret' "$TMP/conf/openclaw.json" >/dev/null 2>&1; then pass; else fail "channelSecret still present"; fi

it "should set tokenFile pointing at written path"
got="$(jq -r '.channels.line.tokenFile' "$TMP/conf/openclaw.json")"
if [[ "$got" == "$tok" ]]; then pass; else fail "tokenFile=$got (want $tok)"; fi

it "should set secretFile pointing at written path"
got="$(jq -r '.channels.line.secretFile' "$TMP/conf/openclaw.json")"
if [[ "$got" == "$sec" ]]; then pass; else fail "secretFile=$got (want $sec)"; fi

it "should leave a backup of the pre-migration config"
# Pick up any file starting with openclaw.json.pre-h5-
if ls "$TMP/conf/openclaw.json.pre-h5-"* >/dev/null 2>&1; then pass; else fail "no backup found"; fi

it "should preserve channels.line.enabled=true"
if [[ "$(jq -r '.channels.line.enabled' "$TMP/conf/openclaw.json")" == "true" ]]; then pass; else fail "enabled lost"; fi

it "should be idempotent (re-run exits 0 and no-ops)"
if run_migrate "$TMP/conf/openclaw.json" "$TMP/creds" 2>&1 | grep -qi "already externalised"; then pass; else fail "re-run did not recognise migrated state"; fi

rm -rf "$TMP"; trap - EXIT

describe "Failure modes"

TMP="$(setup_fixture)"
trap 'rm -rf "$TMP"' EXIT

it "should fail when config has SecretRef object (H5 root cause)"
cat > "$TMP/conf/openclaw.json" <<'EOF'
{"channels":{"line":{"channelAccessToken":{"source":"file","provider":"line","id":"/tok"},"channelSecret":"x"}}}
EOF
if ! run_migrate "$TMP/conf/openclaw.json" "$TMP/creds" >/dev/null 2>&1; then pass; else fail "should have refused SecretRef object"; fi

it "should fail when no inline tokens present"
cat > "$TMP/conf/openclaw.json" <<'EOF'
{"channels":{"line":{"enabled":true}}}
EOF
if ! run_migrate "$TMP/conf/openclaw.json" "$TMP/creds-empty" >/dev/null 2>&1; then pass; else fail "should have refused empty config"; fi

it "should refuse to overwrite existing token file"
rm -rf "$TMP/conf" "$TMP/creds"
TMP2="$(setup_fixture)"
mkdir -p "$TMP2/creds"
printf 'PREVIOUS' > "$TMP2/creds/line-channel-access-token.txt"
chmod 600 "$TMP2/creds/line-channel-access-token.txt"
if ! run_migrate "$TMP2/conf/openclaw.json" "$TMP2/creds" >/dev/null 2>&1; then pass; else fail "should have refused clobber"; fi
rm -rf "$TMP2"

it "should exit 1 on missing config file"
if ! run_migrate "/nonexistent/path/openclaw.json" "/tmp/never" >/dev/null 2>&1; then pass; else fail "missing config didn't exit 1"; fi

rm -rf "$TMP"; trap - EXIT

describe "Dry-run"

TMP="$(setup_fixture)"
trap 'rm -rf "$TMP"' EXIT

it "should exit 0 with --dry-run"
if run_migrate "$TMP/conf/openclaw.json" "$TMP/creds" --dry-run >/dev/null; then pass; else fail "dry-run exited non-zero"; fi

it "dry-run should NOT create credential files"
if [[ ! -e "$TMP/creds/line-channel-access-token.txt" && ! -e "$TMP/creds/line-channel-secret.txt" ]]; then pass; else fail "dry-run wrote files"; fi

it "dry-run should NOT mutate config"
if jq -e '.channels.line.channelAccessToken' "$TMP/conf/openclaw.json" >/dev/null 2>&1; then pass; else fail "dry-run rewrote config"; fi

rm -rf "$TMP"; trap - EXIT

# ── Summary ──────────────────────────────────────────────────

printf "\n\033[1mResults:\033[0m %d passed, %d failed\n" "$PASS" "$FAIL"
[[ "$FAIL" -eq 0 ]] || exit 1
