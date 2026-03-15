/**
 * chat-panel.js — Enterprise chat panel (complete rewrite)
 * Features: CJK composition safety, textarea multiline, Markdown rendering,
 * file upload (drag+drop, preview, compress), download conversation,
 * error UX (retry, offline banner), char counter, WCAG accessible
 */
class ChatPanel {
  static get UI_TEXT() {
    return {
      title:        I18n.t('chat.title'),
      placeholder:  I18n.t('chat.placeholder'),
      send:         I18n.t('chat.send'),
      offline:      I18n.t('chat.offline'),
      typing:       I18n.t('chat.typing'),
      streaming:    I18n.t('chat.streaming'),
      close:        I18n.t('chat.close'),
      noAgent:      I18n.t('chat.noAgent'),
      openTelegram: I18n.t('chat.openTelegram'),
      upload:       I18n.t('chat.upload'),
      download:     I18n.t('chat.download'),
      retry:        I18n.t('chat.retry'),
      fileTooLarge: I18n.t('chat.fileTooLarge'),
      emptyMsg:     I18n.t('chat.emptyMsg'),
      downloadFmt:  I18n.t('chat.downloadFmt'),
      charCount:    I18n.t('chat.charCount'),
      sending:      I18n.t('chat.sending'),
    };
  }

  constructor() {
    this.isOpen = false;
    this.agent = null;
    this.onSend = null;
    this._streaming = false;
    this._composing = false;
    this._sending = false;
    this._messages = []; // {role, text, time, agentId, failed}
    this._pendingFile = null;
    this._container = document.getElementById('chat-panel-section');
    this._build();

    I18n.onChange(() => this._updateTexts());
  }

