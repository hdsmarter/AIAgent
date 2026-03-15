/**
 * app.js — Orchestrator (Enterprise Dashboard v3)
 * AuthGate + I18n + ThemePalette + OfficeScene + ViewManager + AgentSidebar
 * + StatusFetcher + ChatClient + ChatPanel + Notifications + SettingsPanel
 * Streaming wiring for OpenRouter / Gateway API SSE
 */
(function () {
  // Initialize i18n + theme (needed for auth gate UI)
  I18n.init();
  ThemePalette.init();

  // Auth gate — blocks until authenticated, then initializes app
  AuthGate.guard(function initApp() {

  // Theme toggle button
  var themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.textContent = ThemePalette._current === 'light' ? '\u2600' : '\uD83C\uDF19';
    themeBtn.setAttribute('aria-label', I18n.t('app.themeToggle'));
    themeBtn.addEventListener('click', function() {
      ThemePalette.toggle();
      themeBtn.textContent = ThemePalette._current === 'light' ? '\u2600' : '\uD83C\uDF19';
    });
  }

  // Core modules
  var office = new OfficeScene('office');
  var fetcher = new StatusFetcher();
  var cc = new ChatClient();
  var notify = new Notifications();
  var chat = new ChatPanel();
  var settings = new SettingsPanel(cc);
  var viewMgr = new ViewManager(document.getElementById('main-content'));
  var sidebar = new AgentSidebar();

  // Initialize ViewManager with OfficeScene
  viewMgr.setOfficeScene(office);
  viewMgr.setAgents(office.agents);
  viewMgr.showWorkspace(); // default view

  // Initialize AgentSidebar
  sidebar.setAgents(office.agents);

  // ── Status bar ──────────────────────────────
  function updateStatusBar(data) {
    if (!data) return;

    var setPill = function(id, label, ok) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = label;
      el.className = 'status-pill ' + (ok === true ? 'ok' : ok === false ? 'err' : 'warn');
    };

    if (data.gateway) {
      var gwOk = data.gateway.status === 'running' || data.gateway.status === 'ok' || data.gateway.ok === true;
      var gwLabel = gwOk ? I18n.t('app.gwRunning') : I18n.t('app.gwOffline');
      setPill('gw-pill', 'Gateway: ' + gwLabel, gwOk);
    }

    var channels = data.channels;
    if (channels) {
      var tgOk = null;
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

      var lineOk = null;
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
      document.title = '\u26A1 HD \u667A\u52D5\u5316 \u2014 ' + data.version;
    }

    var countEl = document.getElementById('agent-count');
    if (countEl) countEl.textContent = office.agents.length + ' ' + I18n.t('app.agents');
  }

  // ── Clock ───────────────────────────────────
  function updateClock() {
    var el = document.getElementById('clock');
    if (!el) return;
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = h + ':' + m + ':' + s;
  }

  // ── Agent selection (from sidebar, workspace, or office) ──
  function selectAgent(agent) {
    chat.open(agent);
    chat.setOffline(cc.state !== 'connected');
    chat.showTelegramFallback(cc.state !== 'connected' && cc.mode === 'telegram');
    sidebar.setActiveAgent(agent.id);
    viewMgr.setActiveAgent(agent.id);
    office.selectedAgent = agent;
  }

  // Wire sidebar → selectAgent
  sidebar.onAgentSelect = function(agent) {
    selectAgent(agent);
  };

  // Wire workspace cards → selectAgent
  viewMgr.onAgentClick = function(agent) {
    selectAgent(agent);
  };

  // Wire office scene click → selectAgent
  office.onAgentClick = function(agent) {
    selectAgent(agent);
  };

  // ── Wiring: ChatPanel -> ChatClient ──────────
  chat.onSend = function(agentId, text) {
    return cc.sendChat(agentId, text);
  };

  // ── Wiring: ChatClient events ─────────────
  var _lastNotifiedState = 'disconnected';

  cc.addEventListener('connected', function() {
    _lastNotifiedState = 'connected';
    notify.success('\u2705 ' + I18n.t('app.connected'));
    chat.setOffline(false);
    chat.showTelegramFallback(false);
  });

  cc.addEventListener('disconnected', function() {
    if (_lastNotifiedState === 'connected') {
      notify.warning('\u26A0\uFE0F ' + I18n.t('app.disconnected'));
    }
    _lastNotifiedState = 'disconnected';
    chat.setOffline(true);
    chat.showTelegramFallback(cc.mode === 'telegram');
  });

  cc.addEventListener('message', function(e) {
    var d = e.detail;

    // OpenRouter / Gateway API streaming — incremental text
    if (d.type === 'stream') {
      if (!chat._streaming) {
        chat.setTyping(false);
        chat.startStreamingMessage();
      }
      chat.updateLastAgentMessage(d.text);
      office.updateAgentStatus(d.agentId, 'active');
      viewMgr.updateAgentStatus(d.agentId, 'active');
      sidebar.updateAgentStatus(d.agentId, 'active');
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
      viewMgr.updateLastMessage(d.agentId, d.text);
      setTimeout(function() {
        office.updateAgentStatus(d.agentId, 'idle');
        viewMgr.updateAgentStatus(d.agentId, 'idle');
        sidebar.updateAgentStatus(d.agentId, 'idle');
      }, 8000);
      return;
    }

    // Chat / response (non-streaming modes: TG, Gateway)
    if (d.type === 'chat' || d.type === 'response') {
      var agentId = d.agentId != null ? d.agentId : 0;
      var text = d.text || d.message || '';

      if (chat.isOpen && chat.agent && chat.agent.id === agentId) {
        chat.setTyping(false);
        chat.addMessage('agent', text);
      } else {
        var name = I18n.agentName(agentId);
        notify.info(name + '\uFF1A' + (text.length > 30 ? text.slice(0, 30) + '\u2026' : text));
      }

      office.showAgentSpeech(agentId, text);
      office.updateAgentStatus(agentId, 'active', text.length > 20 ? text.slice(0, 20) : text);
      viewMgr.updateLastMessage(agentId, text);
      viewMgr.updateAgentStatus(agentId, 'active');
      sidebar.updateAgentStatus(agentId, 'active');
      setTimeout(function() {
        office.updateAgentStatus(agentId, 'idle');
        viewMgr.updateAgentStatus(agentId, 'idle');
        sidebar.updateAgentStatus(agentId, 'idle');
      }, 8000);
      return;
    }

    // Typing indicator
    if (d.type === 'typing') {
      chat.setTyping(true);
    }
  });

  // ── Settings gear button ────────────────────
  var gearBtn = document.getElementById('settings-btn');
  if (gearBtn) {
    gearBtn.addEventListener('click', function() { settings.open(); });
  }

  // ── i18n: update labels on lang change ──
  I18n.onChange(function() {
    var settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.title = I18n.t('app.settings');
    if (themeBtn) themeBtn.setAttribute('aria-label', I18n.t('app.themeToggle'));
    var countEl = document.getElementById('agent-count');
    if (countEl) countEl.textContent = office.agents.length + ' ' + I18n.t('app.agents');
  });

  // ── Mobile navigation ──────────────────────
  var mobileNav = document.getElementById('mobile-nav');
  if (mobileNav) {
    var navBtns = mobileNav.querySelectorAll('.mobile-nav-btn');
    var sidebarEl = document.getElementById('sidebar');
    var mainContent = document.getElementById('main-content');
    var chatSection = document.getElementById('chat-panel-section');

    function setMobileTab(tab) {
      navBtns.forEach(function(btn) {
        var isActive = btn.dataset.tab === tab;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      if (sidebarEl) {
        sidebarEl.classList.toggle('mobile-active', tab === 'agents');
      }
      if (mainContent) {
        mainContent.classList.toggle('mobile-active', tab === 'workspace');
      }
      if (chatSection) {
        chatSection.classList.toggle('mobile-active', tab === 'chat');
      }
    }

    navBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        setMobileTab(btn.dataset.tab);
      });
    });

    // Default mobile tab
    setMobileTab('agents');
  }

  // ── OfficeScene resize on view toggle ──────
  window.addEventListener('resize', function() {
    if (viewMgr.view === 'office') {
      office.resize();
    }
  });

  // ── Initialize ──────────────────────────────
  fetcher.onChange(updateStatusBar);
  fetcher.startPolling();
  office.start();
  cc.connect();

  updateClock();
  setInterval(updateClock, 1000);

  }); // end AuthGate.guard
})();
