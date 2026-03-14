# ⚡ Nexus — OpenClaw Enterprise Enabler Agent

[English](#overview) | [中文](#概述)

## Overview

Nexus is an AI Agent built on [OpenClaw](https://openclaw.ai), designed as an **Enterprise Enabler** — helping businesses streamline operations through cross-department analysis, automation, and data-driven decision making.

**Features:**
- Multi-channel support (Telegram + LINE)
- Streaming responses via `sendMessageDraft`
- Real-time monitoring dashboard
- Workspace persona system for consistent AI behavior

**Dashboard:** [hdsmarter.github.io/OpenClaw](https://hdsmarter.github.io/OpenClaw/)

---

## 概述

Nexus 是基於 [OpenClaw](https://openclaw.ai) 打造的 AI Agent，定位為**企業賦能者**——協助企業透過跨部門分析、自動化和數據驅動決策來提升營運效率。

**功能特色：**
- 多頻道支援（Telegram + LINE）
- 串流回覆（sendMessageDraft 漸進式輸出）
- 即時監控 Dashboard
- Workspace 人格系統確保 AI 行為一致性

---

## Quick Start

```bash
# Prerequisites: OpenClaw installed and running
openclaw --version

# Setup workspace
./scripts/setup.sh

# Health check
./scripts/health-check.sh

# Collect status for dashboard
./scripts/collect-status.sh
```

## Project Structure

```
├── workspace/          # Agent persona files (SOUL, AGENTS, IDENTITY, etc.)
├── scripts/            # Shell scripts (setup, health-check, update)
├── dashboard/          # Static monitoring dashboard (GitHub Pages)
├── config/             # Configuration templates
├── tests/              # BDD-style tests
└── docs/               # Documentation
```

## Dashboard

The monitoring dashboard is deployed on GitHub Pages and shows:
- Agent state visualization (pixel-art Canvas 2D)
- Gateway health metrics
- Channel connection status
- Activity timeline

Status data is updated via GitHub Actions cron workflow.

## Configuration

Copy the template and fill in your credentials:
```bash
cp config/openclaw.template.json ~/.openclaw/openclaw.json
# Edit with your API keys and tokens
```

## License

MIT
