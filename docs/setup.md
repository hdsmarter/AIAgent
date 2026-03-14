# Setup Guide

## Prerequisites

1. **OpenClaw** v2026.3+ installed (`brew install openclaw` or see [docs](https://openclaw.ai))
2. **OpenRouter** API key
3. **Telegram Bot** token (from [@BotFather](https://t.me/BotFather))
4. **LINE Messaging API** channel credentials (optional)

## Installation

```bash
# Clone the repository
git clone https://github.com/hdsmarter/OpenClaw.git
cd OpenClaw

# Run setup
./scripts/setup.sh
```

## Configuration

1. Copy the config template:
   ```bash
   cp config/openclaw.template.json ~/.openclaw/openclaw.json
   ```

2. Fill in your credentials:
   - `provider.apiKey` — OpenRouter API key
   - `channels.telegram.token` — Telegram bot token
   - `channels.line.channelAccessToken` — LINE channel access token
   - `channels.line.channelSecret` — LINE channel secret

3. Start the gateway:
   ```bash
   openclaw start
   ```

4. Verify:
   ```bash
   openclaw doctor
   openclaw channels status
   ```

## Workspace Customization

Edit files in `workspace/` to customize the Agent persona:

| File | Purpose |
|------|---------|
| `SOUL.md` | Core mission and capabilities |
| `AGENTS.md` | Behavioral rules and protocols |
| `IDENTITY.md` | Name, emoji, personality |
| `USER.md` | User preferences |
| `TOOLS.md` | Tool configuration notes |
| `HEARTBEAT.md` | Health check definitions |
