/**
 * dashboard-view.js — GWS-style welcome dashboard
 * Welcome banner with greeting + clock, quick actions, stat cards,
 * recent conversations + system activity panels
 */
class DashboardView {
  constructor(containerEl) {
    this._el = containerEl;
    this._clockInterval = null;
    this.onQuickAction = null;
    this._statusData = null;
  }

  init() {
    this._build();
    this._startClock();
    I18n.onChange(() => this._rebuild());
  }

  _build() {
    this._el.textContent = '';

    // ── Welcome Banner ──────────────────────────
    var banner = document.createElement('div');
    banner.className = 'dash-welcome';

    var greeting = document.createElement('div');
    greeting.className = 'dash-welcome-greeting';
    this._greetingEl = greeting;
    this._updateGreeting();
    banner.appendChild(greeting);

    var sub = document.createElement('div');
    sub.className = 'dash-welcome-sub';
    sub.textContent = I18n.t('dash.welcomeSub');
    this._subEl = sub;
    banner.appendChild(sub);

    var timeWrap = document.createElement('div');
    timeWrap.className = 'dash-welcome-time';
    this._clockEl = document.createElement('div');
    this._clockEl.className = 'dash-welcome-clock';
    this._dateEl = document.createElement('div');
    this._dateEl.className = 'dash-welcome-date';
    timeWrap.appendChild(this._clockEl);
    timeWrap.appendChild(this._dateEl);
    banner.appendChild(timeWrap);

    this._el.appendChild(banner);

    // ── Quick Actions ───────────────────────────
    var actions = document.createElement('div');
    actions.className = 'dash-quick-actions';

    var quickItems = [
      { id: 'chat', icon: SvgIcons.chat, labelKey: 'dash.startChat', color: 'var(--accent)' },
      { id: 'agents', icon: SvgIcons.robot, labelKey: 'dash.viewAgents', color: 'var(--brand-accent)' },
      { id: 'office', icon: SvgIcons.building, labelKey: 'dash.officeScene', color: 'var(--green)' },
      { id: 'settings', icon: SvgIcons.link, labelKey: 'dash.connSettings', color: 'var(--yellow)' },
    ];

    for (var i = 0; i < quickItems.length; i++) {
      var q = quickItems[i];
      var btn = document.createElement('button');
      btn.className = 'dash-quick-btn';
      btn.appendChild(svgFromTemplate(q.icon));
      var lbl = document.createElement('span');
      lbl.textContent = I18n.t(q.labelKey);
      btn.appendChild(lbl);
      btn.addEventListener('click', (function(actionId) {
        return function() {
          if (this.onQuickAction) this.onQuickAction(actionId);
        }.bind(this);
      }.bind(this))(q.id));
      actions.appendChild(btn);
    }
    this._el.appendChild(actions);

    // ── Agent Carousel ──────────────────────────
    this._carouselEl = document.createElement('div');
    this._carouselEl.className = 'dash-carousel';
    this._el.appendChild(this._carouselEl);
    this._renderCarousel();

    // ── Panels ──────────────────────────────────
    var panels = document.createElement('div');
    panels.className = 'dash-panels';

    // Recent conversations
    var recentPanel = document.createElement('div');
    recentPanel.className = 'dash-panel';
    var recentHeader = document.createElement('div');
    recentHeader.className = 'dash-panel-header';
    recentHeader.textContent = I18n.t('dash.recentChats');
    this._recentHeaderEl = recentHeader;
    recentPanel.appendChild(recentHeader);
    this._recentBody = document.createElement('div');
    this._recentBody.className = 'dash-panel-body';
    var emptyRecent = document.createElement('div');
    emptyRecent.className = 'dash-panel-empty';
    emptyRecent.textContent = I18n.t('dash.noRecentChats');
    this._recentBody.appendChild(emptyRecent);
    recentPanel.appendChild(this._recentBody);
    panels.appendChild(recentPanel);

    // System activity
    var activityPanel = document.createElement('div');
    activityPanel.className = 'dash-panel';
    var activityHeader = document.createElement('div');
    activityHeader.className = 'dash-panel-header';
    activityHeader.textContent = I18n.t('dash.systemActivity');
    this._activityHeaderEl = activityHeader;
    activityPanel.appendChild(activityHeader);
    this._activityBody = document.createElement('div');
    this._activityBody.className = 'dash-panel-body';
    var emptyActivity = document.createElement('div');
    emptyActivity.className = 'dash-panel-empty';
    emptyActivity.textContent = I18n.t('dash.noActivity');
    this._activityBody.appendChild(emptyActivity);
    activityPanel.appendChild(this._activityBody);
    panels.appendChild(activityPanel);

    this._el.appendChild(panels);
  }

