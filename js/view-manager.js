/**
 * view-manager.js — Workspace ↔ Office Scene toggle
 * Default: Workspace (agent card grid)
 * Secondary: Office Scene (pixel-art canvas, lazy-init)
 */
class ViewManager {
  constructor(mainEl) {
    this._main = mainEl;
    this._workspaceEl = document.getElementById('workspace-view');
    this._officeEl = document.getElementById('office-view');
    this._gridEl = document.getElementById('workspace-grid');
    this._toggleBtn = document.getElementById('view-toggle-btn');

    this._view = 'workspace'; // 'workspace' | 'office'
    this._officeScene = null;
    this._agents = [];
    this._lastMessages = {}; // agentId -> string
    this.onAgentClick = null;

    if (this._toggleBtn) {
      this._toggleBtn.addEventListener('click', () => this.toggle());
    }

    I18n.onChange(() => this._updateCards());
  }

  get view() { return this._view; }

  setAgents(agents) {
    this._agents = agents;
    this._buildCards();
  }

  showWorkspace() {
    this._view = 'workspace';
    this._workspaceEl.style.display = '';
    this._officeEl.style.display = 'none';
    if (this._toggleBtn) {
      this._toggleBtn.textContent = '\uD83C\uDFE2';
      this._toggleBtn.title = I18n.t('view.office');
    }
  }

  showOfficeScene(officeScene) {
    this._view = 'office';
    this._workspaceEl.style.display = 'none';
    this._officeEl.style.display = '';
    if (this._toggleBtn) {
      this._toggleBtn.textContent = '\uD83D\uDCCA';
      this._toggleBtn.title = I18n.t('view.workspace');
    }

    if (officeScene && !this._officeScene) {
      this._officeScene = officeScene;
      this._officeScene.resize();
    }
  }

  toggle() {
    if (this._view === 'workspace') {
      this.showOfficeScene(this._officeScene);
    } else {
      this.showWorkspace();
    }
  }

  setOfficeScene(scene) {
    this._officeScene = scene;
  }

  updateLastMessage(agentId, text) {
    this._lastMessages[agentId] = text;
    const card = this._gridEl.querySelector('[data-agent-id="' + agentId + '"]');
    if (card) {
      const msgEl = card.querySelector('.workspace-card-last-msg');
      if (msgEl) {
        msgEl.textContent = text.length > 40 ? text.slice(0, 40) + '\u2026' : text;
      }
    }
  }

  updateAgentStatus(agentId, status) {
    const card = this._gridEl.querySelector('[data-agent-id="' + agentId + '"]');
    if (card) {
      const dot = card.querySelector('.agent-status-dot');
      if (dot) {
        dot.className = 'agent-status-dot ' + status;
      }
      const label = card.querySelector('.workspace-card-status-text');
      if (label) {
        label.textContent = I18n.t('status.' + status);
      }
    }
  }

  setActiveAgent(agentId) {
    const cards = this._gridEl.querySelectorAll('.workspace-card');
    cards.forEach(c => c.classList.toggle('active', c.dataset.agentId === String(agentId)));
  }

  _buildCards() {
    this._gridEl.textContent = '';
    var icons = [
      '\uD83D\uDCCA','\uD83D\uDCE2','\uD83D\uDCB0','\uD83D\uDC65','\uD83D\uDE9B','\uD83D\uDDA5\uFE0F','\uD83D\uDCCB','\uD83C\uDFA7',
      '\u2696\uFE0F','\uD83C\uDFAF','\uD83C\uDFA8','\u270F\uFE0F','\uD83E\uDD1D','\u2705','\uD83D\uDD12','\uD83D\uDC54'
    ];

    for (var i = 0; i < this._agents.length; i++) {
      var agent = this._agents[i];
      var palette = PixelSprites.agentPalettes[agent.id];
      var bgColor = palette ? palette.shirt : '#004896';

      var card = document.createElement('div');
      card.className = 'workspace-card';
      card.dataset.agentId = agent.id;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', I18n.agentName(agent.id));

      // Header
      var header = document.createElement('div');
      header.className = 'workspace-card-header';

      var iconEl = document.createElement('div');
      iconEl.className = 'workspace-card-icon';
      iconEl.style.background = bgColor;
      iconEl.textContent = icons[agent.id] || '\uD83E\uDD16';

      var textWrap = document.createElement('div');
      var nameEl = document.createElement('div');
      nameEl.className = 'workspace-card-name';
      nameEl.textContent = I18n.agentName(agent.id);
      var roleEl = document.createElement('div');
      roleEl.className = 'workspace-card-role';
      roleEl.textContent = I18n.agentRole(agent.id);
      textWrap.appendChild(nameEl);
      textWrap.appendChild(roleEl);

      header.appendChild(iconEl);
      header.appendChild(textWrap);
      card.appendChild(header);

      // Status
      var statusWrap = document.createElement('div');
      statusWrap.className = 'workspace-card-status';
      var dot = document.createElement('span');
      dot.className = 'agent-status-dot ' + (agent.realStatus || 'idle');
      var statusText = document.createElement('span');
      statusText.className = 'workspace-card-status-text';
      statusText.textContent = I18n.t('status.' + (agent.realStatus || 'idle'));
      statusWrap.appendChild(dot);
      statusWrap.appendChild(statusText);
      card.appendChild(statusWrap);

      // Last message
      var lastMsg = document.createElement('div');
      lastMsg.className = 'workspace-card-last-msg';
      lastMsg.textContent = this._lastMessages[agent.id] || I18n.t('workspace.noChat');
      card.appendChild(lastMsg);

      // Click handler (closure)
      (function(a) {
        card.addEventListener('click', function() {
          if (this.onAgentClick) this.onAgentClick(a);
        }.bind(this));
        card.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (this.onAgentClick) this.onAgentClick(a);
          }
        }.bind(this));
      }.bind(this))(agent);

      this._gridEl.appendChild(card);
    }
  }

  _updateCards() {
    var cards = this._gridEl.querySelectorAll('.workspace-card');
    cards.forEach(function(card) {
      var id = parseInt(card.dataset.agentId, 10);
      var nameEl = card.querySelector('.workspace-card-name');
      var roleEl = card.querySelector('.workspace-card-role');
      if (nameEl) nameEl.textContent = I18n.agentName(id);
      if (roleEl) roleEl.textContent = I18n.agentRole(id);
    });
    if (this._toggleBtn) {
      this._toggleBtn.title = this._view === 'workspace'
        ? I18n.t('view.office')
        : I18n.t('view.workspace');
    }
  }
}
