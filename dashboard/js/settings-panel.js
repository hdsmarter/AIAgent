/**
 * settings-panel.js — Inline settings page with tabs
 * Tabs: Connection / Language / Theme / Security
 * No modal — renders inside #view-settings as a page
 */
class SettingsPanel {
  static get UI_TEXT() {
    return {
      title:             I18n.t('settings.title'),
      langLabel:         I18n.t('settings.langLabel'),
      chatModeLabel:     I18n.t('settings.chatModeLabel'),
      chatModeTg:        I18n.t('settings.chatModeTg'),
      chatModeGw:        I18n.t('settings.chatModeGw'),
      chatModeOr:        I18n.t('settings.chatModeOr'),
      chatModeGwApi:     I18n.t('settings.chatModeGwApi'),
      gwApiUrlLabel:     I18n.t('settings.gwApiUrlLabel'),
      gwApiUrlPlaceholder: I18n.t('settings.gwApiUrlPlaceholder'),
      gwApiTokenLabel:   I18n.t('settings.gwApiTokenLabel'),
      gwApiModelLabel:   I18n.t('settings.gwApiModelLabel'),
      urlLabel:          I18n.t('settings.urlLabel'),
      urlPlaceholder:    I18n.t('settings.urlPlaceholder'),
      tokenLabel:        I18n.t('settings.tokenLabel'),
      tokenPlaceholder:  I18n.t('settings.tokenPlaceholder'),
      tgTokenLabel:      I18n.t('settings.tgTokenLabel'),
      tgChatIdLabel:     I18n.t('settings.tgChatIdLabel'),
      orApiKeyLabel:     I18n.t('settings.orApiKeyLabel'),
      orModelLabel:      I18n.t('settings.orModelLabel'),
      orApiKeyPlaceholder: I18n.t('settings.orApiKeyPlaceholder'),
      testBtn:           I18n.t('settings.testBtn'),
      saveBtn:           I18n.t('settings.saveBtn'),
      cancelBtn:         I18n.t('settings.cancelBtn'),
      testing:           I18n.t('settings.testing'),
      testOk:            I18n.t('settings.testOk'),
      testFail:          I18n.t('settings.testFail'),
      statusConnected:   I18n.t('settings.statusConnected'),
      statusConnecting:  I18n.t('settings.statusConnecting'),
      statusDisconnected: I18n.t('settings.statusDisconnected'),
    };
  }

  constructor(chatClient) {
    this.cc = chatClient;
    this._containerEl = document.getElementById('view-settings');
    this._activeTab = 'connection';
    this._built = false;

    I18n.onChange(() => { if (this._built) this._rebuild(); });
  }

  init(opts) {
    if (opts && opts.tab) this._activeTab = opts.tab;
    this._build();
    this._built = true;
  }

  show(opts) {
    if (opts && opts.tab) {
      this._activeTab = opts.tab;
      this._switchTab(this._activeTab);
    }
    // Refresh values from ChatClient
    this._loadValues();
  }

  _build() {
    var T = SettingsPanel.UI_TEXT;
    this._containerEl.textContent = '';

    var page = document.createElement('div');
    page.className = 'settings-page';

    // Title
    this._titleEl = document.createElement('h1');
    this._titleEl.className = 'settings-page-title';
    this._titleEl.textContent = T.title;
    page.appendChild(this._titleEl);

    // Tabs
    var tabBar = document.createElement('div');
    tabBar.className = 'settings-tabs';
    this._tabBar = tabBar;

    var tabs = [
      { id: 'connection', icon: SvgIcons.link, labelKey: 'nav.connection' },
      { id: 'language', icon: SvgIcons.globe, labelKey: 'nav.language' },
      { id: 'theme', icon: SvgIcons.palette, labelKey: 'nav.theme' },
      { id: 'security', icon: SvgIcons.shield, labelKey: 'nav.security' },
    ];

    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      var tabBtn = document.createElement('button');
      tabBtn.className = 'settings-tab' + (tab.id === this._activeTab ? ' active' : '');
      tabBtn.dataset.tab = tab.id;
      tabBtn.appendChild(svgFromTemplate(tab.icon));
      var tabLabel = document.createElement('span');
      tabLabel.textContent = I18n.t(tab.labelKey);
      tabBtn.appendChild(tabLabel);
      tabBtn.addEventListener('click', (function(tabId) {
        return function() { this._switchTab(tabId); }.bind(this);
      }.bind(this))(tab.id));
      tabBar.appendChild(tabBtn);
    }
    page.appendChild(tabBar);

