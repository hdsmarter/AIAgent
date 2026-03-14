/**
 * settings-panel.js — Settings modal (SRP)
 * Language selector, chat mode (Telegram/Gateway), connection settings
 */
class SettingsPanel {
  static get UI_TEXT() {
    return {
      title:             I18n.t('settings.title'),
      langLabel:         I18n.t('settings.langLabel'),
      chatModeLabel:     I18n.t('settings.chatModeLabel'),
      chatModeTg:        I18n.t('settings.chatModeTg'),
      chatModeGw:        I18n.t('settings.chatModeGw'),
      urlLabel:          I18n.t('settings.urlLabel'),
      urlPlaceholder:    I18n.t('settings.urlPlaceholder'),
      tokenLabel:        I18n.t('settings.tokenLabel'),
      tokenPlaceholder:  I18n.t('settings.tokenPlaceholder'),
      tgTokenLabel:      I18n.t('settings.tgTokenLabel'),
      tgChatIdLabel:     I18n.t('settings.tgChatIdLabel'),
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
    this.isOpen = false;
    this._build();

    // Re-render text labels on language change
    I18n.onChange(() => this._updateTexts());
  }

  _build() {
    const T = SettingsPanel.UI_TEXT;

    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-overlay';
    this.overlay.addEventListener('click', () => this.close());

    // Modal
    this.modal = document.createElement('div');
    this.modal.className = 'settings-modal';

    // Title
    this.titleEl = document.createElement('h2');
    this.titleEl.className = 'settings-title';
    this.titleEl.textContent = T.title;
    this.modal.appendChild(this.titleEl);

    // ── Language selector ────────────────────────
    this.langGroup = document.createElement('div');
    this.langGroup.className = 'settings-field';
    this.langLabel = document.createElement('label');
    this.langLabel.textContent = T.langLabel;
    this.langSelect = document.createElement('select');
    this.langSelect.className = 'settings-input settings-select';
    const langOptions = [
      { value: 'zh-TW', label: '繁體中文' },
      { value: 'zh-CN', label: '简体中文' },
      { value: 'en',    label: 'English' },
    ];
    for (const opt of langOptions) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      this.langSelect.appendChild(o);
    }
    this.langSelect.value = I18n.lang;
    this.langGroup.appendChild(this.langLabel);
    this.langGroup.appendChild(this.langSelect);
    this.modal.appendChild(this.langGroup);

    // ── Chat mode selector ──────────────────────
    this.modeGroup = document.createElement('div');
    this.modeGroup.className = 'settings-field';
    this.modeLabel = document.createElement('label');
    this.modeLabel.textContent = T.chatModeLabel;
    this.modeSelect = document.createElement('select');
    this.modeSelect.className = 'settings-input settings-select';
    this._tgOption = document.createElement('option');
    this._tgOption.value = 'telegram';
    this._tgOption.textContent = T.chatModeTg;
    this._gwOption = document.createElement('option');
    this._gwOption.value = 'gateway';
    this._gwOption.textContent = T.chatModeGw;
    this.modeSelect.appendChild(this._tgOption);
    this.modeSelect.appendChild(this._gwOption);
    this.modeSelect.value = this.cc.mode;
    this.modeSelect.addEventListener('change', () => this._toggleModeFields());
    this.modeGroup.appendChild(this.modeLabel);
    this.modeGroup.appendChild(this.modeSelect);
    this.modal.appendChild(this.modeGroup);

    // ── Telegram fields ─────────────────────────
    this.tgFieldsContainer = document.createElement('div');
    this.tgFieldsContainer.className = 'settings-mode-fields';

    this._addFieldTo(this.tgFieldsContainer, T.tgTokenLabel, 'tg-token');
    this.tgTokenInput = this.tgFieldsContainer.querySelector('.settings-input-tg-token');
    this.tgTokenInput.value = this.cc.tgToken;

    this._addFieldTo(this.tgFieldsContainer, T.tgChatIdLabel, 'tg-chat-id');
    this.tgChatIdInput = this.tgFieldsContainer.querySelector('.settings-input-tg-chat-id');
    this.tgChatIdInput.value = this.cc.tgChatId;

    this.modal.appendChild(this.tgFieldsContainer);

    // ── Gateway fields ──────────────────────────
    this.gwFieldsContainer = document.createElement('div');
    this.gwFieldsContainer.className = 'settings-mode-fields';

    this._addFieldTo(this.gwFieldsContainer, T.urlLabel, 'url');
    this.urlInput = this.gwFieldsContainer.querySelector('.settings-input-url');
    this.urlInput.placeholder = T.urlPlaceholder;
    this.urlInput.value = this.cc.url;

    this._addFieldTo(this.gwFieldsContainer, T.tokenLabel, 'token');
    this.tokenInput = this.gwFieldsContainer.querySelector('.settings-input-token');
    this.tokenInput.placeholder = T.tokenPlaceholder;
    this.tokenInput.type = 'password';
    this.tokenInput.value = this.cc.token;

    this.modal.appendChild(this.gwFieldsContainer);

    // Status indicator
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'settings-status';
    this.modal.appendChild(this.statusEl);

    // Buttons row
    const btnRow = document.createElement('div');
    btnRow.className = 'settings-buttons';

    this.testBtn = document.createElement('button');
    this.testBtn.className = 'settings-btn settings-btn-test';
    this.testBtn.textContent = T.testBtn;
    this.testBtn.addEventListener('click', () => this._testConnection());

    this.saveBtn = document.createElement('button');
    this.saveBtn.className = 'settings-btn settings-btn-save';
    this.saveBtn.textContent = T.saveBtn;
    this.saveBtn.addEventListener('click', () => this._save());

    this.cancelBtn = document.createElement('button');
    this.cancelBtn.className = 'settings-btn settings-btn-cancel';
    this.cancelBtn.textContent = T.cancelBtn;
    this.cancelBtn.addEventListener('click', () => this.close());

    btnRow.appendChild(this.testBtn);
    btnRow.appendChild(this.cancelBtn);
    btnRow.appendChild(this.saveBtn);
    this.modal.appendChild(btnRow);

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);

