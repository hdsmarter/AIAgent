/**
 * chat-client.js — Dual-mode chat transport (Telegram Bot API / Gateway WebSocket)
 * Replaces gateway-client.js with a unified interface
 */
class ChatClient extends EventTarget {
  static DEFAULTS = {
    gwUrl: 'ws://localhost:18789',
    reconnectMin: 2000,
    reconnectMax: 30000,
    tgPollInterval: 3000,
    tgBotLink: 'https://t.me/hdsmarterbot',
  };

  constructor() {
    super();
    // Mode: 'telegram' | 'gateway'
    this.mode = localStorage.getItem('chat-mode') || 'telegram';

    // Gateway settings
    this.url = localStorage.getItem('gw-url') || ChatClient.DEFAULTS.gwUrl;
    this.token = localStorage.getItem('gw-token') || '';

    // Telegram settings
    this.tgToken = localStorage.getItem('tg-bot-token') || '';
    this.tgChatId = localStorage.getItem('tg-chat-id') || '';

    // State
    this.state = 'disconnected'; // connected | connecting | disconnected
    this.ws = null;
    this._reconnectDelay = ChatClient.DEFAULTS.reconnectMin;
    this._reconnectTimer = null;
    this._intentionalClose = false;

    // Telegram polling
    this._tgOffset = 0;
    this._tgPollTimer = null;
  }

  // ── Settings persistence ──────────────────────

  saveSettings(opts) {
    if (opts.mode !== undefined) {
      this.mode = opts.mode;
      localStorage.setItem('chat-mode', opts.mode);
    }
    if (opts.url !== undefined) {
      this.url = opts.url || ChatClient.DEFAULTS.gwUrl;
      localStorage.setItem('gw-url', this.url);
    }
    if (opts.token !== undefined) {
      this.token = opts.token || '';
      localStorage.setItem('gw-token', this.token);
    }
    if (opts.tgToken !== undefined) {
      this.tgToken = opts.tgToken || '';
      localStorage.setItem('tg-bot-token', this.tgToken);
    }
    if (opts.tgChatId !== undefined) {
      this.tgChatId = opts.tgChatId || '';
      localStorage.setItem('tg-chat-id', this.tgChatId);
    }
  }

  // ── Connect (auto-dispatches to mode) ─────────

  connect() {
    if (this.mode === 'telegram') {
      this._connectTelegram();
    } else {
      this._connectGateway();
    }
  }

  disconnect() {
    this._intentionalClose = true;
    clearTimeout(this._reconnectTimer);
    clearInterval(this._tgPollTimer);

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._setState('disconnected');
  }

  // ── Send message (unified) ────────────────────

  sendChat(agentId, text) {
    if (this.mode === 'telegram') {
      return this._sendTelegram(agentId, text);
    }
    return this._sendGateway(agentId, text);
  }

  // ── Test connection ───────────────────────────

  testConnection(opts) {
    if ((opts && opts.mode === 'telegram') || (!opts && this.mode === 'telegram')) {
      return this._testTelegram(opts);
    }
    return this._testGateway(opts);
  }

  // ── Telegram Bot API ──────────────────────────

  _connectTelegram() {
    if (!this.tgToken) {
      this._setState('disconnected');
      return;
    }
    this._intentionalClose = false;
    this._setState('connecting');

    // Verify token with getMe
    fetch('https://api.telegram.org/bot' + this.tgToken + '/getMe')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          this._setState('connected');
          this._startTgPolling();
        } else {
          this._setState('disconnected');
        }
      })
      .catch(() => this._setState('disconnected'));
  }

  _startTgPolling() {
    clearInterval(this._tgPollTimer);
    this._tgPollTimer = setInterval(() => this._pollTelegram(), ChatClient.DEFAULTS.tgPollInterval);
  }

  _pollTelegram() {
    if (this.state !== 'connected' || !this.tgToken) return;

    const url = 'https://api.telegram.org/bot' + this.tgToken +
      '/getUpdates?offset=' + this._tgOffset + '&timeout=0&limit=10';

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (!data.ok || !data.result) return;
        for (const update of data.result) {
          this._tgOffset = update.update_id + 1;
          if (update.message && update.message.text) {
            this.dispatchEvent(new CustomEvent('message', {
              detail: {
                type: 'chat',
                agentId: 0,
                text: update.message.text,
                from: update.message.from,
              }
            }));
          }
        }
      })
      .catch(() => { /* polling error — will retry next interval */ });
  }

  _sendTelegram(agentId, text) {
    if (this.state !== 'connected' || !this.tgToken || !this.tgChatId) return false;

    const prefix = I18n.agentName(agentId);
    const body = {
      chat_id: this.tgChatId,
      text: '[' + prefix + '] ' + text,
      parse_mode: 'Markdown',
    };

    fetch('https://api.telegram.org/bot' + this.tgToken + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => { /* send error */ });

    return true;
  }

  _testTelegram(opts) {
    const token = (opts && opts.tgToken) || this.tgToken;
    if (!token) return Promise.resolve(false);

    return fetch('https://api.telegram.org/bot' + token + '/getMe')
      .then(r => r.json())
      .then(data => data.ok === true)
      .catch(() => false);
  }

  // ── Gateway WebSocket ─────────────────────────

  _connectGateway() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this._intentionalClose = false;
    this._setState('connecting');

    const wsUrl = this.token
      ? this.url + (this.url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(this.token)
      : this.url;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      this._setState('disconnected');
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this._reconnectDelay = ChatClient.DEFAULTS.reconnectMin;
      this._setState('connected');
    };

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this.dispatchEvent(new CustomEvent('message', { detail: data }));
      } catch {
        // non-JSON — ignore
      }
    };

    this.ws.onclose = () => {
      this._setState('disconnected');
      if (!this._intentionalClose) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose fires after onerror
    };
  }

  _sendGateway(agentId, text) {
    if (this.state !== 'connected' || !this.ws) return false;
    this.ws.send(JSON.stringify({ type: 'chat', agentId, text }));
    return true;
  }

  _testGateway(opts) {
    const url = (opts && opts.url) || this.url;
    const token = (opts && opts.token) || this.token;
    const wsUrl = token
      ? url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token)
      : url;
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(wsUrl);
        const timer = setTimeout(() => { ws.close(); resolve(false); }, 5000);
        ws.onopen = () => { clearTimeout(timer); ws.close(); resolve(true); };
        ws.onerror = () => { clearTimeout(timer); resolve(false); };
      } catch {
        resolve(false);
      }
    });
  }

  // ── Shared internals ──────────────────────────

  _setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.dispatchEvent(new CustomEvent(s));
  }

  _scheduleReconnect() {
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => this.connect(), this._reconnectDelay);
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, ChatClient.DEFAULTS.reconnectMax);
  }
}
