# Channel Configuration

## Telegram

### Setup
1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get the bot token
3. Configure in `openclaw.json`:
   ```json
   {
     "channels": {
       "telegram": {
         "enabled": true,
         "mode": "polling",
         "token": "YOUR_BOT_TOKEN",
         "streamMode": "partial"
       }
     }
   }
   ```

### Streaming Mode
- `streamMode: "partial"` enables progressive message delivery via `sendMessageDraft` (Bot API 9.5+)
- Messages appear to "type" in real-time as the AI generates responses

### Group Usage
- Bot responds when mentioned with `@`
- Configure `groupPolicy` in OpenClaw for access control

## LINE

### Setup
1. Create a Messaging API channel in [LINE Developers Console](https://developers.line.biz/)
2. Get the Channel Access Token and Channel Secret
3. Configure in `openclaw.json`:
   ```json
   {
     "channels": {
       "line": {
         "enabled": true,
         "mode": "webhook",
         "channelAccessToken": "YOUR_TOKEN",
         "channelSecret": "YOUR_SECRET"
       }
     }
   }
   ```

### Webhook
- LINE requires a publicly accessible webhook URL
- OpenClaw gateway handles webhook registration automatically
- Ensure your server is reachable from LINE's servers

## Diagnostics

```bash
# Check all channels
openclaw channels status

# Probe with health check
openclaw channels status --probe

# Full diagnostic
openclaw doctor
```