  _build() {
    var T = ChatPanel.UI_TEXT;
    var el = this._container;

    // Header
    var header = document.createElement('div');
    header.className = 'chat-header';

    this._titleEl = document.createElement('span');
    this._titleEl.className = 'chat-title';
    this._titleEl.textContent = T.noAgent;

    var actions = document.createElement('div');
    actions.className = 'chat-header-actions';

    this._downloadBtn = document.createElement('button');
    this._downloadBtn.className = 'chat-action-btn';
    this._downloadBtn.textContent = '\u2B07';
    this._downloadBtn.title = T.download;
    this._downloadBtn.setAttribute('aria-label', T.download);
    this._downloadBtn.addEventListener('click', () => this._showDownloadModal());

    actions.appendChild(this._downloadBtn);
    header.appendChild(this._titleEl);
    header.appendChild(actions);
    el.appendChild(header);

    // Offline banner
    this._offlineBanner = document.createElement('div');
    this._offlineBanner.className = 'chat-offline-banner';
    this._offlineBanner.setAttribute('role', 'alert');
    this._offlineBanner.textContent = T.offline;
    el.appendChild(this._offlineBanner);

    // Telegram fallback link
    this._tgLink = document.createElement('a');
    this._tgLink.className = 'chat-tg-link';
    this._tgLink.href = ChatClient.DEFAULTS.tgBotLink;
    this._tgLink.target = '_blank';
    this._tgLink.rel = 'noopener';
    this._tgLink.textContent = T.openTelegram;
    this._tgLink.style.display = 'none';
    el.appendChild(this._tgLink);

    // Messages list
    this._messageList = document.createElement('div');
    this._messageList.className = 'chat-messages';
    this._messageList.setAttribute('role', 'log');
    this._messageList.setAttribute('aria-live', 'polite');
    el.appendChild(this._messageList);

    // Typing indicator
    this._typingEl = document.createElement('div');
    this._typingEl.className = 'chat-typing';
    this._typingEl.setAttribute('aria-live', 'polite');
    this._typingEl.textContent = T.typing;
    this._typingEl.style.display = 'none';
    el.appendChild(this._typingEl);

    // File preview area
    this._filePreviewEl = document.createElement('div');
    this._filePreviewEl.style.display = 'none';
    el.appendChild(this._filePreviewEl);

    // Input area
    var inputArea = document.createElement('div');
    inputArea.className = 'chat-input-area';

    // Upload button
    this._uploadBtn = document.createElement('button');
    this._uploadBtn.className = 'chat-upload-btn';
    this._uploadBtn.textContent = '\uD83D\uDCCE';
    this._uploadBtn.title = T.upload;
    this._uploadBtn.setAttribute('aria-label', T.upload);
    this._uploadBtn.addEventListener('click', () => this._triggerUpload());

    // Hidden file input
    this._fileInput = document.createElement('input');
    this._fileInput.type = 'file';
    this._fileInput.accept = 'image/*,.pdf,.txt,.csv,.json';
    this._fileInput.style.display = 'none';
    this._fileInput.addEventListener('change', (e) => this._handleFileSelect(e));

    // Input wrap
    var inputWrap = document.createElement('div');
    inputWrap.className = 'chat-input-wrap';

    this._input = document.createElement('textarea');
    this._input.className = 'chat-input';
    this._input.rows = 1;
    this._input.placeholder = T.placeholder;
    this._input.setAttribute('aria-label', T.placeholder);

    // CJK composition tracking
    this._input.addEventListener('compositionstart', () => { this._composing = true; });
    this._input.addEventListener('compositionend', () => { this._composing = false; });

    // Enter to send (unless composing or Shift held)
    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !this._composing) {
        e.preventDefault();
        this._sendMessage();
      }
    });

    // Auto-resize textarea
    this._input.addEventListener('input', () => {
      this._autoResize();
      this._updateCharCount();
    });

    // Char counter
    this._charCount = document.createElement('div');
    this._charCount.className = 'chat-char-count';

    inputWrap.appendChild(this._input);
    inputWrap.appendChild(this._charCount);

    // Send button
    this._sendBtn = document.createElement('button');
    this._sendBtn.className = 'chat-send-btn';
    this._sendBtn.textContent = T.send;
    this._sendBtn.addEventListener('click', () => this._sendMessage());

    var inputActions = document.createElement('div');
    inputActions.className = 'chat-input-actions';
    inputActions.appendChild(this._uploadBtn);
    inputActions.appendChild(this._sendBtn);

    inputArea.appendChild(inputWrap);
    inputArea.appendChild(inputActions);
    el.appendChild(inputArea);
    el.appendChild(this._fileInput);

    // Drag-and-drop support
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      el.style.outline = '2px dashed var(--accent)';
    });
    el.addEventListener('dragleave', () => {
      el.style.outline = '';
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.style.outline = '';
      if (e.dataTransfer.files.length > 0) {
        this._processFile(e.dataTransfer.files[0]);
      }
    });
  }

  _autoResize() {
    var el = this._input;
    el.style.height = 'auto';
    var maxH = parseInt(getComputedStyle(el).lineHeight, 10) * 6 || 150;
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
  }

  _updateCharCount() {
    var len = this._input.value.length;
    if (len > 3000) {
      this._charCount.style.display = 'block';
      this._charCount.textContent = len + ' ' + ChatPanel.UI_TEXT.charCount;
      this._charCount.className = 'chat-char-count' + (len > 4000 ? ' over' : ' warn');
    } else {
      this._charCount.style.display = 'none';
    }
  }

  _updateTexts() {
    var T = ChatPanel.UI_TEXT;
    this._offlineBanner.textContent = T.offline;
    this._tgLink.textContent = T.openTelegram;
    this._typingEl.textContent = this._streaming ? T.streaming : T.typing;
    this._input.placeholder = T.placeholder;
    this._input.setAttribute('aria-label', T.placeholder);
    this._sendBtn.textContent = T.send;
    this._uploadBtn.title = T.upload;
    this._uploadBtn.setAttribute('aria-label', T.upload);
    this._downloadBtn.title = T.download;
    this._downloadBtn.setAttribute('aria-label', T.download);

    if (this.agent) {
      this._titleEl.textContent = '\u26A1 ' + I18n.agentName(this.agent.id) + ' \u2014 ' + T.title;
    } else {
      this._titleEl.textContent = T.noAgent;
    }
  }

  // ── Public API ──────────────────────────────

  open(agent) {
    this.agent = agent;
    this.isOpen = true;
    this._streaming = false;
    this._messages = [];
    this._messageList.textContent = '';
    this._clearFile();
    var T = ChatPanel.UI_TEXT;
    this._titleEl.textContent = agent
      ? '\u26A1 ' + I18n.agentName(agent.id) + ' \u2014 ' + T.title
      : T.noAgent;
    this._input.focus();
  }

  close() {
    this.isOpen = false;
    this.agent = null;
    this._streaming = false;
    this._clearFile();
  }

  setOffline(offline) {
    this._offlineBanner.style.display = offline ? 'block' : 'none';
    this._input.disabled = offline;
    this._sendBtn.disabled = offline;
  }

  showTelegramFallback(show) {
    this._tgLink.style.display = show ? 'block' : 'none';
  }

  setTyping(show) {
    this._typingEl.textContent = ChatPanel.UI_TEXT.typing;
    this._typingEl.style.display = show ? 'block' : 'none';
    if (show) this._scrollToBottom();
  }

  addMessage(role, text, opts) {
    var time = new Date();
    var msg = { role: role, text: text, time: time, failed: opts && opts.failed };
    this._messages.push(msg);

    var msgEl = document.createElement('div');
    msgEl.className = 'chat-msg chat-msg-' + role;
    if (msg.failed) msgEl.classList.add('chat-msg-failed');

    // Meta (timestamp + agent name)
    var meta = document.createElement('div');
    meta.className = 'chat-msg-meta';
    var timeStr = String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');
    if (role === 'agent' && this.agent) {
      meta.textContent = I18n.agentName(this.agent.id) + ' \u00B7 ' + timeStr;
    } else {
      meta.textContent = timeStr;
    }
    msgEl.appendChild(meta);

    // Bubble
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    if (role === 'agent') {
      this._renderMarkdown(bubble, text);
    } else {
      bubble.textContent = text;
    }
    msgEl.appendChild(bubble);

    // Retry button for failed messages
    if (msg.failed) {
      var retryBtn = document.createElement('button');
      retryBtn.className = 'chat-retry-btn';
      retryBtn.textContent = ChatPanel.UI_TEXT.retry;
      retryBtn.addEventListener('click', () => {
        msgEl.remove();
        this._messages = this._messages.filter(function(m) { return m !== msg; });
        if (this.onSend && this.agent) {
          this.addMessage('user', text);
          this.onSend(this.agent.id, text);
        }
      });
      msgEl.appendChild(retryBtn);
    }

    this._messageList.appendChild(msgEl);
    this._trimMessages();
    this._scrollToBottom();
  }

  startStreamingMessage() {
    this._streaming = true;
    this._typingEl.textContent = ChatPanel.UI_TEXT.streaming;
    this._typingEl.style.display = 'block';

    var msgEl = document.createElement('div');
    msgEl.className = 'chat-msg chat-msg-agent';
    msgEl.setAttribute('data-streaming', 'true');

    var meta = document.createElement('div');
    meta.className = 'chat-msg-meta';
    var time = new Date();
    var timeStr = String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');
    if (this.agent) {
      meta.textContent = I18n.agentName(this.agent.id) + ' \u00B7 ' + timeStr;
    } else {
      meta.textContent = timeStr;
    }
    msgEl.appendChild(meta);

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = '';
    msgEl.appendChild(bubble);

    this._messageList.appendChild(msgEl);
    this._scrollToBottom();
  }

  updateLastAgentMessage(text) {
    var streamingMsg = this._messageList.querySelector('[data-streaming="true"]');
    if (streamingMsg) {
      var bubble = streamingMsg.querySelector('.chat-bubble');
      if (bubble) {
        this._renderMarkdown(bubble, text);
      }
      this._scrollToBottom();
    }
  }

  finalizeStreaming() {
    var streamingMsg = this._messageList.querySelector('[data-streaming="true"]');
    if (streamingMsg) {
      streamingMsg.removeAttribute('data-streaming');
      var bubble = streamingMsg.querySelector('.chat-bubble');
      if (bubble) {
        this._messages.push({ role: 'agent', text: bubble.textContent, time: new Date() });
      }
    }
    this._streaming = false;
    this._typingEl.style.display = 'none';
  }

  // ── Markdown Renderer (XSS-safe) ──────────

  _renderMarkdown(el, text) {
    // Escape HTML by using a temporary text node
    var tmp = document.createElement('span');
    tmp.textContent = text;
    var escaped = tmp.textContent;

    // Code blocks: ```...```
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code: `...`
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold: **...**
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *...*
    escaped = escaped.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Links: [text](url) — only allow http(s) URLs
    escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Unordered list: lines starting with - or *
    escaped = escaped.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    escaped = escaped.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    // Ordered list: lines starting with 1. 2. etc
    escaped = escaped.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    // Line breaks
    escaped = escaped.replace(/\n/g, '<br>');

    // Use createContextualFragment for safe DOM insertion
    var range = document.createRange();
    el.textContent = '';
    var frag = range.createContextualFragment(escaped);
    el.appendChild(frag);
  }

  // ── File Upload ────────────────────────────

  _triggerUpload() {
    this._fileInput.click();
  }

  _handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      this._processFile(e.target.files[0]);
    }
    // Reset so same file can be re-selected
    this._fileInput.value = '';
  }

  _processFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      this.addMessage('system', ChatPanel.UI_TEXT.fileTooLarge);
      return;
    }

    this._pendingFile = { file: file, data: null, preview: null };

    if (file.type.startsWith('image/')) {
      this._compressImage(file, (dataUrl) => {
        this._pendingFile.data = dataUrl;
        this._showFilePreview(file.name, dataUrl);
      });
    } else {
      var reader = new FileReader();
      reader.onload = (ev) => {
        this._pendingFile.data = ev.target.result;
        this._showFilePreview(file.name, null);
      };
      reader.readAsText(file);
    }
  }

  _compressImage(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var maxDim = 1024;
        var w = img.width;
        var h = img.height;
        if (w > maxDim || h > maxDim) {
          var ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var quality = 0.8;
        var dataUrl = canvas.toDataURL('image/jpeg', quality);
        // If still > 1MB, reduce quality
        while (dataUrl.length > 1024 * 1024 && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  _showFilePreview(name, imageUrl) {
    this._filePreviewEl.textContent = '';
    this._filePreviewEl.style.display = '';

    var preview = document.createElement('div');
    preview.className = 'chat-file-preview';

    if (imageUrl) {
      var img = document.createElement('img');
      img.src = imageUrl;
      img.alt = name;
      preview.appendChild(img);
    }

    var nameEl = document.createElement('span');
    nameEl.className = 'chat-file-preview-name';
    nameEl.textContent = name;
    preview.appendChild(nameEl);

    var removeBtn = document.createElement('button');
    removeBtn.className = 'chat-file-remove';
    removeBtn.textContent = '\u2715';
    removeBtn.setAttribute('aria-label', 'Remove file');
    removeBtn.addEventListener('click', () => this._clearFile());
    preview.appendChild(removeBtn);

    this._filePreviewEl.appendChild(preview);
  }

  _clearFile() {
    this._pendingFile = null;
    this._filePreviewEl.textContent = '';
    this._filePreviewEl.style.display = 'none';
  }

  // ── Download Conversation ─────────────────

  _showDownloadModal() {
    if (this._messages.length === 0) return;

    var overlay = document.createElement('div');
    overlay.className = 'download-modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'download-modal';

    var title = document.createElement('h3');
    title.textContent = ChatPanel.UI_TEXT.downloadFmt;
    modal.appendChild(title);

    var formats = [
      { label: 'Markdown (.md)', ext: 'md', fn: () => this._exportMarkdown() },
      { label: 'JSON (.json)', ext: 'json', fn: () => this._exportJSON() },
      { label: 'Text (.txt)', ext: 'txt', fn: () => this._exportText() },
    ];

    for (var i = 0; i < formats.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'download-option';
      btn.textContent = formats[i].label;
      (function(fmt) {
        btn.addEventListener('click', function() {
          fmt.fn();
          overlay.remove();
        });
      })(formats[i]);
      modal.appendChild(btn);
    }

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  _exportMarkdown() {
    var agentName = this.agent ? I18n.agentName(this.agent.id) : 'Agent';
    var lines = ['# ' + agentName + ' \u2014 Conversation', ''];
    for (var i = 0; i < this._messages.length; i++) {
      var m = this._messages[i];
      var time = m.time ? m.time.toLocaleTimeString() : '';
      var sender = m.role === 'user' ? 'You' : agentName;
      lines.push('**' + sender + '** (' + time + ')');
      lines.push(m.text);
      lines.push('');
    }
    this._downloadFile(agentName + '_chat.md', lines.join('\n'), 'text/markdown');
  }

  _exportJSON() {
    var agentName = this.agent ? I18n.agentName(this.agent.id) : 'Agent';
    var data = {
      agent: agentName,
      exported: new Date().toISOString(),
      messages: this._messages.map(function(m) {
        return { role: m.role, text: m.text, time: m.time ? m.time.toISOString() : null };
      }),
    };
    this._downloadFile(agentName + '_chat.json', JSON.stringify(data, null, 2), 'application/json');
  }

  _exportText() {
    var agentName = this.agent ? I18n.agentName(this.agent.id) : 'Agent';
    var lines = [agentName + ' — Conversation', ''];
    for (var i = 0; i < this._messages.length; i++) {
      var m = this._messages[i];
      var time = m.time ? m.time.toLocaleTimeString() : '';
      var sender = m.role === 'user' ? 'You' : agentName;
      lines.push('[' + time + '] ' + sender + ': ' + m.text);
    }
    this._downloadFile(agentName + '_chat.txt', lines.join('\n'), 'text/plain');
  }

  _downloadFile(name, content, type) {
    var blob = new Blob([content], { type: type + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  // ── Send Message ──────────────────────────

  _sendMessage() {
    var text = this._input.value.trim();

    // Attach file content to message if present
    if (this._pendingFile && this._pendingFile.data) {
      var fileInfo = '';
      if (this._pendingFile.file.type.startsWith('image/')) {
        fileInfo = '[Image: ' + this._pendingFile.file.name + ']';
      } else {
        fileInfo = '[File: ' + this._pendingFile.file.name + ']\n' + this._pendingFile.data;
      }
      text = text ? text + '\n\n' + fileInfo : fileInfo;
      this._clearFile();
    }

    if (!text || !this.agent) return;
    if (this._sending) return;

    this._sending = true;
    this._sendBtn.disabled = true;

    this.addMessage('user', text);
    this._input.value = '';
    this._autoResize();
    this._updateCharCount();

    if (this.onSend) {
      var sent = this.onSend(this.agent.id, text);
      if (!sent) {
        // Mark last user message as failed
        var last = this._messageList.lastElementChild;
        if (last) last.classList.add('chat-msg-failed');
        this.addMessage('system', '\u274C ' + I18n.t('chat.sendFail'));
      }
    }

    this._sending = false;
    this._sendBtn.disabled = false;
  }

  // ── DOM Management ────────────────────────

  _trimMessages() {
    // Virtual scrolling: keep max 100 DOM nodes, remove oldest
    while (this._messageList.children.length > 100) {
      this._messageList.removeChild(this._messageList.firstChild);
    }
  }

  _scrollToBottom() {
    this._messageList.scrollTop = this._messageList.scrollHeight;
  }
}
