/**
 * agent-sidebar.js — Enterprise agent sidebar with search/filter
 * 16 agents: icon, name, role, status dot
 * Click → switches chat panel to that agent
 * Search/filter by name or role
 */
class AgentSidebar {
  constructor() {
    this._el = document.getElementById('sidebar');
    this._listEl = document.getElementById('sidebar-agent-list');
    this._titleEl = document.getElementById('sidebar-title');
    this._searchEl = document.getElementById('sidebar-search');
    this._hamburgerBtn = document.getElementById('hamburger-btn');

    this._agents = [];
    this._activeId = null;
    this.onAgentSelect = null;

    // Search
    if (this._searchEl) {
      this._searchEl.addEventListener('input', () => this._filter());
    }

    // Hamburger toggle (tablet/mobile)
    if (this._hamburgerBtn) {
      this._hamburgerBtn.addEventListener('click', () => {
        this._el.classList.toggle('open');
        // Mobile: toggle mobile-active
        this._el.classList.toggle('mobile-active');
      });
    }

    // Close sidebar on outside click (tablet)
    document.addEventListener('click', (e) => {
      if (this._el.classList.contains('open') &&
          !this._el.contains(e.target) &&
          e.target !== this._hamburgerBtn) {
        this._el.classList.remove('open');
      }
    });

    I18n.onChange(() => this._updateTexts());
  }

  setAgents(agents) {
    this._agents = agents;
    this._build();
  }

  setActiveAgent(agentId) {
    this._activeId = agentId;
    var items = this._listEl.querySelectorAll('.sidebar-agent-item');
    items.forEach(function(li) {
      var isActive = li.dataset.agentId === String(agentId);
      li.classList.toggle('active', isActive);
      li.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  updateAgentStatus(agentId, status) {
    var li = this._listEl.querySelector('[data-agent-id="' + agentId + '"]');
    if (li) {
      var dot = li.querySelector('.agent-status-dot');
      if (dot) dot.className = 'agent-status-dot ' + status;
    }
  }

  _build() {
    this._listEl.textContent = '';
    if (this._titleEl) {
      this._titleEl.textContent = I18n.t('sidebar.title');
    }
    if (this._searchEl) {
      this._searchEl.placeholder = I18n.t('sidebar.search');
      this._searchEl.setAttribute('aria-label', I18n.t('sidebar.search'));
    }

    for (var i = 0; i < this._agents.length; i++) {
      var agent = this._agents[i];
      var li = document.createElement('li');
      li.className = 'sidebar-agent-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.agentId = agent.id;

      // Color dot
      var dot = document.createElement('span');
      dot.className = 'agent-color-dot';
      var palette = PixelSprites.agentPalettes[agent.id];
      dot.style.backgroundColor = palette ? palette.shirt : '#888';

      // Info
      var info = document.createElement('div');
      info.className = 'sidebar-agent-info';
      var name = document.createElement('div');
      name.className = 'sidebar-agent-name';
      name.textContent = I18n.agentName(agent.id);
      var role = document.createElement('div');
      role.className = 'sidebar-agent-role';
      role.textContent = I18n.agentRole(agent.id);
      info.appendChild(name);
      info.appendChild(role);

      // Status dot
      var statusDot = document.createElement('span');
      statusDot.className = 'agent-status-dot ' + (agent.realStatus || 'idle');

      li.appendChild(dot);
      li.appendChild(info);
      li.appendChild(statusDot);

      // Click handler
      (function(a) {
        li.addEventListener('click', function() {
          this.setActiveAgent(a.id);
          if (this.onAgentSelect) this.onAgentSelect(a);
          // Auto-close sidebar on tablet
          this._el.classList.remove('open');
        }.bind(this));
      }.bind(this))(agent);

      this._listEl.appendChild(li);
    }
  }

  _filter() {
    var query = this._searchEl.value.toLowerCase().trim();
    var items = this._listEl.querySelectorAll('.sidebar-agent-item');
    items.forEach(function(li) {
      var id = parseInt(li.dataset.agentId, 10);
      var name = I18n.agentName(id).toLowerCase();
      var role = I18n.agentRole(id).toLowerCase();
      var match = !query || name.includes(query) || role.includes(query);
      li.classList.toggle('hidden', !match);
    });
  }

  _updateTexts() {
    if (this._titleEl) {
      this._titleEl.textContent = I18n.t('sidebar.title');
    }
    if (this._searchEl) {
      this._searchEl.placeholder = I18n.t('sidebar.search');
      this._searchEl.setAttribute('aria-label', I18n.t('sidebar.search'));
    }
    // Update each item's text
    var items = this._listEl.querySelectorAll('.sidebar-agent-item');
    items.forEach(function(li) {
      var id = parseInt(li.dataset.agentId, 10);
      var nameEl = li.querySelector('.sidebar-agent-name');
      var roleEl = li.querySelector('.sidebar-agent-role');
      if (nameEl) nameEl.textContent = I18n.agentName(id);
      if (roleEl) roleEl.textContent = I18n.agentRole(id);
    });
  }
}