    // Tab contents
    this._tabContents = {};

    // ── Connection Tab ──────────────────────────
    var connTab = document.createElement('div');
    connTab.className = 'settings-tab-content' + (this._activeTab === 'connection' ? ' active' : '');

    // Chat mode selector
    this._addField(connTab, T.chatModeLabel, 'select', 'mode', [
      { value: 'telegram', label: T.chatModeTg },
      { value: 'gateway', label: T.chatModeGw },
      { value: 'openrouter', label: T.chatModeOr },
      { value: 'gateway-api', label: T.chatModeGwApi },
    ]);
    this.modeSelect = connTab.querySelector('.settings-input-mode');
    this.modeSelect.addEventListener('change', () => this._toggleModeFields());

    // Telegram fields
    this.tgFields = document.createElement('div');
    this.tgFields.className = 'settings-mode-fields';
    this._addField(this.tgFields, T.tgTokenLabel, 'text', 'tg-token');
    this._addField(this.tgFields, T.tgChatIdLabel, 'text', 'tg-chat-id');
    connTab.appendChild(this.tgFields);

    // Gateway WS fields
    this.gwFields = document.createElement('div');
    this.gwFields.className = 'settings-mode-fields';
    this._addField(this.gwFields, T.urlLabel, 'text', 'url', null, T.urlPlaceholder);
    this._addField(this.gwFields, T.tokenLabel, 'password', 'token', null, T.tokenPlaceholder);
    connTab.appendChild(this.gwFields);

    // OpenRouter fields
    this.orFields = document.createElement('div');
    this.orFields.className = 'settings-mode-fields';
    this._addField(this.orFields, T.orApiKeyLabel, 'password', 'or-api-key', null, T.orApiKeyPlaceholder);
    this._addField(this.orFields, T.orModelLabel, 'text', 'or-model', null, ChatClient.DEFAULTS.openRouterModel);
    connTab.appendChild(this.orFields);

    // Gateway API fields
    this.gwApiFields = document.createElement('div');
    this.gwApiFields.className = 'settings-mode-fields';
    this._addField(this.gwApiFields, T.gwApiUrlLabel, 'text', 'gw-api-url', null, T.gwApiUrlPlaceholder);
    this._addField(this.gwApiFields, T.gwApiTokenLabel, 'password', 'gw-api-token');
    this._addField(this.gwApiFields, T.gwApiModelLabel, 'text', 'gw-api-model', null, ChatClient.DEFAULTS.gwApiModel);
    connTab.appendChild(this.gwApiFields);

    // Status
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'settings-status';
    this.statusEl.setAttribute('aria-live', 'polite');
    connTab.appendChild(this.statusEl);

    // Buttons
    var btnRow = document.createElement('div');
    btnRow.className = 'settings-buttons';
    this.testBtn = this._createBtn('settings-btn-test', T.testBtn, () => this._testConnection());
    this.saveBtn = this._createBtn('settings-btn-save', T.saveBtn, () => this._saveConnection());
    btnRow.appendChild(this.testBtn);
    btnRow.appendChild(this.saveBtn);
    connTab.appendChild(btnRow);

    this._tabContents.connection = connTab;
    page.appendChild(connTab);

    // ── Language Tab ────────────────────────────
    var langTab = document.createElement('div');
    langTab.className = 'settings-tab-content' + (this._activeTab === 'language' ? ' active' : '');

    this._addField(langTab, T.langLabel, 'select', 'lang', [
      { value: 'zh-TW', label: '\u7E41\u9AD4\u4E2D\u6587' },
      { value: 'zh-CN', label: '\u7B80\u4F53\u4E2D\u6587' },
      { value: 'en', label: 'English' },
    ]);
    this.langSelect = langTab.querySelector('.settings-input-lang');

