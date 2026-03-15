/**
 * nav-sidebar.js — Collapsible navigation sidebar (GWS style)
 * SVG icons, submenu expand/collapse, active state, collapsed mode
 * Replaces agent-sidebar.js
 */

/**
 * Shared SVG icon library — solid color, fill="currentColor"
 * All icons are trusted static templates — safe for DOM insertion.
 */
var SvgIcons = {
  home:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2L2 9h3v8h4v-5h2v5h4V9h3L10 2z"/></svg>',
  robot:    '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1a1 1 0 011 1v1h3a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h3V2a1 1 0 011-1zM7.5 8a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM8 13h4a1 1 0 010 2H8a1 1 0 010-2z"/></svg>',
  list:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 5h14a1 1 0 010 2H3a1 1 0 010-2z"/></svg>',
  chat:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H7l-4 4V4z"/></svg>',
  building: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a1 1 0 011-1h10a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V3zm2 1v2h3V4H6zm5 0v2h3V4h-3zM6 8v2h3V8H6zm5 0v2h3V8h-3zM6 12v2h3v-2H6zm5 0v2h3v-2h-3z"/></svg>',
  gear:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M11.5 2.1a1.5 1.5 0 00-3 0l-.2 1.1a6 6 0 00-1.6.9l-1-.4a1.5 1.5 0 00-2 .8l-.5.9a1.5 1.5 0 00.5 2l.8.7a6 6 0 000 1.8l-.8.7a1.5 1.5 0 00-.5 2l.5.9a1.5 1.5 0 002 .8l1-.4c.5.4 1 .7 1.6.9l.2 1.1a1.5 1.5 0 003 0l.2-1.1a6 6 0 001.6-.9l1 .4a1.5 1.5 0 002-.8l.5-.9a1.5 1.5 0 00-.5-2l-.8-.7a6 6 0 000-1.8l.8-.7a1.5 1.5 0 00.5-2l-.5-.9a1.5 1.5 0 00-2-.8l-1 .4a6 6 0 00-1.6-.9l-.2-1.1zM10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/></svg>',
  link:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M12.6 7.4a4 4 0 010 5.6l-2 2a4 4 0 01-5.6-5.6l1-1a1 1 0 011.4 1.4l-1 1a2 2 0 002.8 2.8l2-2a2 2 0 000-2.8 1 1 0 011.4-1.4zm-5.2 5.2a4 4 0 010-5.6l2-2a4 4 0 015.6 5.6l-1 1a1 1 0 01-1.4-1.4l1-1a2 2 0 00-2.8-2.8l-2 2a2 2 0 000 2.8 1 1 0 01-1.4 1.4z"/></svg>',
  globe:    '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 2.1A6 6 0 004.1 9H7c.1-1.8.4-3.5 1-4.9h1zM4.1 11H7c.1 1.8.4 3.5 1 4.9A6 6 0 014.1 11zM9 11v5c-.8-1.3-1.4-3-1.5-5H9zm2 0h1.5c-.1 2-.7 3.7-1.5 5v-5zm0-2V4c.8 1.3 1.4 3 1.5 5H11zM9 9H7.5C7.6 7 8.2 5.3 9 4v5zm4 2h2.9A6 6 0 0112 15.9c.6-1.4.9-3.1 1-4.9zm0-2c-.1-1.8-.4-3.5-1-4.9A6 6 0 0115.9 9H13z"/></svg>',
  palette:  '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 000 16c.6 0 1-.4 1-1 0-.3-.1-.5-.3-.7-.2-.2-.3-.5-.3-.8 0-.6.4-1 1-1h1.2A4.4 4.4 0 0018 10c0-4.4-3.6-8-8-8zM5.5 10a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm2-4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm2 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>',
  shield:   '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1l-7 3v5c0 4.5 3 8.7 7 10 4-1.3 7-5.5 7-10V4l-7-3zm-1 14l-3.5-3.5 1.4-1.4L9 12.2l4.6-4.6 1.4 1.4L9 15z"/></svg>',
  user:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a4 4 0 110 8 4 4 0 010-8zM4 16c0-3.3 2.7-6 6-6s6 2.7 6 6H4z"/></svg>',
  logout:   '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a2 2 0 012-2h5a1 1 0 010 2H5v12h5a1 1 0 010 2H5a2 2 0 01-2-2V4zm10.3 2.3a1 1 0 011.4 0l3 3a1 1 0 010 1.4l-3 3a1 1 0 01-1.4-1.4L14.6 11H8a1 1 0 010-2h6.6l-1.3-1.3a1 1 0 010-1.4z"/></svg>',
  chevron:  '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5V3z"/></svg>',
  chart:    '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 17V5h3v12H2zm5 0V2h3v15H7zm5 0V8h3v9h-3zm-10 1h16a1 1 0 010 2H2a1 1 0 010-2z"/></svg>',
  download: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v7.6l2.3-2.3a1 1 0 011.4 1.4l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L9 11.6V4a1 1 0 011-1zM4 15a1 1 0 011 1v1h10v-1a1 1 0 012 0v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1a1 1 0 011-1z"/></svg>',
  clip:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M15.6 3.4a3 3 0 00-4.2 0L5.5 9.3a4.5 4.5 0 006.4 6.4l5.8-5.9a1 1 0 011.4 1.4l-5.8 5.9a6.5 6.5 0 01-9.2-9.2l5.9-5.9a5 5 0 017 7L11.2 15a3 3 0 01-4.2-4.2l5.5-5.5a1 1 0 011.4 1.4l-5.5 5.5a1 1 0 001.4 1.4L15.6 7.6a3 3 0 000-4.2z"/></svg>',
  copy:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 00-2 2v1H4a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2v-1h1a2 2 0 002-2V4a2 2 0 00-2-2H7zm0 2h8v9h-1V7a2 2 0 00-2-2H7V4zM4 7h8v9H4V7z"/></svg>',

  // ── Per-agent unique icons (16 roles) ──────
  agentChart:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h14a1 1 0 001-1v-1h-4V9h-3v7H8V6H5v10H3V4h14V3H3zm12 7v5h2v-5h-2zM6 7v9h1V7H6z"/></svg>',
  agentMegaphone: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M15 3a1 1 0 011 1v12a1 1 0 01-1.6.8L10 13H5a2 2 0 01-2-2V9a2 2 0 012-2h5l4.4-3.8A1 1 0 0115 3zm-2 3.5L10.4 9H5v2h5.4L13 13.5V6.5zM8 14v2a1 1 0 001 1h1a1 1 0 001-1v-1.5l-1-.5H8z"/></svg>',
  agentCoin:      '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 2a6 6 0 110 12 6 6 0 010-12zm-.5 2v1.1A2.5 2.5 0 007 9.5a1 1 0 002 0 .5.5 0 01.5-.5h1a.5.5 0 010 1H9a2.5 2.5 0 000 5h.5V16h1v-1.1a2.5 2.5 0 002.5-2.4 1 1 0 00-2 0 .5.5 0 01-.5.5H9.5a.5.5 0 010-1H11a2.5 2.5 0 000-5h-.5V6h-1z"/></svg>',
  agentPeople:    '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zm6 0a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM3 15c0-2.2 1.8-4 4-4 1.2 0 2.3.5 3 1.4.7-.9 1.8-1.4 3-1.4 2.2 0 4 1.8 4 4v1H3v-1z"/></svg>',
  agentTruck:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a1 1 0 011-1h8a1 1 0 011 1v7h2V9a1 1 0 011-1h2l2 3v4h-1a2 2 0 01-4 0H7a2 2 0 01-4 0H2V5zm3 10a1 1 0 100 2 1 1 0 000-2zm11 0a1 1 0 100 2 1 1 0 000-2zM14 10v2h3l-1.3-2H14z"/></svg>',
  agentLock:      '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a4 4 0 00-4 4v2H5a1 1 0 00-1 1v8a1 1 0 001 1h10a1 1 0 001-1V9a1 1 0 00-1-1h-1V6a4 4 0 00-4-4zm-2 4a2 2 0 114 0v2H8V6zm2 6a1.5 1.5 0 011 2.6V16h-2v-1.4A1.5 1.5 0 0110 12z"/></svg>',
  agentClipboard: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M8 2a1 1 0 00-1 1H5a1 1 0 00-1 1v13a1 1 0 001 1h10a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1-1H8zm0 2h4v1H8V4zM7 8h6a1 1 0 010 2H7a1 1 0 010-2zm0 4h4a1 1 0 010 2H7a1 1 0 010-2z"/></svg>',
  agentHeadset:   '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a7 7 0 00-7 7v4a3 3 0 003 3h1v-6H5v-1a5 5 0 0110 0v1h-2v6h1.5l-.5 1H9a1 1 0 000 2h4a3 3 0 003-3V9a7 7 0 00-7-7zM5 11v3h1v-3H5zm9 0v3h1v-3h-1z"/></svg>',
  agentScale:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1h4l2 6h-1a3 3 0 01-6 0h-1V4.7l-4.3 2L7 12H6a3 3 0 01-6 0H0L2 6h4l3.3-1.5A1 1 0 0110 3V2zM3 7L1.8 10h2.4L3 7zm10 0l-1.2 3h2.4L13 7z"/></svg>',
  agentBulb:      '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 00-3 9v2a1 1 0 001 1h4a1 1 0 001-1v-2a5 5 0 00-3-9zm0 2a3 3 0 012.2 5.1l-.7.6V12H8.5V9.7l-.7-.6A3 3 0 0110 4zM8 15h4v1a2 2 0 01-4 0v-1z"/></svg>',
  agentCursor:    '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 2l11 8h-5l3 6-2 1-3-6-4 3V2zm2 3.5v5.8l2.2-1.6h3.6L6 5.5z"/></svg>',
  agentPen:       '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M14.7 3.3a2.4 2.4 0 013.4 3.4L8 16.8 3 18l1.2-5L14.7 3.3zM13 6l1.4-1.4 1 1L14 7l-1-1zM5.8 13.2l6-6 1 1-6 6-.5.5L5 15l.3-1.3.5-.5z"/></svg>',
  agentBriefcase: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 4V3a1 1 0 011-1h4a1 1 0 011 1v1h4a1 1 0 011 1v4h-3v-1a1 1 0 00-2 0v1H7V8a1 1 0 00-2 0v1H2V5a1 1 0 011-1h4zm1 0h4V3H8v1zM2 11h3v1a1 1 0 002 0v-1h6v1a1 1 0 002 0v-1h3v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5z"/></svg>',
  agentBug:       '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a3 3 0 00-3 3H5a1 1 0 000 2h1.1A5 5 0 006 8H3a1 1 0 000 2h3v1H3a1 1 0 000 2h3c.2 1.1.7 2 1.3 2.7L5 17.3a1 1 0 001.4 1.4L8.5 16a4 4 0 003 0l2.1 2.7a1 1 0 001.4-1.4l-2.3-1.6c.6-.7 1.1-1.6 1.3-2.7h3a1 1 0 000-2h-3v-1h3a1 1 0 000-2h-3a5 5 0 00-.1-1H15a1 1 0 000-2h-2a3 3 0 00-3-3zm0 2a1 1 0 011 1H9a1 1 0 011-1zm-2 4h4a3 3 0 010 6H8a3 3 0 010-6z"/></svg>',
  agentEye:       '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 4C5 4 1.7 8.3 1 10c.7 1.7 4 6 9 6s8.3-4.3 9-6c-.7-1.7-4-6-9-6zm0 2a4 4 0 110 8 4 4 0 010-8zm0 2a2 2 0 100 4 2 2 0 000-4z"/></svg>',
  agentCrown:     '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 14l2-8 3 4 3-6 3 6 3-4 2 8H2zm1.5 1h13a1 1 0 010 2h-13a1 1 0 010-2z"/></svg>',
  agentHandshake: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 8l3-3 2.5 1L10 4l2.5 2L15 5l3 3-2 2-1.5-.5L12 12l-2-1-2 1-2.5-2.5L4 10 2 8zm4 5l2 2 2-1 2 1 2-2 1.5 1L12 17H8l-3.5-3L6 13z"/></svg>',
};

