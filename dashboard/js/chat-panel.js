/**
 * chat-panel.js — Chat panel UI (SRP)
 * Desktop: right-side 360px slide-in / Mobile: bottom 70vh sheet
 * All strings via I18n.t()
 */
class ChatPanel {
  /** Dynamic UI text via i18n */
  static get UI_TEXT() {
    return {
      title:        I18n.t('chat.title'),
      placeholder:  I18n.t('chat.placeholder'),
      send:         I18n.t('chat.send'),
      offline:      I18n.t('chat.offline'),
      typing:       I18n.t('chat.typing'),
      close:        I18n.t('chat.close'),
      noAgent:      I18n.t('chat.noAgent'),
      openTelegram: I18n.t('chat.openTelegram'),
    };
  }

  constructor() {
    this.isOpen = false;
    this.agent = null;
    this.onSend = null; // callback(agentId, text)
    this._build();

    // Re-render text on language change
    I18n.onChange(() => this._updateTexts());
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

    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'chat-close-btn';
    this.closeBtn.textContent = '\u2715';
    this.closeBtn.title = T.close;
    this.closeBtn.addEventListener('click', () => this.close());

    this.header.appendChild(this.titleEl);
    this.header.appendChild(this.closeBtn);
    this.el.appendChild(this.header);

    // Offline banner
    this.offlineBanner = document.createElement('div');
    this.offlineBanner.className = 'chat-offline';
    this.offlineBanner.textContent = T.offline;
    this.el.appendChild(this.offlineBanner);

    // Telegram fallback link
    this.tgLink = document.createElement('a');
    this.tgLink.className = 'chat-tg-link';
    this.tgLink.href = ChatClient.DEFAULTS.tgBotLink;
    this.tgLink.target = '_blank';
    this.tgLink.rel = 'noopener';
    this.tgLink.textContent = T.openTelegram;
    this.tgLink.style.display = 'none';
    this.el.appendChild(this.tgLink);

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

  /** Re-render all text labels when language changes */
  _updateTexts() {
    const T = ChatPanel.UI_TEXT;
    this.closeBtn.title = T.close;
    this.offlineBanner.textContent = T.offline;
    this.tgLink.textContent = T.openTelegram;
    this.typingEl.textContent = T.typing;
    this.input.placeholder = T.placeholder;
    this.sendBtn.textContent = T.send;

    // Re-render title if panel is open
    if (this.isOpen && this.agent) {
      this.titleEl.textContent = '\u26A1 ' + I18n.agentName(this.agent.id) + ' \u2014 ' + T.title;
    } else if (this.isOpen) {
      this.titleEl.textContent = T.noAgent;
    } else {
      this.titleEl.textContent = T.title;
    }
  }

  open(agent) {
    this.agent = agent;
    this.isOpen = true;
    this.messageList.textContent = ''; // clear
    const T = ChatPanel.UI_TEXT;
    this.titleEl.textContent = agent
      ? '\u26A1 ' + I18n.agentName(agent.id) + ' \u2014 ' + T.title
      : T.noAgent;
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

  /** Show Telegram fallback link when all transports fail */
  showTelegramFallback(show) {
    this.tgLink.style.display = show ? 'block' : 'none';
  }

  setTyping(show) {
    this.typingEl.style.display = show ? 'block' : 'none';
    if (show) this._scrollToBottom();
  }

  addMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg-' + role;
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
