#!/bin/bash
# ──────────────────────────────────────────────────────────
# NemoClaw Sandbox Skill Setup — 可重複執行
# 用於新建 sandbox 後快速還原所有 skill 依賴
#
# Usage (from host):
#   SSH="ssh -o ProxyCommand='openshell ssh-proxy --gateway-name nemoclaw --name nemoclaw' sandbox@openshell-nemoclaw"
#   cat scripts/sandbox-skill-setup.sh | $SSH "bash -s"
#
# Or inside sandbox directly:
#   bash /path/to/sandbox-skill-setup.sh
# ──────────────────────────────────────────────────────────
set -euo pipefail

log() { echo "$(date +%H:%M:%S) [skill-setup] $*"; }
warn() { echo "$(date +%H:%M:%S) [skill-setup] ⚠️  $*" >&2; }

LOCAL_BIN=/sandbox/.local/bin
mkdir -p "$LOCAL_BIN"

# Ensure .local/bin is on PATH for this session and future logins
export PATH="$LOCAL_BIN:$PATH"
grep -q '/sandbox/.local/bin' /sandbox/.profile 2>/dev/null || \
  echo 'export PATH=/sandbox/.local/bin:$PATH' >> /sandbox/.profile
grep -q '/sandbox/.local/bin' /sandbox/.bashrc 2>/dev/null || \
  echo 'export PATH=/sandbox/.local/bin:$PATH' >> /sandbox/.bashrc

# ──── 1. Sync built-in skills ────
log "Step 1: Syncing skills..."
openclaw skills sync 2>/dev/null || warn "skills sync returned non-zero (may be OK)"

# ──── 2. Install Python packages ────
log "Step 2: Installing Python packages..."
pip3 install --break-system-packages --quiet \
  pandas openpyxl pdfplumber rapidfuzz \
  pillow imageio numpy \
  markitdown pypdf reportlab \
  pdf2image mcp 2>&1 | tail -5 || warn "Some pip packages failed"

# ──── 3. Install system tools ────
# Try apt-get first (needs root), fall back to static binaries from GitHub releases
log "Step 3: Installing system tools..."

install_apt_packages() {
  local apt_cmd="$1"
  $apt_cmd update -qq && $apt_cmd install -y -qq \
    pandoc poppler-utils qpdf jq ripgrep tmux ffmpeg 2>&1 | tail -5
}

apt_ok=false
if command -v apt-get &>/dev/null; then
  if [ "$(id -u)" = "0" ]; then
    install_apt_packages "apt-get" && apt_ok=true
  elif command -v sudo &>/dev/null; then
    install_apt_packages "sudo apt-get" && apt_ok=true
  fi
fi

if [ "$apt_ok" = false ]; then
  log "  No root/apt — installing static binaries from GitHub releases..."
  ARCH=$(uname -m)

  # jq
  if ! command -v jq &>/dev/null; then
    log "  Downloading jq..."
    if [ "$ARCH" = "aarch64" ]; then
      curl -sL https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-arm64 \
        -o "$LOCAL_BIN/jq" && chmod +x "$LOCAL_BIN/jq" && log "  ✓ jq" || warn "  ✗ jq download failed"
    else
      curl -sL https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-amd64 \
        -o "$LOCAL_BIN/jq" && chmod +x "$LOCAL_BIN/jq" && log "  ✓ jq" || warn "  ✗ jq download failed"
    fi
  fi

  # ripgrep
  if ! command -v rg &>/dev/null; then
    log "  Downloading ripgrep..."
    if [ "$ARCH" = "aarch64" ]; then
      RG_TAR="ripgrep-15.1.0-aarch64-unknown-linux-gnu.tar.gz"
    else
      RG_TAR="ripgrep-15.1.0-x86_64-unknown-linux-musl.tar.gz"
    fi
    curl -sL "https://github.com/BurntSushi/ripgrep/releases/download/15.1.0/$RG_TAR" \
      -o /tmp/rg.tar.gz && \
      tar xzf /tmp/rg.tar.gz -C /tmp && \
      cp /tmp/"${RG_TAR%.tar.gz}"/rg "$LOCAL_BIN/rg" && \
      chmod +x "$LOCAL_BIN/rg" && log "  ✓ ripgrep" || warn "  ✗ ripgrep download failed"
    rm -rf /tmp/rg.tar.gz /tmp/ripgrep-*
  fi

  # ffmpeg (static build from BtbN)
  if ! command -v ffmpeg &>/dev/null; then
    log "  Downloading ffmpeg (large, may take a minute)..."
    if [ "$ARCH" = "aarch64" ]; then
      FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz"
    else
      FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz"
    fi
    curl -sL "$FFMPEG_URL" -o /tmp/ffmpeg.tar.xz && \
    python3 -c "
import tarfile, lzma
with lzma.open('/tmp/ffmpeg.tar.xz') as xz:
    with tarfile.open(fileobj=xz) as tar:
        for m in tar.getmembers():
            bn = m.name.split('/')[-1]
            if bn in ('ffmpeg', 'ffprobe'):
                m.name = bn
                tar.extract(m, '$LOCAL_BIN/')