/**
 * Maps agent ID → SvgIcons key for per-agent unique icons
 */
var AgentIconMap = {
  0: 'agentChart',      // 數據分析師
  1: 'agentMegaphone',  // 行銷策略師
  2: 'agentCoin',       // 財務顧問
  3: 'agentPeople',     // 人力資源專員
  4: 'agentTruck',      // 供應鏈管理師
  5: 'agentLock',       // 資訊安全專家
  6: 'agentClipboard',  // 專案經理
  7: 'agentHeadset',    // 客服主管
  8: 'agentScale',      // 法務顧問
  9: 'agentBulb',       // 產品設計師
  10: 'agentCursor',    // UX 研究員
  11: 'agentPen',       // 內容策略師
  12: 'agentBriefcase', // 業務開發經理
  13: 'agentBug',       // 品質保證工程師
  14: 'agentEye',       // 資安分析師
  15: 'agentCrown',     // 人資總監
  16: 'agentHandshake', // PUE 業務助理
};

/**
 * Create a DOM element from a trusted SVG template string.
 * Only use with hardcoded SvgIcons values — never with user input.
 */
function svgFromTemplate(svgString) {
  var t = document.createElement('template');
  t.innerHTML = svgString;
  return t.content.firstChild.cloneNode(true);
}

class NavSidebar {
  constructor() {
    this._el = document.getElementById('nav-sidebar');
    this._menuEl = document.getElementById('nav-sidebar-menu');
    this._footerEl = document.getElementById('nav-sidebar-footer');
    this._hamburgerBtn = document.getElementById('nav-hamburger');
    this._appShell = document.getElementById('app-shell');

    this._collapsed = false;
    this._activeRoute = 'dashboard';
    this.onNavigate = null;

    this._menuConfig = [
      { id: 'dashboard', icon: 'home', labelKey: 'nav.dashboard', route: 'dashboard' },
      { id: 'ai-group', icon: 'robot', labelKey: 'nav.aiAssistant', children: [
        { id: 'agents', icon: 'list', labelKey: 'nav.agentOverview', route: 'agents' },
        { id: 'chat', icon: 'chat', labelKey: 'nav.conversation', route: 'chat' },
      ]},
      { id: 'office', icon: 'building', labelKey: 'nav.office', route: 'office' },
      { type: 'divider' },
      { id: 'settings-group', icon: 'gear', labelKey: 'nav.settings', children: [
        { id: 'settings-conn', icon: 'link', labelKey: 'nav.connection', route: 'settings', params: { tab: 'connection' } },
        { id: 'settings-lang', icon: 'globe', labelKey: 'nav.language', route: 'settings', params: { tab: 'language' } },
        { id: 'settings-theme', icon: 'palette', labelKey: 'nav.theme', route: 'settings', params: { tab: 'theme' } },
      ]},
      { type: 'divider' },
      { id: 'account-group', icon: 'user', labelKey: 'nav.account', children: [
        { id: 'security', icon: 'shield', labelKey: 'nav.security', route: 'settings', params: { tab: 'security' } },
        { id: 'logout', icon: 'logout', labelKey: 'nav.logout', action: 'logout' },
      ]},
    ];

    this._build();
    this._bindHamburger();
    this._bindOutsideClick();

    I18n.onChange(() => this._updateTexts());
  }

