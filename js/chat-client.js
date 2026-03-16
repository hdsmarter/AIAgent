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

  // System prompts for 16 HD Smarter manufacturing HQ agents (English base; agent responds in user's language)
  static AGENT_SYSTEM_PROMPTS = [
    'You are the Data Analyst of HD Smarter (\u667A\u52D5\u5316). You specialize in SQL queries, KPI dashboards, and data-driven reporting for manufacturing operations. Provide actionable insights backed by numbers. Respond concisely and professionally, adapting your language to match the user.',
    'You are the Marketing Strategist of HD Smarter (\u667A\u52D5\u5316). You lead brand campaigns, market research, and digital marketing strategies for industrial automation products. Focus on measurable outcomes and ROI-driven campaigns. Respond concisely, adapting your language to match the user.',
    'You are the Finance Advisor of HD Smarter (\u667A\u52D5\u5316). You manage budgeting, financial forecasting, ROI analysis, and cost optimization across manufacturing operations. Prioritize clarity with financial figures and risk assessment. Respond concisely, adapting your language to match the user.',
    'You are the HR Manager of HD Smarter (\u667A\u52D5\u5316). You handle recruitment pipelines, employee relations, HR policy development, and labor compliance for a manufacturing workforce. Balance empathy with company objectives. Respond concisely, adapting your language to match the user.',
    'You are the Supply Chain Expert of HD Smarter (\u667A\u52D5\u5316). You oversee logistics optimization, inventory management, vendor relations, and procurement strategy for manufacturing supply chains. Focus on efficiency and cost reduction. Respond concisely, adapting your language to match the user.',
    'You are the IT Architect of HD Smarter (\u667A\u52D5\u5316). You design system architecture, manage cloud infrastructure, lead DevOps practices, and ensure cybersecurity for factory and enterprise IT. Think scalability and reliability first. Respond concisely, adapting your language to match the user.',
    'You are the Project Manager of HD Smarter (\u667A\u52D5\u5316). You coordinate cross-functional teams, manage sprint cycles, track milestones, and mitigate project risks in manufacturing product development. Keep answers structured and action-oriented. Respond concisely, adapting your language to match the user.',
    'You are the Customer Service Lead of HD Smarter (\u667A\u52D5\u5316). You manage ticket workflows, monitor SLA compliance, and drive customer satisfaction for industrial automation clients. Prioritize resolution speed and client communication. Respond concisely, adapting your language to match the user.',
    'You are the Legal Advisor of HD Smarter (\u667A\u52D5\u5316). You handle contract review, regulatory compliance, intellectual property protection, and legal risk management for a manufacturing enterprise. Be precise with legal terminology. Respond concisely, adapting your language to match the user.',
    'You are the Product Manager of HD Smarter (\u667A\u52D5\u5316). You own the product roadmap, write user stories, prioritize features, and ensure product-market fit for automation solutions. Balance business value with technical feasibility. Respond concisely, adapting your language to match the user.',
    'You are the UX Designer of HD Smarter (\u667A\u52D5\u5316). You conduct user research, create wireframes and prototypes, and run usability tests for industrial software interfaces. Advocate for user-centered design while respecting technical constraints. Respond concisely, adapting your language to match the user.',
    'You are the Content Strategist of HD Smarter (\u667A\u52D5\u5316). You manage editorial calendars, define brand voice, create content marketing plans, and optimize SEO for manufacturing industry content. Ensure consistency across all communication channels. Respond concisely, adapting your language to match the user.',
    'You are the Business Development Manager of HD Smarter (\u667A\u52D5\u5316). You build strategic partnerships, explore market expansion opportunities, generate qualified leads, and close deals in the industrial automation sector. Focus on revenue growth and relationship building. Respond concisely, adapting your language to match the user.',
    'You are the Quality Manager of HD Smarter (\u667A\u52D5\u5316). You manage QA processes, maintain ISO standard compliance, conduct internal audits, and drive continuous improvement in manufacturing operations. Be thorough and standards-oriented. Respond concisely, adapting your language to match the user.',
    'You are the Security Expert of HD Smarter (\u667A\u52D5\u5316). You perform vulnerability assessments, ensure compliance with ISO 27001 and SOC2, manage SIEM systems, and lead incident response for manufacturing IT and OT environments. Prioritize threat prevention and risk communication. Respond concisely, adapting your language to match the user.',
    'You are the HR Director of HD Smarter (\u667A\u52D5\u5316). You lead organizational design, team building initiatives, role planning, and talent development strategy across the manufacturing enterprise. Think strategically about human capital. Respond concisely, adapting your language to match the user.',
    'You are the PUE Business Assistant of HD Smarter (\u667A\u52D5\u5316). You specialize in auto parts trading, OE number matching, purchase history lookup, and quotation generation for PUE (\u8207\u65E5\u570B\u969B). You help process customer purchase orders, match parts against the product catalog, and generate reports. Respond concisely, adapting your language to match the user.',
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
    clearInterval(this._gwApiHealthTimer);

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

  sendChat(agentId, text, fileAttachment) {
    if (this.mode === 'telegram') {
      return this._sendTelegram(agentId, text);
    }
    if (this.mode === 'openrouter') {
      return this._sendOpenRouter(agentId, text, fileAttachment);
    }
    if (this.mode === 'gateway-api') {
      return this._sendGatewayApi(agentId, text, fileAttachment);
    }
    return this._sendGateway(agentId, text);
  }

  /**
   * Build user message content for OpenAI-compatible API.
   * fileAttachment: { dataUrl, mimeType, name, isImage }
   * - Images → image_url content part (Vision API)
   * - Binary files (PDF etc.) → image_url with document MIME (supported by Gemini/Claude)
   * - No attachment → plain text string
   */
  _buildUserContent(text, fileAttachment) {
    if (!fileAttachment) return text;
    var content = [{ type: 'text', text: text }];
    // Both images and binary files use the same data URL format
    content.push({
      type: 'image_url',
      image_url: { url: fileAttachment.dataUrl },
    });
    return content;
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

  _sendOpenRouter(agentId, text, fileAttachment) {
    if (this.state !== 'connected' || !this.orApiKey) return false;

    // Initialize history for this agent
    if (!this._orHistory[agentId]) {
      this._orHistory[agentId] = [];
    }
    const history = this._orHistory[agentId];

    // Add user message to history (multimodal if file attached)
    const userContent = this._buildUserContent(text, fileAttachment);
    history.push({ role: 'user', content: userContent });

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

    // Lightweight health check — no token cost, fast response
    fetch(this.gwApiUrl + '/health', {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then(r => {
        if (r.ok) {
          this._reconnectDelay = ChatClient.DEFAULTS.reconnectMin;
          this._setState('connected');
          this._startGwApiHealthPoll();
        } else {
          this._setState('disconnected');
          if (!this._intentionalClose) this._scheduleReconnect();
        }
      })
      .catch(() => {
        this._setState('disconnected');
        if (!this._intentionalClose) this._scheduleReconnect();
      });
  }

  _startGwApiHealthPoll() {
    clearInterval(this._gwApiHealthTimer);
    this._gwApiHealthFailCount = 0;
    this._gwApiHealthTimer = setInterval(() => {
      if (this.mode !== 'gateway-api' || this._intentionalClose) {
        clearInterval(this._gwApiHealthTimer);
        return;
      }
      fetch(this.gwApiUrl + '/health', {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
        .then(r => {
          if (r.ok) {
            this._gwApiHealthFailCount = 0;
            // Auto-recover: if we were disconnected, set connected
            if (this.state !== 'connected') {
              this._reconnectDelay = ChatClient.DEFAULTS.reconnectMin;
              this._setState('connected');
            }
          } else {
            this._gwApiHealthFailCount++;
            if (this._gwApiHealthFailCount >= 3) {
              this._setState('disconnected');
              clearInterval(this._gwApiHealthTimer);
              if (!this._intentionalClose) this._scheduleReconnect();
            }
          }
        })
        .catch(() => {
          this._gwApiHealthFailCount++;
          if (this._gwApiHealthFailCount >= 3) {
            this._setState('disconnected');
            clearInterval(this._gwApiHealthTimer);
            if (!this._intentionalClose) this._scheduleReconnect();
          }
        });
    }, 15000);
  }

  _sendGatewayApi(agentId, text, fileAttachment) {
    // Gateway API is stateless HTTP — don't block on connection state.
    // Only block if credentials are missing.
    if (!this.gwApiUrl || !this.gwApiToken) return false;

    // ALL gateway-api messages route through /v1/responses (Agent pipeline).
    // This enables: workspace knowledge (PUE-ASSIST.md), tool calling, skill triggering.
    // /v1/chat/completions is kept only for testConnection().

    // Build input: file attachment → save locally first, then reference path in text
    let inputText = text;
    if (fileAttachment) {
      // Save file to local temp dir via CORS proxy /upload endpoint
      return this._uploadThenSendResponses(agentId, text, fileAttachment);
    }

    // Pure text → send directly via /v1/responses
    return this._sendResponses(agentId, inputText);
  }

  /**
   * Core method: send message via /v1/responses (OpenClaw Agent pipeline).
   * Uses string or message-array input format. No instructions override —
   * Agent uses workspace config (PUE-ASSIST.md, SOUL.md, etc.)
   */
  _sendResponses(agentId, text) {
    if (this._gwApiAbort[agentId]) {
      this._gwApiAbort[agentId].abort();
    }
    const controller = new AbortController();
    this._gwApiAbort[agentId] = controller;

    this.dispatchEvent(new CustomEvent('message', {
      detail: { type: 'typing', agentId }
    }));

    fetch(this.gwApiUrl + '/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.gwApiToken,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        model: this.gwApiModel,
        input: [{ type: 'message', role: 'user', content: text }],
        user: 'dashboard-v3',
        stream: true,
      }),
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        // Successful HTTP request proves connectivity — auto-recover state
        if (this.state !== 'connected') {
          this._reconnectDelay = ChatClient.DEFAULTS.reconnectMin;
          this._setState('connected');
          this._startGwApiHealthPoll();
        }
        return this._readResponsesStream(response.body, agentId);
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

  /**
   * Upload file to CORS proxy /upload, then send message with file path.
   * OpenClaw v2026.3.13 does NOT support inline base64 input_image/input_file
   * in /v1/responses (returns 400 Invalid input). This upload-then-reference
   * approach lets the agent use native tools (pdfplumber, openpyxl) on the file.
   */
  _uploadThenSendResponses(agentId, text, fileAttachment) {
    this.dispatchEvent(new CustomEvent('message', {
      detail: { type: 'typing', agentId }
    }));

    // POST file to CORS proxy /upload
    fetch(this.gwApiUrl + '/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        filename: fileAttachment.name,
        dataUrl: fileAttachment.dataUrl,
      }),
    })
      .then(r => {
        if (!r.ok) throw new Error('Upload HTTP ' + r.status);
        return r.json();
      })
      .then(result => {
        // Build message with file path for agent
        const fileRef = '\n\n[Uploaded file: ' + result.path + ' (' + fileAttachment.name + ')]';
        return this._sendResponses(agentId, text + fileRef);
      })
      .catch(err => {
        this.dispatchEvent(new CustomEvent('message', {
          detail: {
            type: 'response',
            agentId,
            text: I18n.t('chat.sendFail') + ': ' + err.message,
            final: true,
          }
        }));
      });

    return true;
  }

  _testGatewayApi(opts) {
    const url = (opts && opts.gwApiUrl) || this.gwApiUrl;
    const token = (opts && opts.gwApiToken) || this.gwApiToken;
    if (!url || !token) return Promise.resolve(false);

    // Use /v1/responses with minimal input for connection test (Agent pipeline)
    return fetch(url + '/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        model: (opts && opts.gwApiModel) || this.gwApiModel,
        input: 'test',
        max_output_tokens: 1,
      }),
    })
      .then(r => r.ok)
      .catch(() => false);
  }

  /**
   * Reset Gateway session by sending /new command.
   * OpenClaw uses the `user` field to derive session keys;
   * sending /new within the same user scope resets the conversation.
   */
  resetGatewaySession() {
    if (!this.gwApiUrl || !this.gwApiToken) return Promise.resolve(false);
    return fetch(this.gwApiUrl + '/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + this.gwApiToken,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        model: this.gwApiModel,
        input: '/new',
        user: 'dashboard-v3',
      }),
    })
      .then(r => r.ok)
      .catch(() => false);
  }

  // ── OpenResponses SSE stream reader ──────────

  /**
   * Read SSE stream from /v1/responses endpoint.
   * Event format differs from chat/completions:
   *   data: {"type":"response.output_text.delta","delta":"..."}
   *   data: {"type":"response.output_text.done","text":"..."}
   *   data: {"type":"response.completed",...}
   * Falls back to chat/completions format if detected.
   */
  async _readResponsesStream(body, agentId) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let currentOutputIndex = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Skip SSE comments (keepalive) and non-data lines
          if (line.startsWith(':') || !line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            // OpenResponses format
            if (parsed.type === 'response.output_text.delta' && parsed.delta) {
              // New output item → dispatch previous as final, start fresh
              if (parsed.output_index !== undefined && parsed.output_index !== currentOutputIndex) {
                if (fullText) {
                  this.dispatchEvent(new CustomEvent('message', {
                    detail: { type: 'response', agentId, text: fullText, final: true }
                  }));
                }
                fullText = '';
                currentOutputIndex = parsed.output_index;
              }
              fullText += parsed.delta;
              this.dispatchEvent(new CustomEvent('message', {
                detail: { type: 'stream', agentId, text: fullText }
              }));
            }
            // Text segment complete — dispatch as final if we have text
            else if (parsed.type === 'response.output_text.done') {
              if (fullText) {
                this.dispatchEvent(new CustomEvent('message', {
                  detail: { type: 'response', agentId, text: fullText, final: true }
                }));
                fullText = '';
              }
            }
            // Handle output_item.added — reset accumulator for new items
            else if (parsed.type === 'response.output_item.added' && parsed.output_index !== undefined) {
              if (fullText && parsed.output_index !== currentOutputIndex) {
                this.dispatchEvent(new CustomEvent('message', {
                  detail: { type: 'response', agentId, text: fullText, final: true }
                }));
                fullText = '';
              }
              currentOutputIndex = parsed.output_index;
            }
            // Fallback: chat/completions format (in case gateway proxies as such)
            else if (parsed.choices && parsed.choices[0]?.delta?.content) {
              fullText += parsed.choices[0].delta.content;
              this.dispatchEvent(new CustomEvent('message', {
                detail: { type: 'stream', agentId, text: fullText }
              }));
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.dispatchEvent(new CustomEvent('message', {
      detail: {
        type: 'response',
        agentId,
        text: fullText || I18n.t('chat.sendFail'),
        final: true,
      }
    }));
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