    this._toggleModeFields();
  }

  _addFieldTo(container, label, name) {
    const group = document.createElement('div');
    group.className = 'settings-field';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'settings-input settings-input-' + name;
    group.appendChild(lbl);
    group.appendChild(input);
    container.appendChild(group);
  }

  _toggleModeFields() {
    const isTg = this.modeSelect.value === 'telegram';
    this.tgFieldsContainer.style.display = isTg ? 'block' : 'none';
    this.gwFieldsContainer.style.display = isTg ? 'none' : 'block';
  }

  /** Re-render text labels on language change */
  _updateTexts() {
    const T = SettingsPanel.UI_TEXT;
    this.titleEl.textContent = T.title;
    this.langLabel.textContent = T.langLabel;
    this.modeLabel.textContent = T.chatModeLabel;
    this._tgOption.textContent = T.chatModeTg;
    this._gwOption.textContent = T.chatModeGw;
    this.testBtn.textContent = T.testBtn;
    this.saveBtn.textContent = T.saveBtn;
    this.cancelBtn.textContent = T.cancelBtn;
    this._updateStatus();
  }

  open() {
    this.isOpen = true;
    this.langSelect.value = I18n.lang;
    this.modeSelect.value = this.cc.mode;
    this.urlInput.value = this.cc.url;
    this.tokenInput.value = this.cc.token;
    this.tgTokenInput.value = this.cc.tgToken;
    this.tgChatIdInput.value = this.cc.tgChatId;
    this._toggleModeFields();
    this._updateStatus();
    this.overlay.classList.add('open');
    this.modal.classList.add('open');
  }

  close() {
    this.isOpen = false;
    this.overlay.classList.remove('open');
    this.modal.classList.remove('open');
  }

  _updateStatus() {
    const T = SettingsPanel.UI_TEXT;
    const map = {
      connected: T.statusConnected,
      connecting: T.statusConnecting,
      disconnected: T.statusDisconnected,
    };
    this.statusEl.textContent = map[this.cc.state] || T.statusDisconnected;
    this.statusEl.className = 'settings-status settings-status-' + this.cc.state;
  }

  async _testConnection() {
    const T = SettingsPanel.UI_TEXT;
    this.testBtn.textContent = T.testing;
    this.testBtn.disabled = true;

    let ok;
    if (this.modeSelect.value === 'telegram') {
      ok = await this.cc.testConnection({ mode: 'telegram', tgToken: this.tgTokenInput.value });
    } else {
      ok = await this.cc.testConnection({ mode: 'gateway', url: this.urlInput.value, token: this.tokenInput.value });
    }

    this.testBtn.textContent = ok ? T.testOk : T.testFail;
    this.testBtn.disabled = false;
    setTimeout(() => { this.testBtn.textContent = SettingsPanel.UI_TEXT.testBtn; }, 2000);
  }

  _save() {
    // Apply language first
    I18n.setLang(this.langSelect.value);

    // Save chat client settings
    this.cc.disconnect();
    this.cc.saveSettings({
      mode: this.modeSelect.value,
      url: this.urlInput.value,
      token: this.tokenInput.value,
      tgToken: this.tgTokenInput.value,
      tgChatId: this.tgChatIdInput.value,
    });
    this.cc.connect();
    this.close();
  }
}
