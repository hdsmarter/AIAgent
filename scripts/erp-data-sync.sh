#!/bin/bash
# erp-data-sync.sh — Download ERP data from GAS Web App and convert to xlsx
# Usage: ./scripts/erp-data-sync.sh [--tab <name>] [--dry-run]
#
# Requires: ~/.nemoclaw/erp-sync.env (GAS_URL, GAS_API_KEY)
# Output:   $ERP_DATA_DIR/*.xlsx (default: ~/Documents/SmarterERP/PUE/SHEET/)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

# ── Config ──────────────────────────────────────────────────────────────
ENV_FILE="${NEMOCLAW_ERP_ENV:-$HOME/.nemoclaw/erp-sync.env}"
ERP_DATA_DIR="${ERP_DATA_DIR:-$HOME/Documents/SmarterERP/PUE/SHEET}"
TMP_DIR="${TMPDIR:-/tmp}/erp-sync-$$"
BACKUP_DIR="$ERP_DATA_DIR/.backup"
LOG_FILE="$HOME/.nemoclaw/erp-sync.log"

# All 17 ERP tables
ALL_TABS=(item sale saled bshop bshopd stock cust fact \
          rsale rsaled rshop rshopd order orderd ford fordd cost_item)

DRY_RUN=false
SINGLE_TAB=""

# ── Parse Args ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tab)     SINGLE_TAB="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h)
      echo "Usage: $0 [--tab <name>] [--dry-run]"
      echo "  --tab    Sync only one table (e.g. saled)"
      echo "  --dry-run  Download CSV but don't replace xlsx"
      exit 0 ;;
    *) log_error "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Load Environment ────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  log_error "Environment file not found: $ENV_FILE"
  log_info "Create it with:"
  echo "  GAS_URL=https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec"
  echo "  GAS_API_KEY=your-api-key"
  exit 1
fi
source "$ENV_FILE"

if [[ -z "${GAS_URL:-}" || -z "${GAS_API_KEY:-}" ]]; then
  log_error "GAS_URL and GAS_API_KEY must be set in $ENV_FILE"
  exit 1
fi

require_cmd curl
require_cmd python3

# Verify csv-to-xlsx.py exists
CSV_TO_XLSX="$SCRIPT_DIR/csv-to-xlsx.py"
if [[ ! -f "$CSV_TO_XLSX" ]]; then
  log_error "csv-to-xlsx.py not found at $CSV_TO_XLSX"
  exit 1
fi

# ── Setup ───────────────────────────────────────────────────────────────
mkdir -p "$TMP_DIR" "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log_info "ERP Data Sync — $(date '+%Y-%m-%d %H:%M:%S')"
echo "─────────────────────────────────"
log_info "Source: GAS Web App"
log_info "Target: $ERP_DATA_DIR"

# Determine which tabs to sync
if [[ -n "$SINGLE_TAB" ]]; then
  TABS=("$SINGLE_TAB")
else
  TABS=("${ALL_TABS[@]}")
fi

# ── Download + Convert ──────────────────────────────────────────────────
SUCCESS=0
FAIL=0
SKIP=0

for tab in "${TABS[@]}"; do
  log_step "Syncing: $tab"

  CSV_FILE="$TMP_DIR/${tab}.csv"
  XLSX_FILE="$ERP_DATA_DIR/${tab}.xlsx"

  # Download CSV from GAS
  HTTP_CODE=$(curl -sS -o "$CSV_FILE" -w "%{http_code}" \
    --max-time 120 \
    "${GAS_URL}?key=${GAS_API_KEY}&tab=${tab}&format=csv" 2>>"$LOG_FILE")

  if [[ "$HTTP_CODE" != "200" ]]; then
    log_error "$tab — HTTP $HTTP_CODE (download failed)"
    FAIL=$((FAIL + 1))
    continue
  fi

  # Verify CSV is not empty or error
  LINE_COUNT=$(wc -l < "$CSV_FILE" | tr -d ' ')
  if [[ "$LINE_COUNT" -lt 2 ]]; then
    log_warn "$tab — CSV has $LINE_COUNT lines (empty or header-only), skipping"
    SKIP=$((SKIP + 1))
    continue
  fi

  if $DRY_RUN; then
    log_ok "$tab — downloaded ($LINE_COUNT lines, dry-run)"
    SUCCESS=$((SUCCESS + 1))
    continue
  fi

  # Backup existing xlsx
  if [[ -f "$XLSX_FILE" ]]; then
    cp "$XLSX_FILE" "$BACKUP_DIR/${tab}_$(date '+%Y%m%d').xlsx"
  fi

  # Convert CSV → xlsx
  if python3 "$CSV_TO_XLSX" "$CSV_FILE" "$XLSX_FILE" 2>>"$LOG_FILE"; then
    NEW_SIZE=$(wc -c < "$XLSX_FILE" | tr -d ' ')
    log_ok "$tab — synced ($LINE_COUNT rows, $(numfmt --to=iec "$NEW_SIZE" 2>/dev/null || echo "${NEW_SIZE}B"))"
    SUCCESS=$((SUCCESS + 1))
  else
    log_error "$tab — csv-to-xlsx conversion failed"
    FAIL=$((FAIL + 1))
    # Restore backup
    BACKUP="$BACKUP_DIR/${tab}_$(date '+%Y%m%d').xlsx"
    if [[ -f "$BACKUP" ]]; then
      cp "$BACKUP" "$XLSX_FILE"
      log_warn "$tab — restored from backup"
    fi
  fi
done

# ── Cleanup ─────────────────────────────────────────────────────────────
rm -rf "$TMP_DIR"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.xlsx" -mtime +7 -delete 2>/dev/null || true

# ── Summary ─────────────────────────────────────────────────────────────
echo "─────────────────────────────────"
log_info "Sync complete: $SUCCESS ok, $FAIL failed, $SKIP skipped"

# Log summary
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] sync: $SUCCESS ok, $FAIL fail, $SKIP skip" >> "$LOG_FILE"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