    var langSaveRow = document.createElement('div');
    langSaveRow.className = 'settings-buttons';
    langSaveRow.appendChild(this._createBtn('settings-btn-save', T.saveBtn, () => this._saveLang()));
    langTab.appendChild(langSaveRow);

    this._tabContents.language = langTab;
    page.appendChild(langTab);

    // ── Theme Tab ───────────────────────────────
    var themeTab = document.createElement('div');
    themeTab.className = 'settings-tab-content' + (this._activeTab === 'theme' ? ' active' : '');

    this._addField(themeTab, I18n.t('settings.themeLabel') || 'Theme', 'select', 'theme-select', [
      { value: 'light', label: I18n.t('app.themeLight') },
      { value: 'dark', label: I18n.t('app.themeDark') },
    ]);
    this.themeSelect = themeTab.querySelector('.settings-input-theme-select');

    var themeSaveRow = document.createElement('div');
    themeSaveRow.className = 'settings-buttons';
    themeSaveRow.appendChild(this._createBtn('settings-btn-save', T.saveBtn, () => this._saveTheme()));
    themeTab.appendChild(themeSaveRow);

    this._tabContents.theme = themeTab;
    page.appendChild(themeTab);

    // ── Security Tab ────────────────────────────
    var secTab = document.createElement('div');
    secTab.className = 'settings-tab-content' + (this._activeTab === 'security' ? ' active' : '');

    var secInfo = document.createElement('p');
    secInfo.style.cssText = 'font-size:13px;color:var(--text-dim);margin-bottom:16px;';
    secInfo.textContent = I18n.t('settings.securityInfo') || 'Session security settings';
    secTab.appendChild(secInfo);

    this.logoutBtn = document.createElement('button');
    this.logoutBtn.className = 'settings-btn-logout';
    this.logoutBtn.textContent = I18n.t('auth.logoutBtn');
    this.logoutBtn.addEventListener('click', () => AuthGate.logout());
    secTab.appendChild(this.logoutBtn);

    this._tabContents.security = secTab;
    page.appendChild(secTab);

    this._containerEl.appendChild(page);

