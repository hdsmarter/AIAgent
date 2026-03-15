/**
 * app.js — Orchestrator
 * I18n + ThemePalette + OfficeScene + StatusFetcher + ChatClient + ChatPanel + Notifications + SettingsPanel
 * Streaming wiring for OpenRouter SSE
 */
(function () {
  // Initialize i18n + theme
  I18n.init();
  ThemePalette.init();

  // Theme toggle button
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.textContent = ThemePalette._current === 'light' ? '\u2600' : '\uD83C\uDF19';
    themeBtn.setAttribute('aria-label', I18n.t('app.themeToggle'));
    themeBtn.addEventListener('click', () => {
      ThemePalette.toggle();
      themeBtn.textContent = ThemePalette._current === 'light' ? '\u2600' : '\uD83C\uDF19';
    });
  }

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
      document.title = '\u26A1 HD Smarter \u5929\u4F7F \u2014 ' + data.version;
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

  // ── Wiring: OfficeScene -> ChatPanel ─────────
  office.onAgentClick = (agent) => {
    chat.open(agent);
    chat.setOffline(cc.state !== 'connected');
    chat.showTelegramFallback(cc.state !== 'connected' && cc.mode === 'telegram');
  };

  // ── Wiring: ChatPanel -> ChatClient ──────────
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
    chat.showTelegramFallback(cc.mode === 'telegram');
  });

  cc.addEventListener('message', (e) => {
    const d = e.detail;

    // OpenRouter streaming — incremental text
    if (d.type === 'stream') {
      if (!chat._streaming) {
        chat.setTyping(false);
        chat.startStreamingMessage();
      }
      chat.updateLastAgentMessage(d.text);
      office.updateAgentStatus(d.agentId, 'active');
      return;
    }

    // Final response (from any mode)
    if (d.type === 'response' && d.final) {
      if (chat._streaming) {
        chat.finalizeStreaming();
      } else if (chat.isOpen && chat.agent && chat.agent.id === d.agentId) {
        chat.setTyping(false);
        chat.addMessage('agent', d.text);
      }
      office.showAgentSpeech(d.agentId, d.text);
      setTimeout(() => office.updateAgentStatus(d.agentId, 'idle'), 8000);
      return;
    }

    // Chat / response (non-streaming modes: TG, Gateway)
    if (d.type === 'chat' || d.type === 'response') {
      const agentId = d.agentId != null ? d.agentId : 0;
      const text = d.text || d.message || '';

      if (chat.isOpen && chat.agent && chat.agent.id === agentId) {
        chat.setTyping(false);
        chat.addMessage('agent', text);
      } else {
        const name = I18n.agentName(agentId);
        notify.info(name + '\uFF1A' + (text.length > 30 ? text.slice(0, 30) + '\u2026' : text));
      }

      office.showAgentSpeech(agentId, text);
      office.updateAgentStatus(agentId, 'active', text.length > 20 ? text.slice(0, 20) : text);
      setTimeout(() => office.updateAgentStatus(agentId, 'idle'), 8000);
      return;
    }

    // Typing indicator
    if (d.type === 'typing') {
      chat.setTyping(true);
    }
  });

  // ── Settings gear button ────────────────────
  const gearBtn = document.getElementById('settings-btn');
  if (gearBtn) {
    gearBtn.addEventListener('click', () => settings.open());
  }

  // ── i18n: update labels on lang change ──
  I18n.onChange(() => {
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.title = I18n.t('app.settings');
    if (themeBtn) themeBtn.setAttribute('aria-label', I18n.t('app.themeToggle'));
    document.getElementById('agent-count').textContent = office.agents.length + ' ' + I18n.t('app.agents');
  });

  // ── Agent Sidebar ──────────────────────────
  const sidebar = document.getElementById('agent-sidebar');
  const sidebarList = document.getElementById('sidebar-agent-list');
  const sidebarTitle = document.getElementById('sidebar-title');
  const hamburger = document.getElementById('hamburger-btn');

  function populateSidebar() {
    sidebarList.textContent = '';
    if (sidebarTitle) sidebarTitle.textContent = I18n.t('app.agentList');
    for (const agent of office.agents) {
      const li = document.createElement('li');
      li.className = 'sidebar-agent-item';
      li.setAttribute('role', 'listitem');
      li.dataset.agentId = agent.id;

      const dot = document.createElement('span');
      dot.className = 'agent-color-dot';
      const palette = PixelSprites.agentPalettes[agent.id];
      dot.style.backgroundColor = palette ? palette.shirt : '#888';

      const info = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'sidebar-agent-name';
      name.textContent = I18n.agentName(agent.id);
      const role = document.createElement('div');
      role.className = 'sidebar-agent-role';
      role.textContent = I18n.agentRole(agent.id);
      info.appendChild(name);
      info.appendChild(role);

      li.appendChild(dot);
      li.appendChild(info);

      li.addEventListener('click', () => {
        office.selectedAgent = agent;
        office.onAgentClick(agent);
        sidebar.classList.remove('open');
      });

      sidebarList.appendChild(li);
    }
  }

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Close sidebar when clicking outside
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== hamburger) {
      sidebar.classList.remove('open');
    }
  });

  I18n.onChange(() => populateSidebar());

  // ── Initialize ──────────────────────────────
  fetcher.onChange(updateStatusBar);
  fetcher.startPolling();
  office.start();
  cc.connect();
  populateSidebar();

  updateClock();
  setInterval(updateClock, 1000);
})();
