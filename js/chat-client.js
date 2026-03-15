/**
 * chat-client.js — Quad-mode chat transport
 * Telegram Bot API / Gateway WebSocket / OpenRouter API / Gateway HTTP API (SSE streaming)
 * Zero hardcoded strings — all via I18n
 */
class ChatClient extends EventTarget {
  static DEFAULTS = {
    gwUrl: 'ws://localhost:18789',
    reconnectMin: 2000,
    reconnectMax: 30000,
    tgPollInterval: 3000,
    tgBotLink: 'https://t.me/hdsmarterbot',
    openRouterUrl: 'https://openrouter.ai/api/v1/chat/completions',
    openRouterModel: 'anthropic/claude-sonnet-4',
    orMaxHistory: 20,
    gwApiModel: 'openclaw',
  };

  // System prompts for 16 manufacturing HQ agents (English base; agent responds in user's language)
  static AGENT_SYSTEM_PROMPTS = [
    'You are a Data Analyst at a manufacturing company. Expert in SQL, KPIs, dashboards, and reporting. Respond concisely and professionally. Adapt your language to match the user.',
    'You are a Marketing Strategist at a manufacturing company. Expert in campaigns, brand strategy, and market research. Respond concisely. Adapt your language to match the user.',
    'You are a Finance Advisor at a manufacturing company. Expert in budgeting, forecasting, ROI analysis, and financial planning. Respond concisely. Adapt your language to match the user.',
    'You are an HR Manager at a manufacturing company. Expert in recruitment, employee relations, policy, and compliance. Respond concisely. Adapt your language to match the user.',
    'You are a Supply Chain Expert at a manufacturing company. Expert in logistics, inventory management, procurement, and vendor relations. Respond concisely. Adapt your language to match the user.',
    'You are an IT Architect at a manufacturing company. Expert in systems design, cloud infrastructure, DevOps, and cybersecurity. Respond concisely. Adapt your language to match the user.',
    'You are a Project Manager at a manufacturing company. Expert in scheduling, sprints, risk management, and cross-team coordination. Respond concisely. Adapt your language to match the user.',
    'You are a Customer Service Lead at a manufacturing company. Expert in ticket management, SLA monitoring, and customer satisfaction. Respond concisely. Adapt your language to match the user.',
    'You are a Legal Advisor at a manufacturing company. Expert in contracts, compliance, intellectual property, and regulatory matters. Respond concisely. Adapt your language to match the user.',
    'You are a Product Manager at a manufacturing company. Expert in roadmaps, user stories, feature prioritization, and market fit. Respond concisely. Adapt your language to match the user.',
    'You are a UX Designer at a manufacturing company. Expert in user research, wireframes, prototyping, and usability testing. Respond concisely. Adapt your language to match the user.',
    'You are a Content Strategist at a manufacturing company. Expert in editorial calendars, brand voice, content marketing, and SEO. Respond concisely. Adapt your language to match the user.',
    'You are a Business Development Manager at a manufacturing company. Expert in partnerships, market expansion, lead generation, and deal closing. Respond concisely. Adapt your language to match the user.',
    'You are a Quality Manager at a manufacturing company. Expert in QA processes, ISO standards, auditing, and continuous improvement. Respond concisely. Adapt your language to match the user.',
    'You are a Security Expert at a manufacturing company. Expert in vulnerability assessment, compliance (ISO 27001, SOC2), SIEM, and incident response. Respond concisely. Adapt your language to match the user.',
    'You are an HR Director at a manufacturing company. Expert in team building, organizational design, role planning, and talent development. Respond concisely. Adapt your language to match the user.',
  ];