    // Load values
    this._loadValues();
    this._toggleModeFields();
  }

  _addField(container, label, type, name, options, placeholder) {
    var group = document.createElement('div');
    group.className = 'settings-field';
    var lbl = document.createElement('label');
    lbl.textContent = label;
    group.appendChild(lbl);

    if (type === 'select' && options) {
      var select = document.createElement('select');
      select.className = 'settings-input settings-select settings-input-' + name;
      select.setAttribute('aria-label', label);
      for (var i = 0; i < options.length; i++) {
        var opt = document.createElement('option');
        opt.value = options[i].value;
        opt.textContent = options[i].label;
        select.appendChild(opt);
      }
      group.appendChild(select);
    } else {
      var input = document.createElement('input');
      input.type = type || 'text';
      input.className = 'settings-input settings-input-' + name;
      input.setAttribute('aria-label', label);
      if (placeholder) input.placeholder = placeholder;
      if (type === 'password') input.autocomplete = 'off';
      group.appendChild(input);
    }
    container.appendChild(group);
  }

  _createBtn(cls, text, onClick) {
    var btn = document.createElement('button');
    btn.className = cls;
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  _switchTab(tabId) {
    this._activeTab = tabId;
    // Update tab buttons
    var btns = this._tabBar.querySelectorAll('.settings-tab');
    btns.forEach(function(b) { b.classList.toggle('active', b.dataset.tab === tabId); });
    // Show/hide content
    for (var key in this._tabContents) {
      this._tabContents[key].classList.toggle('active', key === tabId);
    }
  }

  _loadValues() {
    if (this.modeSelect) this.modeSelect.value = this.cc.mode;
    if (this.langSelect) this.langSelect.value = I18n.lang;
    if (this.themeSelect) this.themeSelect.value = ThemePalette._current || 'light';

    var getInput = function(name) {
      return this._containerEl.querySelector('.settings-input-' + name);
    }.bind(this);

    var setVal = function(name, val) {
      var el = getInput(name);
      if (el) el.value = val || '';
    };

    setVal('tg-token', this.cc.tgToken);
    setVal('tg-chat-id', this.cc.tgChatId);
    setVal('url', this.cc.url);
    setVal('token', this.cc.token);
    setVal('or-api-key', this.cc.orApiKey);
    setVal('or-model', this.cc.orModel);
    setVal('gw-api-url', this.cc.gwApiUrl);
    setVal('gw-api-token', this.cc.gwApiToken);
    setVal('gw-api-model', this.cc.gwApiModel);

    this._toggleModeFields();
    this._updateStatus();
  }

  _toggleModeFields() {
    if (!this.modeSelect) return;
    var mode = this.modeSelect.value;
    if (this.tgFields) this.tgFields.style.display = mode === 'telegram' ? 'block' : 'none';
    if (this.gwFields) this.gwFields.style.display = mode === 'gateway' ? 'block' : 'none';
    if (this.orFields) this.orFields.style.display = mode === 'openrouter' ? 'block' : 'none';
    if (this.gwApiFields) this.gwApiFields.style.display = mode === 'gateway-api' ? 'block' : 'none';
  }

  _updateStatus() {
    if (!this.statusEl) return;
    var T = SettingsPanel.UI_TEXT;
    var map = { connected: T.statusConnected, connecting: T.statusConnecting, disconnected: T.statusDisconnected };
    this.statusEl.textContent = map[this.cc.state] || T.statusDisconnected;
    this.statusEl.className = 'settings-status settings-status-' + this.cc.state;
  }

  async _testConnection() {
    var T = SettingsPanel.UI_TEXT;
    this.testBtn.textContent = T.testing;
    this.testBtn.disabled = true;

    var getVal = function(name) {
      var el = this._containerEl.querySelector('.settings-input-' + name);
      return el ? el.value : '';
    }.bind(this);

    var mode = this.modeSelect.value;
    var ok;
    if (mode === 'telegram') {
      ok = await this.cc.testConnection({ mode: 'telegram', tgToken: getVal('tg-token') });
    } else if (mode === 'openrouter') {
      ok = await this.cc.testConnection({ mode: 'openrouter', orApiKey: getVal('or-api-key'), orModel: getVal('or-model') || ChatClient.DEFAULTS.openRouterModel });
    } else if (mode === 'gateway-api') {
      ok = await this.cc.testConnection({ mode: 'gateway-api', gwApiUrl: getVal('gw-api-url'), gwApiToken: getVal('gw-api-token'), gwApiModel: getVal('gw-api-model') || ChatClient.DEFAULTS.gwApiModel });
    } else {
      ok = await this.cc.testConnection({ mode: 'gateway', url: getVal('url'), token: getVal('token') });
    }

    this.testBtn.textContent = ok ? T.testOk : T.testFail;
    this.testBtn.disabled = false;
    setTimeout(() => { this.testBtn.textContent = SettingsPanel.UI_TEXT.testBtn; }, 2000);
  }

  _saveConnection() {
    var getVal = function(name) {
      var el = this._containerEl.querySelector('.settings-input-' + name);
      return el ? el.value : '';
    }.bind(this);

    this.cc.disconnect();
    this.cc.saveSettings({
      mode: this.modeSelect.value,
      url: getVal('url'),
      token: getVal('token'),
      tgToken: getVal('tg-token'),
      tgChatId: getVal('tg-chat-id'),
      orApiKey: getVal('or-api-key'),
      orModel: getVal('or-model') || ChatClient.DEFAULTS.openRouterModel,
      gwApiUrl: getVal('gw-api-url'),
      gwApiToken: getVal('gw-api-token'),
      gwApiModel: getVal('gw-api-model') || ChatClient.DEFAULTS.gwApiModel,
    });
    this.cc.connect();
    this._updateStatus();
  }

  _saveLang() {
    if (this.langSelect) I18n.setLang(this.langSelect.value);
  }

  _saveTheme() {
    if (this.themeSelect) {
      var target = this.themeSelect.value;
      if (ThemePalette._current !== target) ThemePalette.toggle();
    }
  }

  _rebuild() {
    var activeTab = this._activeTab;
    this._build();
    this._switchTab(activeTab);
  }

  // Legacy compat: open/close (no-op since now inline)
  open() { /* Navigate to settings route instead */ }
  close() { /* No-op */ }
}