  _build() {
    this._menuEl.textContent = '';

    for (var i = 0; i < this._menuConfig.length; i++) {
      var item = this._menuConfig[i];

      if (item.type === 'divider') {
        var div = document.createElement('div');
        div.className = 'nav-menu-divider';
        this._menuEl.appendChild(div);
        continue;
      }

      var btn = document.createElement('button');
      btn.className = 'nav-menu-item';
      btn.setAttribute('role', 'menuitem');
      btn.dataset.id = item.id;

      // Icon
      var iconWrap = document.createElement('span');
      iconWrap.className = 'nav-menu-icon';
      if (SvgIcons[item.icon]) iconWrap.appendChild(svgFromTemplate(SvgIcons[item.icon]));
      btn.appendChild(iconWrap);

      // Label
      var label = document.createElement('span');
      label.className = 'nav-menu-label';
      label.textContent = I18n.t(item.labelKey);
      label.dataset.i18nKey = item.labelKey;
      btn.appendChild(label);

      // Chevron for parent items
      if (item.children) {
        var chevron = document.createElement('span');
        chevron.className = 'nav-menu-chevron';
        chevron.appendChild(svgFromTemplate(SvgIcons.chevron));
        btn.appendChild(chevron);
      }

      if (item.route) {
        this._bindRoute(btn, item.route, item.params);
      } else if (item.children) {
        this._bindSubmenuToggle(btn, item);
      }

      this._menuEl.appendChild(btn);

      // Submenu
      if (item.children) {
        var sub = document.createElement('div');
        sub.className = 'nav-submenu';
        sub.dataset.parentId = item.id;

        for (var j = 0; j < item.children.length; j++) {
          var child = item.children[j];
          var subBtn = document.createElement('button');
          subBtn.className = 'nav-submenu-item';
          subBtn.setAttribute('role', 'menuitem');
          subBtn.dataset.id = child.id;

          var subIcon = document.createElement('span');
          subIcon.className = 'nav-submenu-icon';
          if (SvgIcons[child.icon]) subIcon.appendChild(svgFromTemplate(SvgIcons[child.icon]));
          subBtn.appendChild(subIcon);

          var subLabel = document.createElement('span');
          subLabel.textContent = I18n.t(child.labelKey);
          subLabel.dataset.i18nKey = child.labelKey;
          subBtn.appendChild(subLabel);

          if (child.route) {
            this._bindRoute(subBtn, child.route, child.params);
          } else if (child.action === 'logout') {
            subBtn.addEventListener('click', function() { AuthGate.logout(); });
          }

          sub.appendChild(subBtn);
        }

        this._menuEl.appendChild(sub);
      }
    }

    // Footer
    this._buildFooter();
  }

