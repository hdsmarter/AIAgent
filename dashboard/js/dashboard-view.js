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

    // ── Stat Cards ──────────────────────────────
    var stats = document.createElement('div');
    stats.className = 'dash-stats';

    this._statCards = {};
    var statItems = [
      { id: 'agents', icon: SvgIcons.robot, labelKey: 'dash.agentCount', value: '16', bg: 'var(--accent)' },
      { id: 'gateway', icon: SvgIcons.link, labelKey: 'dash.gatewayStatus', value: '--', bg: 'var(--green)' },
      { id: 'telegram', icon: SvgIcons.chat, labelKey: 'dash.telegramStatus', value: '--', bg: '#0088cc' },
      { id: 'line', icon: SvgIcons.chat, labelKey: 'dash.lineStatus', value: '--', bg: '#06c755' },
    ];

    for (var s = 0; s < statItems.length; s++) {
      var si = statItems[s];
      var card = document.createElement('div');
      card.className = 'dash-stat-card';

      var iconEl = document.createElement('div');
      iconEl.className = 'dash-stat-icon';
      iconEl.style.background = si.bg;
      iconEl.appendChild(svgFromTemplate(si.icon));
      card.appendChild(iconEl);

      var info = document.createElement('div');
      info.className = 'dash-stat-info';
      var val = document.createElement('div');
      val.className = 'dash-stat-value';
      val.textContent = si.value;
      var label = document.createElement('div');
      label.className = 'dash-stat-label';
      label.textContent = I18n.t(si.labelKey);
      info.appendChild(val);
      info.appendChild(label);
      card.appendChild(info);

      this._statCards[si.id] = { cardEl: card, valueEl: val, labelEl: label };
      stats.appendChild(card);
    }
    this._el.appendChild(stats);

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
    if (!data) return;

    // Gateway
    if (data.gateway && this._statCards.gateway) {
      var gwOk = data.gateway.status === 'running' || data.gateway.status === 'ok' || data.gateway.ok === true;
      this._statCards.gateway.valueEl.textContent = gwOk ? I18n.t('app.gwRunning') : I18n.t('app.gwOffline');
      this._statCards.gateway.valueEl.style.color = gwOk ? 'var(--green)' : 'var(--red)';
    }

    // Channels
    var channels = data.channels;
    if (channels) {
      // Telegram
      var tgOk = null;
      if (channels.telegram) {
        tgOk = channels.telegram.running !== undefined ? channels.telegram.running :
               (channels.telegram.status === 'running' || channels.telegram.status === 'ok');
      }
      if (channels.channels && channels.channels.telegram) {
        tgOk = channels.channels.telegram.running;
      }
      if (this._statCards.telegram) {
        this._statCards.telegram.valueEl.textContent = tgOk ? 'Running' : tgOk === false ? 'Off' : '--';
        this._statCards.telegram.valueEl.style.color = tgOk ? 'var(--green)' : tgOk === false ? 'var(--red)' : '';
      }

      // LINE
      var lineOk = null;
      if (channels.line) {
        lineOk = channels.line.running !== undefined ? channels.line.running :
                 (channels.line.status === 'running' || channels.line.status === 'ok');
      }
      if (channels.channels && channels.channels.line) {
        lineOk = channels.channels.line.running;
      }
      if (this._statCards.line) {
        this._statCards.line.valueEl.textContent = lineOk ? 'Running' : lineOk === false ? 'Off' : '--';
        this._statCards.line.valueEl.style.color = lineOk ? 'var(--green)' : lineOk === false ? 'var(--red)' : '';
      }
    }
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

  _rebuild() {
    this._build();
    if (this._statusData) this.updateStatus(this._statusData);
  }
}
