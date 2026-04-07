/**
 * app.js — Orchestrator (Enterprise Dashboard v4 — SaaS architecture)
 * Wires: AuthGate + I18n + ThemePalette + NavSidebar + ViewManager
 *        + DashboardView + OfficeScene + ChatPanel + SettingsPanel
 *        + StatusFetcher + ChatClient + Notifications
 * Routes: #/dashboard, #/agents, #/chat, #/office, #/settings
 */
(function () {
  // Initialize i18n + theme (needed for auth gate UI)
  I18n.init();
  ThemePalette.init();

  // Auth gate — blocks until authenticated, then initializes app
  AuthGate.guard(function initApp() {

  // ── Core modules ─────────────────────────────
  var office = new OfficeScene('office');
  var fetcher = new StatusFetcher();
  var cc = new ChatClient();
  var notify = new Notifications();
  var chat = new ChatPanel();
  var settings = new SettingsPanel(cc);
  var viewMgr = new ViewManager();
  var navSidebar = new NavSidebar();
  var dashView = new DashboardView(document.getElementById('view-dashboard'));

  // ── Theme toggle (SVG sun/moon swap) ─────────
  var themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    _syncThemeIcon();
    themeBtn.setAttribute('aria-label', I18n.t('app.themeToggle'));
    themeBtn.addEventListener('click', function() {
      ThemePalette.toggle();
      _syncThemeIcon();
    });
  }

  function _syncThemeIcon() {
    if (!themeBtn) return;
    var isDark = ThemePalette._current === 'dark';
    var sun = themeBtn.querySelector('.icon-sun');
    var moon = themeBtn.querySelector('.icon-moon');
    if (sun) sun.style.display = isDark ? 'none' : '';
    if (moon) moon.style.display = isDark ? '' : 'none';
  }

  // ── Register Views ───────────────────────────
  viewMgr.registerView('dashboard', {
    containerEl: document.getElementById('view-dashboard'),
    breadcrumb: I18n.t('nav.dashboard'),
    onInit: function() {
      dashView.init();
      dashView.setAgents(office.agents);
    },
    onShow: function() {
      dashView._updateGreeting();
    },
  });

  viewMgr.registerView('agents', {
    containerEl: document.getElementById('view-agents'),
    breadcrumb: I18n.t('nav.agentOverview'),
    onInit: function() {
      viewMgr.setAgents(office.agents);
      var container = document.getElementById('view-agents');
      // Build toolbar + cards
      var toolbar = document.createElement('div');
      toolbar.className = 'agents-toolbar';
      container.appendChild(toolbar);
      var grid = document.createElement('div');
      grid.className = 'agents-grid';
      container.appendChild(grid);
      viewMgr.buildAgentCards(grid, toolbar);
    },
  });

  viewMgr.registerView('chat', {
    containerEl: document.getElementById('view-chat'),
    breadcrumb: I18n.t('nav.conversation'),
    onInit: function() {
      chat.init(office.agents);
    },
    onShow: function(opts) {
      // If navigating with agentId, open that agent
      if (opts && opts.agentId !== undefined) {
        var agentId = parseInt(opts.agentId, 10);
        var agent = office.agents.find(function(a) { return a.id === agentId; });
        if (agent) selectAgent(agent);
      }
    },
  });

  viewMgr.registerView('office', {
    containerEl: document.getElementById('view-office'),
    breadcrumb: I18n.t('nav.office'),  // 情境儀表板
    onShow: function() {
      office.resize();
    },
  });

  viewMgr.registerView('settings', {
    containerEl: document.getElementById('view-settings'),
    breadcrumb: I18n.t('nav.settings'),
    onInit: function(opts) {
      settings.init(opts);
    },
    onShow: function(opts) {
      settings.show(opts);
    },
  });

  // ── Initialize ViewManager + OfficeScene data ─
  viewMgr.setOfficeScene(office);
  viewMgr.setAgents(office.agents);

  // ── Agent selection (unified) ────────────────
  function selectAgent(agent) {
    chat.open(agent);
    var isOffline = cc.state !== 'connected' && cc.mode !== 'gateway-api';
    chat.setOffline(isOffline);
    chat.showTelegramFallback(cc.state !== 'connected' && cc.mode === 'telegram');
    viewMgr.setActiveAgent(agent.id);
    office.selectedAgent = agent;
  }

  // Wire: NavSidebar → ViewManager navigation
  navSidebar.onNavigate = function(route, params) {
    viewMgr.navigate(route, params);
    navSidebar.setActive(
      params && params.tab ? 'settings-' + params.tab.replace('connection', 'conn') : route,
      route
    );
  };

  // Wire: Dashboard quick actions → routes
  dashView.onQuickAction = function(actionId, opts) {
    switch (actionId) {
      case 'chat':
        viewMgr.navigate('chat');
        navSidebar.setActive('chat', 'chat');
        break;
      case 'agents':
        viewMgr.navigate('agents');
        navSidebar.setActive('agents', 'agents');
        break;
      case 'office':
        viewMgr.navigate('office');
        navSidebar.setActive('office', 'office');
        break;
      case 'settings':
        viewMgr.navigate('settings', { tab: 'connection' });
        navSidebar.setActive('settings-conn', 'settings');
        break;
      case 'chat-agent':
        if (opts && opts.agentId !== undefined) {
          viewMgr.navigate('chat', { agentId: opts.agentId });
          navSidebar.setActive('chat', 'chat');
        }
        break;
    }
  };

  // Wire: Agent cards → chat
  viewMgr.onAgentClick = function(agent) {
    viewMgr.navigate('chat', { agentId: agent.id });
    navSidebar.setActive('chat', 'chat');
  };

  viewMgr.onAgentChat = function(agent) {
    viewMgr.navigate('chat', { agentId: agent.id });
    navSidebar.setActive('chat', 'chat');
  };

  // Wire: Office scene click → chat
  office.onAgentClick = function(agent) {
    viewMgr.navigate('chat', { agentId: agent.id });
    navSidebar.setActive('chat', 'chat');
    selectAgent(agent);
  };

  // ── Wiring: ChatPanel → ChatClient ───────────
  chat.onSend = function(agentId, text, fileAttachment) {
    return cc.sendChat(agentId, text, fileAttachment);
  };
  chat.onSendFail = function() {
    var reason = cc.sendFailReason || '';
    var msg = I18n.t('chat.sendFail');
    if (reason.indexOf('missing-gw') === 0) {
      msg += ' — ' + I18n.t('chat.checkSettings');
    } else if (reason.indexOf('telegram') === 0 || reason.indexOf('openrouter') === 0 || reason.indexOf('gateway-ws') === 0) {
      msg += ' — ' + I18n.t('chat.checkSettings');
    }
    notify.warning(msg);
  };
  chat.onClearHistory = function() {
    return cc.resetGatewaySession();
  };

  // ── Wiring: ChatClient events ────────────────
  var _lastNotifiedState = 'disconnected';

  cc.addEventListener('connected', function() {
    _lastNotifiedState = 'connected';
    notify.success(I18n.t('app.connected'));
    chat.setOffline(false);
    chat.showTelegramFallback(false);
    dashView.addActivity('Gateway ' + I18n.t('app.gwRunning'));
  });

  cc.addEventListener('disconnected', function() {
    if (_lastNotifiedState === 'connected') {
      notify.warning(I18n.t('app.disconnected'));
    }
    _lastNotifiedState = 'disconnected';
    // Gateway API is stateless HTTP — don't block input on disconnect.
    // User can still attempt to send; the request will fail naturally if truly offline.
    var blockInput = cc.mode !== 'gateway-api';
    chat.setOffline(blockInput);
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
      chat.updateAgentStatus(d.agentId, 'active');
      return;
    }

    // Final response (from any mode)
    if (d.type === 'response' && d.final) {
      if (chat._streaming) {
        // Store quick replies for finalizeStreaming to pick up
        chat._pendingQuickReplies = d.quickReplies || null;
        chat.finalizeStreaming();
      } else if (chat.isOpen && chat.agent && chat.agent.id === d.agentId) {
        chat.setTyping(false);
        chat.addMessage('agent', d.text, { quickReplies: d.quickReplies });
      }
      office.showAgentSpeech(d.agentId, d.text);
      viewMgr.updateLastMessage(d.agentId, d.text);

      // Add to dashboard recent chats
      dashView.addRecentChat(d.agentId, d.text);

      setTimeout(function() {
        office.updateAgentStatus(d.agentId, 'idle');
        viewMgr.updateAgentStatus(d.agentId, 'idle');
        chat.updateAgentStatus(d.agentId, 'idle');
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
      chat.updateAgentStatus(agentId, 'active');

      // Add to dashboard recent chats
      dashView.addRecentChat(agentId, text);

      setTimeout(function() {
        office.updateAgentStatus(agentId, 'idle');
        viewMgr.updateAgentStatus(agentId, 'idle');
        chat.updateAgentStatus(agentId, 'idle');
      }, 8000);
      return;
    }

    // Typing indicator
    if (d.type === 'typing') {
      chat.setTyping(true);
    }
  });

  // ── Status Fetcher → Dashboard + Settings + Sidebar ──
  function updateStatus(data) {
    if (!data) return;

    // Update dashboard (agent count only)
    dashView.updateStatus(data);

    // Update settings (gateway / telegram / line status)
    settings.updateStatus(data);

    // Update nav sidebar footer
    var gwOk = false;
    if (data.gateway) {
      gwOk = data.gateway.status === 'running' || data.gateway.status === 'ok' || data.gateway.ok === true;
    }
    navSidebar.updateStats({
      agentCount: office.agents.length,
      gatewayOk: gwOk,
    });

    // Update page title
    if (data.version) {
      document.title = 'HD \u667A\u52D5\u5316 \u2014 ' + data.version;
    }
  }

  // ── Clock (navbar) ───────────────────────────
  function updateClock() {
    var el = document.getElementById('clock');
    if (!el) return;
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = h + ':' + m + ':' + s;
  }

  // ── Cmd+K search shortcut ────────────────────
  var searchInput = document.getElementById('navbar-search-input');
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (searchInput) searchInput.focus();
    }
    if (e.key === 'Escape' && searchInput && document.activeElement === searchInput) {
      searchInput.blur();
    }
  });

  // ── Mobile bottom nav ────────────────────────
  var mobileNav = document.getElementById('mobile-nav');
  if (mobileNav) {
    var navBtns = mobileNav.querySelectorAll('.mobile-nav-btn');
    navBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var route = btn.dataset.route;
        viewMgr.navigate(route);

        // Update active state
        navBtns.forEach(function(b) {
          var isActive = b.dataset.route === route;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // Also sync sidebar
        navSidebar.setActive(route, route);
      });
    });
  }

  // ── ViewManager route change → sync mobile nav ──
  viewMgr.onRouteChange = function(route) {
    if (mobileNav) {
      var navBtns = mobileNav.querySelectorAll('.mobile-nav-btn');
      navBtns.forEach(function(btn) {
        var isActive = btn.dataset.route === route;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }
  };

  // ── i18n: update labels on lang change ───────
  I18n.onChange(function() {
    if (themeBtn) themeBtn.setAttribute('aria-label', I18n.t('app.themeToggle'));
    // Search placeholder
    if (searchInput) searchInput.placeholder = I18n.t('nav.searchPlaceholder');
  });

  // ── OfficeScene resize on view toggle ────────
  window.addEventListener('resize', function() {
    if (viewMgr.currentRoute === 'office') {
      office.resize();
    }
  });

  // ── Initialize ────────────────────────────────
  fetcher.onChange(updateStatus);
  fetcher.startPolling();
  office.start();
  cc.connect();

  updateClock();
  setInterval(updateClock, 1000);

  // Route from hash or default to dashboard
  viewMgr.initFromHash();

  // Sync sidebar active state to initial route
  var initialRoute = viewMgr.currentRoute || 'dashboard';
  navSidebar.setActive(initialRoute, initialRoute);

  }); // end AuthGate.guard
})();