  _updateGreeting() {
    if (!this._greetingEl) return;
    var h = new Date().getHours();
    var key = h < 12 ? 'dash.morning' : h < 18 ? 'dash.afternoon' : 'dash.evening';
    this._greetingEl.textContent = I18n.t(key) + ' Admin';
  }

  _startClock() {
    var self = this;
    function tick() {
      var now = new Date();
      if (self._clockEl) {
        var hh = String(now.getHours()).padStart(2, '0');
        var mm = String(now.getMinutes()).padStart(2, '0');
        var ss = String(now.getSeconds()).padStart(2, '0');
        self._clockEl.textContent = hh + ':' + mm + ':' + ss;
      }
      if (self._dateEl) {
        self._dateEl.textContent = now.toLocaleDateString(I18n.lang === 'en' ? 'en-US' : 'zh-TW', {
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
        });
      }
    }
    tick();
    this._clockInterval = setInterval(tick, 1000);
  }

  updateStatus(data) {
    this._statusData = data;
  }

  addRecentChat(agentId, text, time) {
    // Remove empty placeholder
    var empty = this._recentBody.querySelector('.dash-panel-empty');
    if (empty) empty.remove();

    var item = document.createElement('div');
    item.className = 'dash-panel-item';
    item.dataset.agentId = agentId;

    var palette = PixelSprites.agentPalettes[agentId];
    var dot = document.createElement('span');
    dot.className = 'dash-panel-item-dot';
    dot.style.background = palette ? palette.shirt : 'var(--accent)';
    item.appendChild(dot);

    var textEl = document.createElement('span');
    textEl.className = 'dash-panel-item-text';
    textEl.textContent = I18n.agentName(agentId) + ': ' + (text.length > 40 ? text.slice(0, 40) + '\u2026' : text);
    item.appendChild(textEl);

    var timeEl = document.createElement('span');
    timeEl.className = 'dash-panel-item-time';
    var t = time || new Date();
    timeEl.textContent = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    item.appendChild(timeEl);

    item.addEventListener('click', function() {
      if (this.onQuickAction) this.onQuickAction('chat-agent', { agentId: agentId });
    }.bind(this));

    // Prepend (newest first)
    this._recentBody.insertBefore(item, this._recentBody.firstChild);

    // Keep max 10
    while (this._recentBody.children.length > 10) {
      this._recentBody.removeChild(this._recentBody.lastChild);
    }
  }

  addActivity(text) {
    var empty = this._activityBody.querySelector('.dash-panel-empty');
    if (empty) empty.remove();

    var item = document.createElement('div');
    item.className = 'dash-panel-item';
    var dot = document.createElement('span');
    dot.className = 'dash-panel-item-dot';
    dot.style.background = 'var(--accent-light)';
    item.appendChild(dot);

    var textEl = document.createElement('span');
    textEl.className = 'dash-panel-item-text';
    textEl.textContent = text;
    item.appendChild(textEl);

    var timeEl = document.createElement('span');
    timeEl.className = 'dash-panel-item-time';
    var now = new Date();
    timeEl.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    item.appendChild(timeEl);

    this._activityBody.insertBefore(item, this._activityBody.firstChild);
    while (this._activityBody.children.length > 10) {
      this._activityBody.removeChild(this._activityBody.lastChild);
    }
  }

