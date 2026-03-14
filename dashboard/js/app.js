/**
 * app.js — Orchestrator: I18n + OfficeScene + StatusFetcher + ChatClient + ChatPanel + Notifications + SettingsPanel
 */
(function () {
  // Initialize i18n first
  I18n.init();

  // Core modules
  const office = new OfficeScene('office');
  const fetcher = new StatusFetcher();
  const cc = new ChatClient();
  const notify = new Notifications();
  const chat = new ChatPanel();
  const settings = new SettingsPanel(cc);

  // ── Status bar ──────────────────────────────
  function updateStatusBar(data) {
    if (!data) return;

    const setPill = (id, label, ok) => {
      const el = document.getElementById(id);
      el.textContent = label;
      el.className = 'status-pill ' + (ok === true ? 'ok' : ok === false ? 'err' : 'warn');
    };

    if (data.gateway) {
      const gwOk = data.gateway.status === 'running' || data.gateway.status === 'ok' || data.gateway.ok === true;
      const gwLabel = gwOk ? I18n.t('app.gwRunning') : I18n.t('app.gwOffline');
      setPill('gw-pill', 'Gateway: ' + gwLabel, gwOk);
    }

    const channels = data.channels;
    if (channels) {
      let tgOk = null;
      if (channels.telegram) {
        if (typeof channels.telegram === 'object' && channels.telegram.running !== undefined) {
          tgOk = channels.telegram.running;
        } else if (channels.telegram.status) {
          tgOk = channels.telegram.status === 'running' || channels.telegram.status === 'ok';
        }
      }
      if (channels.channels && channels.channels.telegram) {
        tgOk = channels.channels.telegram.running;
      }
      setPill('tg-pill', 'Telegram: ' + (tgOk ? 'Running' : tgOk === false ? 'Off' : '--'), tgOk);

      let lineOk = null;
      if (channels.line) {
        if (typeof channels.line === 'object' && channels.line.running !== undefined) {
          lineOk = channels.line.running;
        } else if (channels.line.status) {
          lineOk = channels.line.status === 'running' || channels.line.status === 'ok';
        }
      }
      if (channels.channels && channels.channels.line) {
        lineOk = channels.channels.line.running;
      }
      setPill('line-pill', 'LINE: ' + (lineOk ? 'Running' : lineOk === false ? 'Off' : '--'), lineOk);
    }

    if (data.version) {
      document.title = '\u26A1 Nexus Office \u2014 ' + data.version;
    }

    document.getElementById('agent-count').textContent = office.agents.length + ' ' + I18n.t('app.agents');
  }

  // ── Clock ───────────────────────────────────
  function updateClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = h + ':' + m + ':' + s;
  }

  // ── Wiring: OfficeScene → ChatPanel ─────────
  office.onAgentClick = (agent) => {
    chat.open(agent);
    chat.setOffline(cc.state !== 'connected');
    // Show Telegram fallback if both modes fail
    chat.showTelegramFallback(cc.state !== 'connected');
  };

  // ── Wiring: ChatPanel → ChatClient ──────────
  chat.onSend = (agentId, text) => {
    const sent = cc.sendChat(agentId, text);
    if (!sent) {
      chat.addMessage('system', '\u274C ' + I18n.t('chat.sendFail'));
    }
  };

  // ── Wiring: ChatClient events ─────────────
  cc.addEventListener('connected', () => {
    notify.success('\u2705 ' + I18n.t('app.connected'));
    chat.setOffline(false);
    chat.showTelegramFallback(false);
  });

  cc.addEventListener('disconnected', () => {
    notify.warning('\u26A0\uFE0F ' + I18n.t('app.disconnected'));
    chat.setOffline(true);
    chat.showTelegramFallback(true);
  });

  cc.addEventListener('message', (e) => {
    const data = e.detail;
    if (data.type === 'chat' || data.type === 'response') {
      const agentId = data.agentId != null ? data.agentId : 0;
      const text = data.text || data.message || '';

      // Show in chat panel if open for this agent
      if (chat.isOpen && chat.agent && chat.agent.id === agentId) {
        chat.setTyping(false);
        chat.addMessage('agent', text);
      } else {
        // Notify if chat not open
        const name = I18n.agentName(agentId);
        notify.info(name + '\uFF1A' + (text.length > 30 ? text.slice(0, 30) + '\u2026' : text));
      }

      // Show speech bubble on agent
      office.showAgentSpeech(agentId, text);

      // Briefly set agent as active
      office.updateAgentStatus(agentId, 'active', text.length > 20 ? text.slice(0, 20) : text);
      setTimeout(() => office.updateAgentStatus(agentId, 'idle'), 8000);
    }

    if (data.type === 'typing') {
      chat.setTyping(true);
    }
  });

  // ── Settings gear button ────────────────────
  const gearBtn = document.getElementById('settings-btn');
  if (gearBtn) {
    gearBtn.addEventListener('click', () => settings.open());
  }

  // ── i18n: update status bar labels on lang change ──
  I18n.onChange(() => {
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.title = I18n.t('app.settings');
    document.getElementById('agent-count').textContent = office.agents.length + ' ' + I18n.t('app.agents');
  });

  // ── Initialize ──────────────────────────────
  fetcher.onChange(updateStatusBar);
  fetcher.startPolling();
  office.start();
  cc.connect();

  updateClock();
  setInterval(updateClock, 1000);
})();
