/**
 * settings-panel.js — 設定面板（SRP）
 * Modal：閘道器位址、認證令牌、連線測試、全繁體中文
 */
class SettingsPanel {
  static UI_TEXT = {
    title: '設定',
    urlLabel: '閘道器位址',
    urlPlaceholder: 'ws://localhost:18789',
    tokenLabel: '認證令牌',
    tokenPlaceholder: '（選填）',
    testBtn: '測試連線',
    saveBtn: '儲存',
    cancelBtn: '取消',
    testing: '測試中...',
    testOk: '連線成功',
    testFail: '連線失敗',
    statusConnected: '已連線',
    statusConnecting: '連線中...',
    statusDisconnected: '未連線',
  };

  constructor(gatewayClient) {
    this.gw = gatewayClient;
    this.isOpen = false;
    this._build();
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
    const title = document.createElement('h2');
    title.className = 'settings-title';
    title.textContent = T.title;
    this.modal.appendChild(title);

    // URL field
    this._addField(T.urlLabel, 'url');
    this.urlInput = this.modal.querySelector('.settings-input-url');
    this.urlInput.placeholder = T.urlPlaceholder;
    this.urlInput.value = this.gw.url;

    // Token field
    this._addField(T.tokenLabel, 'token');
    this.tokenInput = this.modal.querySelector('.settings-input-token');
    this.tokenInput.placeholder = T.tokenPlaceholder;
    this.tokenInput.type = 'password';
    this.tokenInput.value = this.gw.token;

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

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'settings-btn settings-btn-cancel';
    cancelBtn.textContent = T.cancelBtn;
    cancelBtn.addEventListener('click', () => this.close());

    btnRow.appendChild(this.testBtn);
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(this.saveBtn);
    this.modal.appendChild(btnRow);

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);
  }

  _addField(label, name) {
    const group = document.createElement('div');
    group.className = 'settings-field';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'settings-input settings-input-' + name;
    group.appendChild(lbl);
    group.appendChild(input);
    this.modal.appendChild(group);
  }

  open() {
    this.isOpen = true;
    this.urlInput.value = this.gw.url;
    this.tokenInput.value = this.gw.token;
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
    this.statusEl.textContent = map[this.gw.state] || T.statusDisconnected;
    this.statusEl.className = 'settings-status settings-status-' + this.gw.state;
  }

  async _testConnection() {
    const T = SettingsPanel.UI_TEXT;
    this.testBtn.textContent = T.testing;
    this.testBtn.disabled = true;
    const ok = await this.gw.testConnection(this.urlInput.value, this.tokenInput.value);
    this.testBtn.textContent = ok ? T.testOk : T.testFail;
    this.testBtn.disabled = false;
    setTimeout(() => { this.testBtn.textContent = T.testBtn; }, 2000);
  }

  _save() {
    this.gw.saveSettings(this.urlInput.value, this.tokenInput.value);
    this.gw.disconnect();
    this.gw.connect();
    this.close();
  }
}
