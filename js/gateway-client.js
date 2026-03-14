/**
 * gateway-client.js — WebSocket 連線管理（SRP）
 * 預設連 ws://localhost:18789，支援 Token auth、指數退避重連
 */
class GatewayClient extends EventTarget {
  static DEFAULTS = {
    url: 'ws://localhost:18789',
    reconnectMin: 2000,
    reconnectMax: 30000,
  };

  constructor() {
    super();
    this.url = localStorage.getItem('gw-url') || GatewayClient.DEFAULTS.url;
    this.token = localStorage.getItem('gw-token') || '';
    this.state = 'disconnected'; // connected | connecting | disconnected
    this.ws = null;
    this._reconnectDelay = GatewayClient.DEFAULTS.reconnectMin;
    this._reconnectTimer = null;
    this._intentionalClose = false;
  }

  // Save settings to localStorage
  saveSettings(url, token) {
    this.url = url || GatewayClient.DEFAULTS.url;
    this.token = token || '';
    localStorage.setItem('gw-url', this.url);
    localStorage.setItem('gw-token', this.token);
  }

  connect() {
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
      this._reconnectDelay = GatewayClient.DEFAULTS.reconnectMin;
      this._setState('connected');
    };

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this.dispatchEvent(new CustomEvent('message', { detail: data }));
      } catch {
        // non-JSON message — ignore
      }
    };

    this.ws.onclose = () => {
      this._setState('disconnected');
      if (!this._intentionalClose) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  disconnect() {
    this._intentionalClose = true;
    clearTimeout(this._reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._setState('disconnected');
  }

  sendChat(agentId, text) {
    if (this.state !== 'connected' || !this.ws) return false;
    this.ws.send(JSON.stringify({ type: 'chat', agentId, text }));
    return true;
  }

  // Test connection (returns promise: true=ok, false=fail)
  testConnection(url, token) {
    return new Promise((resolve) => {
      const wsUrl = token
        ? url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token)
        : url;
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

  _setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.dispatchEvent(new CustomEvent(s));
  }

  _scheduleReconnect() {
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => {
      this.connect();
    }, this._reconnectDelay);
    // Exponential backoff
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, GatewayClient.DEFAULTS.reconnectMax);
  }
}
