/**
 * view-manager.js — Hash-based route manager (SaaS style)
 * Routes: #/dashboard, #/agents, #/chat, #/office, #/settings
 * Replaces simple workspace/office toggle with multi-view router
 */
class ViewManager {
  constructor() {
    this._views = {};
    this._currentRoute = null;
    this._breadcrumbEl = document.getElementById('breadcrumb-text');

    // Agent data (shared)
    this._agents = [];
    this._lastMessages = {};
    this._officeScene = null;

    // Callbacks
    this.onAgentClick = null;
    this.onAgentChat = null;
    this.onRouteChange = null;

    // Listen for hash changes
    window.addEventListener('hashchange', () => this._onHashChange());
  }

  /**
   * Register a view
   * @param {string} route - Route name (e.g. 'dashboard')
   * @param {object} config - { containerEl, onShow, onHide, onInit, breadcrumb }
   */
  registerView(route, config) {
    this._views[route] = {
      containerEl: config.containerEl,
      onShow: config.onShow || null,
      onHide: config.onHide || null,
      onInit: config.onInit || null,
      breadcrumb: config.breadcrumb || route,
      initialized: false,
    };
  }

  /**
   * Navigate to a route
   */
  navigate(route, opts) {
    opts = opts || {};
    if (!this._views[route]) return;

    // Hide current view
    if (this._currentRoute && this._views[this._currentRoute]) {
      var current = this._views[this._currentRoute];
      if (current.containerEl) current.containerEl.style.display = 'none';
      if (current.onHide) current.onHide();
    }

    // Show target view
    var view = this._views[route];
    if (!view.initialized && view.onInit) {
      view.onInit(opts);
      view.initialized = true;
    }
    if (view.containerEl) view.containerEl.style.display = '';
    if (view.onShow) view.onShow(opts);

    this._currentRoute = route;

    // Update hash without triggering hashchange
    var newHash = '#/' + route;
    if (window.location.hash !== newHash) {
      history.pushState(null, '', newHash);
    }

    // Update breadcrumb
    if (this._breadcrumbEl) {
      this._breadcrumbEl.textContent = I18n.t('nav.' + route) || view.breadcrumb;
    }

    // Callback
    if (this.onRouteChange) this.onRouteChange(route, opts);
  }

  get currentRoute() { return this._currentRoute; }

  _onHashChange() {
    var hash = window.location.hash.replace('#/', '') || 'dashboard';
    var parts = hash.split('?');
    var route = parts[0];
    var params = {};
    if (parts[1]) {
      parts[1].split('&').forEach(function(p) {
        var kv = p.split('=');
        params[kv[0]] = kv[1];
      });
    }
    if (this._views[route] && route !== this._currentRoute) {
      this.navigate(route, params);
    }
  }

  /**
   * Initialize from current hash or default to 'dashboard'
   */
  initFromHash() {
    var hash = window.location.hash.replace('#/', '') || 'dashboard';
    var parts = hash.split('?');
    var route = parts[0];
    if (this._views[route]) {
      this.navigate(route);
    } else {
      this.navigate('dashboard');
    }
  }

  // ── Agent data (shared across views) ──────────

  setAgents(agents) {
    this._agents = agents;
  }

  getAgents() {
    return this._agents;
  }

  setOfficeScene(scene) {
    this._officeScene = scene;
  }

  getOfficeScene() {
    return this._officeScene;
  }

  updateLastMessage(agentId, text) {
    this._lastMessages[agentId] = text;
  }

  getLastMessage(agentId) {
    return this._lastMessages[agentId] || '';
  }

  // ── Agent Cards Grid (GWS style) — used by agents view ──

  buildAgentCards(containerEl, toolbarEl) {
    if (!containerEl) return;
    containerEl.textContent = '';

    // Build toolbar
    if (toolbarEl) {
      toolbarEl.textContent = '';

      // Search
      var search = document.createElement('div');
      search.className = 'agents-search';
      search.appendChild(svgFromTemplate(SvgIcons.robot));
      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = I18n.t('nav.searchAgents');
      searchInput.setAttribute('aria-label', I18n.t('nav.searchAgents'));
      searchInput.addEventListener('input', () => {
        this._filterAgentCards(containerEl, searchInput.value);
      });
      search.appendChild(searchInput);
      toolbarEl.appendChild(search);

      // Filter buttons
      var filters = document.createElement('div');
      filters.className = 'agents-filter';
      var filterOptions = [
        { key: 'all', label: I18n.t('agents.filterAll') },
        { key: 'active', label: I18n.t('agents.filterActive') },
        { key: 'idle', label: I18n.t('agents.filterIdle') },
      ];
      for (var f = 0; f < filterOptions.length; f++) {
        var fb = document.createElement('button');
        fb.className = 'agents-filter-btn' + (f === 0 ? ' active' : '');
        fb.textContent = filterOptions[f].label;
        fb.dataset.filter = filterOptions[f].key;
        fb.addEventListener('click', (function(filterBtn) {
          return function() {
            filters.querySelectorAll('.agents-filter-btn').forEach(function(b) { b.classList.remove('active'); });
            filterBtn.classList.add('active');
          };
        })(fb));
        filters.appendChild(fb);
      }
      toolbarEl.appendChild(filters);
    }

    // Build cards
    for (var i = 0; i < this._agents.length; i++) {
      var agent = this._agents[i];
      containerEl.appendChild(this._createAgentCard(agent));
    }
  }