  _buildFooter() {
    this._footerEl.textContent = '';
    var stats = document.createElement('div');
    stats.className = 'nav-footer-stats';

    // Agent count
    var agentStat = document.createElement('div');
    agentStat.className = 'nav-footer-stat';
    var agentDot = document.createElement('span');
    agentDot.className = 'nav-footer-stat-dot';
    agentDot.style.background = 'var(--accent)';
    agentStat.appendChild(agentDot);
    this._agentCountEl = document.createElement('span');
    this._agentCountEl.textContent = (PixelSprites.agentPalettes.length) + ' AI ' + I18n.t('nav.agents');
    agentStat.appendChild(this._agentCountEl);
    stats.appendChild(agentStat);

    // Gateway status
    var gwStat = document.createElement('div');
    gwStat.className = 'nav-footer-stat';
    this._gwDot = document.createElement('span');
    this._gwDot.className = 'nav-footer-stat-dot';
    this._gwDot.style.background = 'var(--text-dim)';
    gwStat.appendChild(this._gwDot);
    this._gwLabel = document.createElement('span');
    this._gwLabel.textContent = 'Gateway: --';
    gwStat.appendChild(this._gwLabel);
    stats.appendChild(gwStat);

    this._footerEl.appendChild(stats);

    // Brand
    var brand = document.createElement('div');
    brand.className = 'nav-footer-brand';
    brand.textContent = 'powered by HD \u667A\u52D5\u5316';
    this._footerEl.appendChild(brand);
  }