import os
os.chmod('$LOCAL_BIN/ffmpeg', 0o755)
os.chmod('$LOCAL_BIN/ffprobe', 0o755)
" && log "  ✓ ffmpeg + ffprobe" || warn "  ✗ ffmpeg download/extract failed"
    rm -f /tmp/ffmpeg.tar.xz
  fi

  # gh (GitHub CLI)
  if ! command -v gh &>/dev/null; then
    log "  Downloading gh CLI..."
    GH_VER="2.89.0"
    if [ "$ARCH" = "aarch64" ]; then
      GH_TAR="gh_${GH_VER}_linux_arm64.tar.gz"
    else
      GH_TAR="gh_${GH_VER}_linux_amd64.tar.gz"
    fi
    curl -sL "https://github.com/cli/cli/releases/download/v${GH_VER}/$GH_TAR" \
      -o /tmp/gh.tar.gz && \
      tar xzf /tmp/gh.tar.gz -C /tmp && \
      cp "/tmp/${GH_TAR%.tar.gz}/bin/gh" "$LOCAL_BIN/gh" && \
      chmod +x "$LOCAL_BIN/gh" && log "  ✓ gh" || warn "  ✗ gh download failed"
    rm -rf /tmp/gh.tar.gz /tmp/gh_*
  fi
fi

# ──── 4. Install npm-based CLI tools ────
log "Step 4: Installing npm CLI tools..."
if command -v npm &>/dev/null; then
  NPM_DIR=/sandbox/.local/npm-global
  mkdir -p "$NPM_DIR"

  # clawhub
  if ! command -v clawhub &>/dev/null; then
    cd "$NPM_DIR" && npm install clawhub@latest 2>&1 | tail -3 || warn "clawhub npm install failed"
    if [ -f "$NPM_DIR/node_modules/.bin/clawhub" ]; then
      cp "$NPM_DIR/node_modules/.bin/clawhub" "$LOCAL_BIN/clawhub"
      chmod +x "$LOCAL_BIN/clawhub"
      log "  ✓ clawhub"
    fi
  fi

  # gemini CLI (wrapper needed — Node CLI requires node_modules)
  if ! command -v gemini &>/dev/null; then
    cd "$NPM_DIR" && npm install @google/gemini-cli@latest 2>&1 | tail -3 || warn "gemini npm install failed"
    if [ -f "$NPM_DIR/node_modules/@google/gemini-cli/bundle/gemini.js" ]; then
      cat > "$LOCAL_BIN/gemini" << 'WRAPPER'
#!/bin/sh
exec node /sandbox/.local/npm-global/node_modules/@google/gemini-cli/bundle/gemini.js "$@"
WRAPPER
      chmod +x "$LOCAL_BIN/gemini"
      log "  ✓ gemini"
    fi
  fi

  # mcporter
  if ! command -v mcporter &>/dev/null; then
    cd "$NPM_DIR" && npm install mcporter@latest 2>&1 | tail -3 || warn "mcporter npm install failed"
    if [ -f "$NPM_DIR/node_modules/.bin/mcporter" ]; then
      cat > "$LOCAL_BIN/mcporter" << 'WRAPPER'
#!/bin/sh
exec node /sandbox/.local/npm-global/node_modules/.bin/mcporter "$@"
WRAPPER
      chmod +x "$LOCAL_BIN/mcporter"
      log "  ✓ mcporter"
    fi
  fi
else
  warn "npm not available — skipping CLI tools"
fi

# ──── 5. Verify custom skills exist ────
log "Step 5: Verifying custom skills..."
for skill in pue-order doc-reader seo-publisher; do
  if [ -f "$HOME/.openclaw/skills/$skill/SKILL.md" ]; then
    log "  ✓ $skill — SKILL.md present"
  else
    warn "  ✗ $skill — SKILL.md missing! Upload from host."
  fi
done

# ──── 6. Final sync + count ────
log "Step 6: Final skills sync..."
openclaw skills sync 2>/dev/null || true

log "Step 7: Verification..."
READY_COUNT=$(openclaw skills list 2>/dev/null | grep -c "✓ ready" || echo "?")
TOTAL_COUNT=$(openclaw skills list 2>/dev/null | grep -c "│" || echo "?")
log "Skills ready: $READY_COUNT"

# ──── 7. Check installable CLIs status ────
log "Step 8: CLI availability check..."
for cli in jq rg tmux ffmpeg ffprobe pandoc pdftotext qpdf clawhub gh gemini mcporter python3 pip3 node npm; do
  if command -v "$cli" &>/dev/null; then
    echo "  ✓ $cli"
  else
    echo "  ✗ $cli (not installed)"
  fi
done

log "Done! Ready skills: $READY_COUNT"
echo ""
echo "═══════════════════════════════════════════════"
echo "  Skills NOT installable in sandbox (41 total):"
echo "  - macOS-only: apple-notes, apple-reminders, bear-notes, imsg, peekaboo, things-mac"
echo "  - Hardware: blucli, camsnap, eightctl, openhue, sonoscli"
echo "  - Need API keys: notion, openai-*, goplaces, sag, trello, xurl"
echo "  - Need OAuth: gog, slack, discord, wacli, 1password, bluebubbles"
echo "  - Heavy deps: agent-browser (Chromium), coding-agent"
echo "  - Need root: tmux, poppler-utils, pandoc, qpdf"
echo "═══════════════════════════════════════════════"
