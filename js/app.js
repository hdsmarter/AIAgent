/**
 * app.js — Orchestrator：整合 OfficeScene + StatusFetcher + GatewayClient + ChatPanel + Notifications + SettingsPanel
 */
(function () {
  // Core modules
  const office = new OfficeScene('office');
  const fetcher = new StatusFetcher();
  const gw = new GatewayClient();
  const notify = new Notifications();
  const chat = new ChatPanel();
  const settings = new SettingsPanel(gw);

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
      setPill('gw-pill', 'Gateway: ' + (gwOk ? 'Running' : 'Offline'), gwOk);
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

    document.getElementById('agent-count').textContent = office.agents.length + ' Agents';
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
    chat.setOffline(gw.state !== 'connected');
  };

  // ── Wiring: ChatPanel → GatewayClient ───────
  chat.onSend = (agentId, text) => {
    const sent = gw.sendChat(agentId, text);
    if (!sent) {
      chat.addMessage('system', '\u274C \u7121\u6CD5\u50B3\u9001\uFF0C\u9598\u9053\u5668\u672A\u9023\u7DDA');
    }
  };

  // ── Wiring: GatewayClient events ────────────
  gw.addEventListener('connected', () => {
    notify.success('\u2705 \u5DF2\u9023\u7DDA\u5230\u9598\u9053\u5668');
    chat.setOffline(false);
  });

  gw.addEventListener('disconnected', () => {
    notify.warning('\u26A0\uFE0F \u9598\u9053\u5668\u9023\u7DDA\u4E2D\u65B7');
    chat.setOffline(true);
  });

  gw.addEventListener('message', (e) => {
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
        const agent = office.agents.find(a => a.id === agentId);
        const name = agent ? agent.name : 'Agent';
        notify.info(name + '\uFF1A' + (text.length > 30 ? text.slice(0, 30) + '\u2026' : text));
      }

      // Show speech bubble on agent
      office.showAgentSpeech(agentId, text);
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

  // ── Initialize ──────────────────────────────
  fetcher.onChange(updateStatusBar);
  fetcher.startPolling();
  office.start();
  gw.connect();

  updateClock();
  setInterval(updateClock, 1000);
})();