  constructor() {
    super();
    // Mode: 'telegram' | 'gateway' | 'openrouter' | 'gateway-api'
    this.mode = localStorage.getItem('chat-mode') || 'telegram';

    // Gateway settings
    this.url = localStorage.getItem('gw-url') || ChatClient.DEFAULTS.gwUrl;
    this.token = localStorage.getItem('gw-token') || '';

    // Telegram settings
    this.tgToken = localStorage.getItem('tg-bot-token') || '';
    this.tgChatId = localStorage.getItem('tg-chat-id') || '';

    // OpenRouter settings
    this.orApiKey = localStorage.getItem('or-api-key') || '';
    this.orModel = localStorage.getItem('or-model') || ChatClient.DEFAULTS.openRouterModel;
    this._orHistory = {};   // { agentId: [{role, content}] }
    this._orAbort = {};     // { agentId: AbortController }

    // Gateway API settings (OpenClaw HTTP API via ngrok)
    this.gwApiUrl = localStorage.getItem('gw-api-url') || '';
    this.gwApiToken = localStorage.getItem('gw-api-token') || '';
    this.gwApiModel = localStorage.getItem('gw-api-model') || ChatClient.DEFAULTS.gwApiModel;
    this._gwApiHistory = {};
    this._gwApiAbort = {};

    // State
    this.state = 'disconnected';
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
    if (opts.orApiKey !== undefined) {
      this.orApiKey = opts.orApiKey || '';
      localStorage.setItem('or-api-key', this.orApiKey);
    }
    if (opts.orModel !== undefined) {
      this.orModel = opts.orModel || ChatClient.DEFAULTS.openRouterModel;
      localStorage.setItem('or-model', this.orModel);
    }
    if (opts.gwApiUrl !== undefined) {
      this.gwApiUrl = opts.gwApiUrl || '';
      localStorage.setItem('gw-api-url', this.gwApiUrl);
    }
    if (opts.gwApiToken !== undefined) {
      this.gwApiToken = opts.gwApiToken || '';
      localStorage.setItem('gw-api-token', this.gwApiToken);
    }
    if (opts.gwApiModel !== undefined) {
      this.gwApiModel = opts.gwApiModel || ChatClient.DEFAULTS.gwApiModel;
      localStorage.setItem('gw-api-model', this.gwApiModel);
    }
  }

  // ── Connect ───────────────────────────────────

  connect() {
    if (this.mode === 'telegram') {
      this._connectTelegram();
    } else if (this.mode === 'openrouter') {
      this._connectOpenRouter();
    } else if (this.mode === 'gateway-api') {
      this._connectGatewayApi();
    } else {
      this._connectGateway();
    }
  }

  disconnect() {
    this._intentionalClose = true;
    clearTimeout(this._reconnectTimer);
    clearInterval(this._tgPollTimer);

    // Abort any active OpenRouter streams
    for (const ctrl of Object.values(this._orAbort)) {
      if (ctrl) ctrl.abort();
    }
    this._orAbort = {};

    // Abort any active Gateway API streams
    for (const ctrl of Object.values(this._gwApiAbort)) {
      if (ctrl) ctrl.abort();
    }
    this._gwApiAbort = {};

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
    if (this.mode === 'openrouter') {
      return this._sendOpenRouter(agentId, text);
    }
    if (this.mode === 'gateway-api') {
      return this._sendGatewayApi(agentId, text);
    }
    return this._sendGateway(agentId, text);
  }

  // ── Test connection ───────────────────────────

  testConnection(opts) {
    const mode = (opts && opts.mode) || this.mode;
    if (mode === 'telegram') return this._testTelegram(opts);
    if (mode === 'openrouter') return this._testOpenRouter(opts);
    if (mode === 'gateway-api') return this._testGatewayApi(opts);
    return this._testGateway(opts);
  }

  // ── OpenRouter API ────────────────────────────