  _createAgentCard(agent) {
    var palette = PixelSprites.agentPalettes[agent.id];
    var bgColor = palette ? palette.shirt : '#004896';

    var card = document.createElement('div');
    card.className = 'agent-card-gws';
    card.dataset.agentId = agent.id;
    card.setAttribute('role', 'article');
    card.setAttribute('tabindex', '0');

    // Header with gradient
    var header = document.createElement('div');
    header.className = 'agent-card-header';
    header.style.background = 'linear-gradient(135deg, ' + bgColor + ' 0%, ' + this._lightenColor(bgColor, 30) + ' 100%)';

    var iconEl = document.createElement('div');
    iconEl.className = 'agent-card-icon';
    iconEl.style.background = 'rgba(255,255,255,0.2)';
    var cardIconKey = AgentIconMap[agent.id] || 'robot';
    iconEl.appendChild(svgFromTemplate(SvgIcons[cardIconKey]));
    header.appendChild(iconEl);

    var headerName = document.createElement('span');
    headerName.className = 'agent-card-header-name';
    headerName.textContent = I18n.agentName(agent.id);
    header.appendChild(headerName);

    var badge = document.createElement('span');
    badge.className = 'agent-card-badge';
    badge.textContent = I18n.t('agents.online');
    header.appendChild(badge);

    card.appendChild(header);

    // Body
    var body = document.createElement('div');
    body.className = 'agent-card-body';

    var org = document.createElement('div');
    org.className = 'agent-card-org';
    org.textContent = 'HD Smarter';
    body.appendChild(org);

    var desc = document.createElement('div');
    desc.className = 'agent-card-desc';
    desc.textContent = I18n.agentRole(agent.id);
    body.appendChild(desc);

    // Tags
    var tags = document.createElement('div');
    tags.className = 'agent-card-tags';
    var roleParts = I18n.agentRole(agent.id).split(/[,\u3001]/);
    for (var t = 0; t < Math.min(roleParts.length, 3); t++) {
      var tag = document.createElement('span');
      tag.className = 'agent-card-tag';
      tag.textContent = roleParts[t].trim();
      tags.appendChild(tag);
    }
    body.appendChild(tags);
    card.appendChild(body);

    // Footer with chat button
    var footer = document.createElement('div');
    footer.className = 'agent-card-footer';
    var chatBtn = document.createElement('button');
    chatBtn.className = 'agent-card-chat-btn';
    chatBtn.appendChild(svgFromTemplate(SvgIcons.chat));
    var chatLabel = document.createElement('span');
    chatLabel.textContent = I18n.t('agents.startChat');
    chatBtn.appendChild(chatLabel);
    chatBtn.addEventListener('click', (function(a) {
      return function(e) {
        e.stopPropagation();
        if (this.onAgentChat) this.onAgentChat(a);
      }.bind(this);
    }.bind(this))(agent));
    footer.appendChild(chatBtn);
    card.appendChild(footer);

    // Card click
    card.addEventListener('click', (function(a) {
      return function() {
        if (this.onAgentClick) this.onAgentClick(a);
      }.bind(this);
    }.bind(this))(agent));

    return card;
  }

  _filterAgentCards(containerEl, query) {
    query = query.toLowerCase().trim();
    var cards = containerEl.querySelectorAll('.agent-card-gws');
    cards.forEach(function(card) {
      var id = parseInt(card.dataset.agentId, 10);
      var name = I18n.agentName(id).toLowerCase();
      var role = I18n.agentRole(id).toLowerCase();
      var match = !query || name.includes(query) || role.includes(query);
      card.style.display = match ? '' : 'none';
    });
  }

  _lightenColor(hex, percent) {
    var num = parseInt(hex.replace('#', ''), 16);
    var r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    var g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
    var b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  updateAgentStatus(agentId, status) {
    var card = document.querySelector('.agent-card-gws[data-agent-id="' + agentId + '"]');
    if (card) {
      var badge = card.querySelector('.agent-card-badge');
      if (badge) {
        badge.textContent = I18n.t('agents.' + (status === 'active' ? 'active' : 'online'));
      }
    }
  }

  setActiveAgent(agentId) {
    var cards = document.querySelectorAll('.agent-card-gws');
    cards.forEach(function(c) {
      c.classList.toggle('active', c.dataset.agentId === String(agentId));
    });
  }
}
