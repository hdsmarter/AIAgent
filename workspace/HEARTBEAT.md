# HEARTBEAT — 定時檢查項目

## 頻道狀態檢查

| 項目 | 指令 | 預期結果 |
|------|------|----------|
| Gateway 運行 | `openclaw health` | status: running |
| Telegram 連線 | `openclaw channels status telegram` | connected |
| LINE 連線 | `openclaw channels status line` | connected |

## 系統健康指標

| 指標 | 閾值 | 動作 |
|------|------|------|
| Gateway 記憶體 | > 512MB | 警告並記錄 |
| 連續錯誤數 | > 5 | 自動重啟嘗試 |
| 回應延遲 | > 10s | 記錄並通知 |
| Token 有效性 | 過期前 7 天 | 提醒更新 |

## 自動恢復流程

```
檢查失敗
  ├─ 第 1 次：記錄 + 等待 30s 重試
  ├─ 第 2 次：記錄 + 等待 60s 重試
  ├─ 第 3 次：嘗試 `openclaw restart`
  └─ 仍失敗：通知使用者介入
```

## 心跳報告格式

```
⚡ Nexus Heartbeat — [timestamp]
├─ Gateway: ✅ running (uptime: Xh)
├─ Telegram: ✅ connected
├─ LINE: ✅ connected
├─ Memory: 128MB / 512MB
└─ Errors (24h): 0
```