  _connectOpenRouter() {
    if (!this.orApiKey) {
      this._setState('disconnected');
      return;
    }
    this._intentionalClose = false;
    this._setState('connecting');

    // Verify API key with a minimal request
    fetch(ChatClient.DEFAULTS.openRouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.orApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.orModel,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    })
      .then(r => {
        if (r.ok || r.status === 200) {
          this._setState('connected');
        } else {
          this._setState('disconnected');
        }
      })
      .catch(() => this._setState('disconnected'));
  }

  _sendOpenRouter(agentId, text) {
    if (this.state !== 'connected' || !this.orApiKey) return false;

    // Initialize history for this agent
    if (!this._orHistory[agentId]) {
      this._orHistory[agentId] = [];
    }
    const history = this._orHistory[agentId];

    // Add user message to history
    history.push({ role: 'user', content: text });

    // Cap history length
    while (history.length > ChatClient.DEFAULTS.orMaxHistory) {
      history.shift();
    }

    // Build messages array with system prompt
    const systemPrompt = ChatClient.AGENT_SYSTEM_PROMPTS[agentId] || ChatClient.AGENT_SYSTEM_PROMPTS[0];
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    // Abort previous stream for this agent
    if (this._orAbort[agentId]) {
      this._orAbort[agentId].abort();
    }
    const controller = new AbortController();
    this._orAbort[agentId] = controller;

    // Dispatch typing event
    this.dispatchEvent(new CustomEvent('message', {
      detail: { type: 'typing', agentId }
    }));

    // Fetch with streaming
    fetch(ChatClient.DEFAULTS.openRouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.orApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.orModel,
        messages,
        stream: true,
      }),
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return this._readSSEStream(response.body, agentId);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        this.dispatchEvent(new CustomEvent('message', {
          detail: {
            type: 'response',
            agentId,
            text: I18n.t('chat.sendFail') + ': ' + err.message,
            final: true,
          }
        }));
      })
      .finally(() => {
        delete this._orAbort[agentId];
      });

    return true;
  }

  async _readSSEStream(body, agentId, historyMap) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              this.dispatchEvent(new CustomEvent('message', {
                detail: { type: 'stream', agentId, text: fullText }
              }));
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Store assistant response in history
    const hist = historyMap || this._orHistory;
    if (fullText && hist[agentId]) {
      hist[agentId].push({ role: 'assistant', content: fullText });
    }

    // Final response event
    this.dispatchEvent(new CustomEvent('message', {
      detail: {
        type: 'response',
        agentId,
        text: fullText || I18n.t('chat.sendFail'),
        final: true,
      }
    }));
  }

  _testOpenRouter(opts) {
    const apiKey = (opts && opts.orApiKey) || this.orApiKey;
    if (!apiKey) return Promise.resolve(false);

    return fetch(ChatClient.DEFAULTS.openRouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: (opts && opts.orModel) || this.orModel,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    })
      .then(r => r.ok)
      .catch(() => false);
  }

  // ── Gateway HTTP API (OpenClaw /v1/chat/completions) ──

  _connectGatewayApi() {
    if (!this.gwApiUrl || !this.gwApiToken) {
      this._setState('disconnected');
      return;
    }
    this._intentionalClose = false;
    this._setState('connecting');

    fetch(this.gwApiUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.gwApiToken,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        model: this.gwApiModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
    })
      .then(r => this._setState(r.ok ? 'connected' : 'disconnected'))
      .catch(() => this._setState('disconnected'));
  }

  _sendGatewayApi(agentId, text) {
    if (this.state !== 'connected' || !this.gwApiUrl || !this.gwApiToken) return false;

    if (!this._gwApiHistory[agentId]) {
      this._gwApiHistory[agentId] = [];
    }
    const history = this._gwApiHistory[agentId];
    history.push({ role: 'user', content: text });
    while (history.length > ChatClient.DEFAULTS.orMaxHistory) {
      history.shift();
    }

    const systemPrompt = ChatClient.AGENT_SYSTEM_PROMPTS[agentId] || ChatClient.AGENT_SYSTEM_PROMPTS[0];
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    if (this._gwApiAbort[agentId]) {
      this._gwApiAbort[agentId].abort();
    }
    const controller = new AbortController();
    this._gwApiAbort[agentId] = controller;

    this.dispatchEvent(new CustomEvent('message', {
      detail: { type: 'typing', agentId }
    }));

    fetch(this.gwApiUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.gwApiToken,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        model: this.gwApiModel,
        messages,
        stream: true,
      }),
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return this._readSSEStream(response.body, agentId, this._gwApiHistory);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        this.dispatchEvent(new CustomEvent('message', {
          detail: {
            type: 'response',
            agentId,
            text: I18n.t('chat.sendFail') + ': ' + err.message,
            final: true,
          }
        }));
      })
      .finally(() => {
        delete this._gwApiAbort[agentId];
      });

    return true;
  }

  _testGatewayApi(opts) {
    const url = (opts && opts.gwApiUrl) || this.gwApiUrl;
    const token = (opts && opts.gwApiToken) || this.gwApiToken;
    if (!url || !token) return Promise.resolve(false);

    return fetch(url + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        model: (opts && opts.gwApiModel) || this.gwApiModel,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      }),
    })
      .then(r => r.ok)
      .catch(() => false);
  }

  // ── Telegram Bot API ──────────────────────────

  _connectTelegram() {
    if (!this.tgToken) {
      this._setState('disconnected');
      return;
    }
    this._intentionalClose = false;
    this._setState('connecting');

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
      .catch(() => { /* polling error */ });
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
        // non-JSON
      }
    };

    this.ws.onclose = () => {
      this._setState('disconnected');
      if (!this._intentionalClose) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = () => {};
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
