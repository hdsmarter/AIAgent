/**
 * chat-panel.js — 對話面板 UI（SRP）
 * 桌面：右側 360px 滑入 / 手機：底部 70vh sheet
 * DOM 全部程式化建立，全繁體中文
 */
class ChatPanel {
  static UI_TEXT = {
    title: '對話',
    placeholder: '輸入訊息...',
    send: '發送',
    offline: '離線模式 — 閘道器未連線',
    typing: '思考中...',
    close: '關閉',
    noAgent: '請點擊 Agent 開始對話',
  };

  constructor() {
    this.isOpen = false;
    this.agent = null;
    this.onSend = null; // callback(agentId, text)
    this._build();
  }

  _build() {
    const T = ChatPanel.UI_TEXT;

    // Overlay (mobile backdrop)
    this.overlay = document.createElement('div');
    this.overlay.className = 'chat-overlay';
    this.overlay.addEventListener('click', () => this.close());

    // Panel container
    this.el = document.createElement('div');
    this.el.className = 'chat-panel';

    // Drag handle (mobile sheet)
    this.handle = document.createElement('div');
    this.handle.className = 'chat-handle';
    const handleBar = document.createElement('span');
    this.handle.appendChild(handleBar);
    this.el.appendChild(this.handle);

    // Header
    this.header = document.createElement('div');
    this.header.className = 'chat-header';

    this.titleEl = document.createElement('span');
    this.titleEl.className = 'chat-title';
    this.titleEl.textContent = T.title;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'chat-close-btn';
    closeBtn.textContent = '\u2715';
    closeBtn.title = T.close;
    closeBtn.addEventListener('click', () => this.close());

    this.header.appendChild(this.titleEl);
    this.header.appendChild(closeBtn);
    this.el.appendChild(this.header);

    // Offline banner
    this.offlineBanner = document.createElement('div');
    this.offlineBanner.className = 'chat-offline';
    this.offlineBanner.textContent = T.offline;
    this.el.appendChild(this.offlineBanner);

    // Messages list
    this.messageList = document.createElement('div');
    this.messageList.className = 'chat-messages';
    this.el.appendChild(this.messageList);

    // Typing indicator
    this.typingEl = document.createElement('div');
    this.typingEl.className = 'chat-typing';
    this.typingEl.textContent = T.typing;
    this.typingEl.style.display = 'none';
    this.el.appendChild(this.typingEl);

    // Input area
    this.inputArea = document.createElement('div');
    this.inputArea.className = 'chat-input-area';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'chat-input';
    this.input.placeholder = T.placeholder;
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._sendMessage();
      }
    });

    this.sendBtn = document.createElement('button');
    this.sendBtn.className = 'chat-send-btn';
    this.sendBtn.textContent = T.send;
    this.sendBtn.addEventListener('click', () => this._sendMessage());

    this.inputArea.appendChild(this.input);
    this.inputArea.appendChild(this.sendBtn);
    this.el.appendChild(this.inputArea);

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.el);
  }

  open(agent) {
    this.agent = agent;
    this.isOpen = true;
    this.messageList.textContent = ''; // clear
    this.titleEl.textContent = agent
      ? '\u26A1 ' + agent.name + ' \u2014 ' + ChatPanel.UI_TEXT.title
      : ChatPanel.UI_TEXT.noAgent;
    this.el.classList.add('open');
    this.overlay.classList.add('open');
    this.input.focus();
  }

  close() {
    this.isOpen = false;
    this.agent = null;
    this.el.classList.remove('open');
    this.overlay.classList.remove('open');
  }

  setOffline(offline) {
    this.offlineBanner.style.display = offline ? 'block' : 'none';
    this.input.disabled = offline;
    this.sendBtn.disabled = offline;
  }

  setTyping(show) {
    this.typingEl.style.display = show ? 'block' : 'none';
    if (show) this._scrollToBottom();
  }

  addMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg-' + role; // user | agent | system
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;
    msg.appendChild(bubble);
    this.messageList.appendChild(msg);
    this._scrollToBottom();
  }

  _sendMessage() {
    const text = this.input.value.trim();
    if (!text || !this.agent) return;
    this.addMessage('user', text);
    this.input.value = '';
    if (this.onSend) this.onSend(this.agent.id, text);
  }

  _scrollToBottom() {
    this.messageList.scrollTop = this.messageList.scrollHeight;
  }
}