  _bindRoute(btn, route, params) {
    var self = this;
    btn.addEventListener('click', function() {
      self.setActive(btn.dataset.id, route);
      if (self.onNavigate) self.onNavigate(route, params);
      // Close sidebar on tablet
      self._el.classList.remove('open');
    });
  }

  _bindSubmenuToggle(btn, item) {
    var self = this;
    btn.addEventListener('click', function() {
      var sub = self._menuEl.querySelector('.nav-submenu[data-parent-id="' + item.id + '"]');
      if (!sub) return;
      var isOpen = sub.classList.contains('open');
      // Close all submenus first
      var allSubs = self._menuEl.querySelectorAll('.nav-submenu');
      allSubs.forEach(function(s) { s.classList.remove('open'); });
      var allItems = self._menuEl.querySelectorAll('.nav-menu-item');
      allItems.forEach(function(i) { i.classList.remove('expanded'); });
      // Toggle this one
      if (!isOpen) {
        sub.classList.add('open');
        btn.classList.add('expanded');
      }
    });
  }

  _bindHamburger() {
    var self = this;
    if (this._hamburgerBtn) {
      this._hamburgerBtn.addEventListener('click', function() {
        self._el.classList.toggle('open');
      });
    }
  }

  _bindOutsideClick() {
    var self = this;
    document.addEventListener('click', function(e) {
      if (self._el.classList.contains('open') &&
          !self._el.contains(e.target) &&
          e.target !== self._hamburgerBtn &&
          !self._hamburgerBtn.contains(e.target)) {
        self._el.classList.remove('open');
      }
    });
  }

