#!/usr/bin/env bash
#
# line-externalise-credentials.sh — migrate inline LINE tokens to tokenFile/secretFile
#
# Context (HEALTH-CHECK 2026-04-16 H5 / INFRA-8 Quick Win):
#   The @openclaw/line plugin calls `.trim()` directly on
#   `channelAccessToken` and `channelSecret`, with no SecretRef-object
#   resolution. If the config contains `{source, provider, id}` the plugin
#   crashes at startup. Until upstream adds resolveSecretRef pre-trim, we
#   take the already-supported escape hatch: the plugin's account resolver
#   (`readFileIfExists → tryReadSecretFileSync({rejectSymlink:true})`)
#   reads from `tokenFile` / `secretFile` paths. That gives us:
#     * File-level permission isolation (chmod 600)
#     * openclaw.json free of raw secrets
#     * symlink-attack rejected at read time
#     * zero upstream dependency
#
# Idempotent: safe to re-run. If tokenFile already set, no-ops.
#
# Principles audit (per repo CLAUDE.md directive):
#   * KISS: shell + jq, no new runtime. ~120 lines with comments.
#   * DRY:  sources lib/common.sh for log helpers.
#   * BDD:  companion tests/test-line-externalise.sh fakes a config and
#           asserts every invariant (file perm, pointer, no raw secret).
#   * SRP:  this script migrates only. Gateway restart is a separate concern
#           — the script prints the exact command at the end.
#   * 防呆:  refuses to run without jq / openclaw; rejects symlinks; refuses
#           to overwrite existing credential files; backs up openclaw.json
#           before writing.
#
# Usage:
#   scripts/line-externalise-credentials.sh
#   scripts/line-externalise-credentials.sh --config /tmp/test.json --creds-dir /tmp/cred --dry-run
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

# ── Defaults ─────────────────────────────────────────────────
CONFIG_PATH="${CONFIG_PATH:-$HOME/.openclaw/openclaw.json}"
CREDS_DIR="${CREDS_DIR:-$HOME/.openclaw/credentials}"
DRY_RUN="${DRY_RUN:-0}"

TOKEN_FILENAME="line-channel-access-token.txt"
SECRET_FILENAME="line-channel-secret.txt"

# ── Arg parsing ──────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)    CONFIG_PATH="$2"; shift 2 ;;
    --creds-dir) CREDS_DIR="$2";  shift 2 ;;
    --dry-run)   DRY_RUN=1;        shift ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) log_error "Unknown arg: $1"; exit 2 ;;
  esac
done

require_cmd jq

TOKEN_PATH="$CREDS_DIR/$TOKEN_FILENAME"
SECRET_PATH="$CREDS_DIR/$SECRET_FILENAME"

# ── Preflight ────────────────────────────────────────────────
[[ -f "$CONFIG_PATH" ]] || { log_error "Config not found: $CONFIG_PATH"; exit 1; }

# Reject symlinks — matches the plugin's rejectSymlink:true read-side guard.
if [[ -L "$CONFIG_PATH" ]]; then
  log_error "Refusing to migrate a symlinked config (security): $CONFIG_PATH"
  exit 1
fi

# Read current state. jq -e exits non-zero on null → idempotence-safe.
current_token="$(jq -r '.channels.line.channelAccessToken // empty' "$CONFIG_PATH")"
current_secret="$(jq -r '.channels.line.channelSecret // empty' "$CONFIG_PATH")"
current_token_file="$(jq -r '.channels.line.tokenFile // empty' "$CONFIG_PATH")"
current_secret_file="$(jq -r '.channels.line.secretFile // empty' "$CONFIG_PATH")"

# Detect SecretRef objects that crashed the plugin previously — the symptom
# signature noted in HEALTH-CHECK H5.
token_is_object="$(jq -r '.channels.line.channelAccessToken | if type=="object" then "yes" else "no" end' "$CONFIG_PATH")"

if [[ "$token_is_object" == "yes" ]]; then
  log_error "channels.line.channelAccessToken is a SecretRef object — plugin cannot resolve it (H5 bug)."
  log_error "Remove it manually and re-run with plaintext, OR edit openclaw.json to restore plaintext and re-run."
  exit 1
fi

# Already migrated?
if [[ -n "$current_token_file" && -n "$current_secret_file" ]]; then
  log_ok "LINE credentials already externalised → tokenFile=$current_token_file, secretFile=$current_secret_file"
  log_info "Nothing to do. Re-run is safe; exiting."
  exit 0
fi

if [[ -z "$current_token" || -z "$current_secret" ]]; then
  log_error "No inline channelAccessToken/channelSecret found — nothing to migrate."
  log_info "If you just want to provision credentials, place them at:"
  log_info "  $TOKEN_PATH   (chmod 600)"
  log_info "  $SECRET_PATH  (chmod 600)"
  log_info "Then run: openclaw config set channels.line.tokenFile --value $TOKEN_PATH"
  exit 1
fi

# ── Plan announce ────────────────────────────────────────────
log_step "Planned migration:"
printf "  config         : %s\n" "$CONFIG_PATH"
printf "  token → file   : %s\n" "$TOKEN_PATH"
printf "  secret → file  : %s\n" "$SECRET_PATH"
printf "  dry-run        : %s\n" "$([ "$DRY_RUN" = 1 ] && echo yes || echo no)"

[[ "$DRY_RUN" = 1 ]] && { log_info "Dry-run: exiting before any write."; exit 0; }

# ── Execute ──────────────────────────────────────────────────
mkdir -p "$CREDS_DIR"
chmod 700 "$CREDS_DIR"

# Refuse to clobber existing credential files.
for f in "$TOKEN_PATH" "$SECRET_PATH"; do
  [[ -e "$f" ]] && { log_error "Refusing to overwrite existing file: $f"; exit 1; }
done

# Atomic write: write to tmp in same dir, then mv.
umask 077
printf '%s' "$current_token"  > "$TOKEN_PATH.tmp"  && mv "$TOKEN_PATH.tmp"  "$TOKEN_PATH"
printf '%s' "$current_secret" > "$SECRET_PATH.tmp" && mv "$SECRET_PATH.tmp" "$SECRET_PATH"
chmod 600 "$TOKEN_PATH" "$SECRET_PATH"
log_ok "Credential files written with 600 perms."

# Backup config before rewrite.
backup="$CONFIG_PATH.pre-h5-$(date +%Y%m%d-%H%M%S)"
cp "$CONFIG_PATH" "$backup"
chmod 600 "$backup"
log_ok "Config backed up → $backup"

# Rewrite config: remove inline, add file refs. jq is atomic via tmp file.
tmp="$CONFIG_PATH.tmp"
jq --arg tp "$TOKEN_PATH" --arg sp "$SECRET_PATH" '
  .channels.line.tokenFile = $tp
  | .channels.line.secretFile = $sp
  | del(.channels.line.channelAccessToken)
  | del(.channels.line.channelSecret)
' "$CONFIG_PATH" > "$tmp"
mv "$tmp" "$CONFIG_PATH"
chmod 600 "$CONFIG_PATH"
log_ok "openclaw.json rewritten (channelAccessToken/channelSecret removed, tokenFile/secretFile set)."

# ── Postflight ───────────────────────────────────────────────
log_step "Verify with:"
printf "  openclaw config validate\n"
printf "  openclaw channels status | grep -i line   # expect token:tokenFile\n"
log_step "Restart gateway for plugin to reload:"
printf "  openclaw restart\n"