  setAgents(agents) {
    this._agents = agents;
    if (this._carouselEl) this._renderCarousel();
  }

  _renderCarousel() {
    if (!this._carouselEl) return;
    this._carouselEl.textContent = '';

    // Header row: title + nav arrows
    var header = document.createElement('div');
    header.className = 'dash-carousel-header';
    var title = document.createElement('span');
    title.className = 'dash-carousel-title';
    title.textContent = I18n.t('dash.agentCount') || 'AI Agents';
    header.appendChild(title);

    var navWrap = document.createElement('div');
    navWrap.className = 'dash-carousel-nav';
    var btnL = document.createElement('button');
    btnL.className = 'dash-carousel-arrow';
    btnL.textContent = '\u2190';
    btnL.setAttribute('aria-label', 'Scroll left');
    var btnR = document.createElement('button');
    btnR.className = 'dash-carousel-arrow';
    btnR.textContent = '\u2192';
    btnR.setAttribute('aria-label', 'Scroll right');
    navWrap.appendChild(btnL);
    navWrap.appendChild(btnR);
    header.appendChild(navWrap);
    this._carouselEl.appendChild(header);

    // Track
    var track = document.createElement('div');
    track.className = 'dash-carousel-track';
    this._carouselTrack = track;

    var agents = this._agents || [];
    for (var i = 0; i < agents.length; i++) {
      track.appendChild(this._createCarouselCard(agents[i]));
    }
    this._carouselEl.appendChild(track);

    // Arrow scroll
    btnL.addEventListener('click', function() { track.scrollBy({ left: -240, behavior: 'smooth' }); });
    btnR.addEventListener('click', function() { track.scrollBy({ left: 240, behavior: 'smooth' }); });
  }

  _createCarouselCard(agent) {
    var palette = PixelSprites.agentPalettes[agent.id];
    var color = palette ? palette.shirt : '#004896';
    var lighten = this._lightenColor(color, 30);

    var card = document.createElement('div');
    card.className = 'dash-carousel-card';
    card.setAttribute('role', 'article');
    card.setAttribute('tabindex', '0');

    // Gradient header
    var hdr = document.createElement('div');
    hdr.className = 'dash-carousel-card-header';
    hdr.style.background = 'linear-gradient(135deg, ' + color + ' 0%, ' + lighten + ' 100%)';
    var iconKey = AgentIconMap[agent.id] || 'robot';
    var icon = svgFromTemplate(SvgIcons[iconKey]);
    hdr.appendChild(icon);
    card.appendChild(hdr);

    // Body
    var body = document.createElement('div');
    body.className = 'dash-carousel-card-body';
    var name = document.createElement('div');
    name.className = 'dash-carousel-card-name';
    name.textContent = I18n.agentName(agent.id);
    body.appendChild(name);

    var role = document.createElement('div');
    role.className = 'dash-carousel-card-role';
    role.textContent = I18n.agentRole(agent.id);
    body.appendChild(role);

    var chatBtn = document.createElement('button');
    chatBtn.className = 'dash-carousel-chat-btn';
    chatBtn.textContent = I18n.t('agents.startChat') || '\u958B\u59CB\u5C0D\u8A71';
    chatBtn.addEventListener('click', (function(id) {
      return function(e) {
        e.stopPropagation();
        if (this.onQuickAction) this.onQuickAction('chat-agent', { agentId: id });
      }.bind(this);
    }.bind(this))(agent.id));
    body.appendChild(chatBtn);

    card.appendChild(body);

    // Card click → also open chat
    card.addEventListener('click', (function(id) {
      return function() {
        if (this.onQuickAction) this.onQuickAction('chat-agent', { agentId: id });
      }.bind(this);
    }.bind(this))(agent.id));

    return card;
  }

  _lightenColor(hex, percent) {
    var num = parseInt(hex.replace('#', ''), 16);
    var r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    var g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
    var b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  _rebuild() {
    this._build();
    if (this._statusData) this.updateStatus(this._statusData);
  }
}