  setActive(itemId, route) {
    this._activeRoute = route || itemId;

    // Clear all active states
    var items = this._menuEl.querySelectorAll('.nav-menu-item, .nav-submenu-item');
    items.forEach(function(el) { el.classList.remove('active'); });

    // Set active on item
    var target = this._menuEl.querySelector('[data-id="' + itemId + '"]');
    if (target) target.classList.add('active');

    // Auto-expand parent submenu if needed
    if (target && target.classList.contains('nav-submenu-item')) {
      var parentSub = target.closest('.nav-submenu');
      if (parentSub) {
        parentSub.classList.add('open');
        var parentId = parentSub.dataset.parentId;
        var parentBtn = this._menuEl.querySelector('[data-id="' + parentId + '"]');
        if (parentBtn) {
          parentBtn.classList.add('expanded');
          parentBtn.classList.add('active');
        }
      }
    }
  }

  toggleCollapse() {
    this._collapsed = !this._collapsed;
    if (this._appShell) {
      this._appShell.classList.toggle('sidebar-collapsed', this._collapsed);
    }
  }

  updateStats(data) {
    if (!data) return;
    if (data.agentCount !== undefined && this._agentCountEl) {
      this._agentCountEl.textContent = data.agentCount + ' AI ' + I18n.t('nav.agents');
    }
    if (data.gatewayOk !== undefined) {
      if (this._gwDot) {
        this._gwDot.style.background = data.gatewayOk ? 'var(--green)' : 'var(--red)';
      }
      if (this._gwLabel) {
        this._gwLabel.textContent = 'Gateway: ' + (data.gatewayOk ? I18n.t('app.gwRunning') : I18n.t('app.gwOffline'));
      }
    }
  }

  _updateTexts() {
    var labels = this._menuEl.querySelectorAll('[data-i18n-key]');
    labels.forEach(function(el) {
      el.textContent = I18n.t(el.dataset.i18nKey);
    });
    if (this._agentCountEl) {
      var num = this._agentCountEl.textContent.match(/\d+/);
      this._agentCountEl.textContent = (num ? num[0] : String(PixelSprites.agentPalettes.length)) + ' AI ' + I18n.t('nav.agents');
    }
  }
}
