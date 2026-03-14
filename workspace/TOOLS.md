# TOOLS — 工具設定備註

## 通訊頻道

### Telegram Bot
- **模式**: Polling
- **串流**: `streamMode: "partial"`（啟用 sendMessageDraft 漸進式回覆）
- **功能**: 完整雙向對話、群組 @ 觸發、指令列表

### LINE Official Account
- **類型**: Messaging API Channel
- **模式**: Webhook
- **注意**: Token 需定期檢查有效性

## OpenClaw Gateway

- **版本**: 2026.3.13
- **端口**: 18789
- **Provider**: OpenRouter
- **支援**: Bot API 9.5（含 sendMessageDraft）

## 監控工具

- **Dashboard**: GitHub Pages 靜態站點
- **狀態收集**: `scripts/collect-status.sh`（cron / GitHub Actions）
- **健康檢查**: `scripts/health-check.sh`
