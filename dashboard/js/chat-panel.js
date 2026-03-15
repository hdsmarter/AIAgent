/**
 * chat-panel.js — Full-width split chat (botrun.ai + LINE/TG style)
 * Left panel: agent list with avatar, name, status, last message
 * Right area: full chat with header, messages, input
 * Per-agent conversation memory: Map<agentId, messages[]>
 * Preserves: CJK composition, Markdown, streaming, file upload, retry
 *
 * UX features:
 * - Per-agent welcome message with role/personality
 * - Role/skill tags in chat header
 * - Image upload preview
 * - CJK composition safety (deferred compositionend)
 * - Empty state with suggestion prompts
 * - Input hints (Shift+Enter for newline)
 * - Status indicator in header
 * - Drag-and-drop file upload
 * - Download conversation (MD/JSON/TXT)
 * - Char count warning
 * - Accessibility: ARIA roles, live regions, focus management
 * - i18n: all strings via I18n singleton
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
      agentList:    I18n.t('chat.agentList') || 'AI Agents',
      searchAgent:  I18n.t('chat.searchAgent') || I18n.t('sidebar.search'),
      shiftEnter:   I18n.t('chat.shiftEnter'),
    };
  }

  constructor() {
    this.isOpen = false;
    this.agent = null;
    this.onSend = null;
    this._streaming = false;
    this._composing = false;
    this._sending = false;
    this._messages = [];
    this._pendingFile = null;
    this._agents = [];
    this._activeAgentId = null;

    // Per-agent conversation memory
    this._agentMessages = new Map();

    // Track which agents have been greeted
    this._greeted = new Set();

    // Container: the view-chat div
    this._container = document.getElementById('view-chat');

    I18n.onChange(() => this._updateTexts());
  }

  /**
   * Initialize the split layout with agents
   */
  init(agents) {
    this._agents = agents;
    this._build();
  }

  _build() {
    var T = ChatPanel.UI_TEXT;
    this._container.textContent = '';

    // Split layout
    var split = document.createElement('div');
    split.className = 'chat-split';

    // ── Left Panel: Agent List ──────────────────
    var leftPanel = document.createElement('aside');
    leftPanel.className = 'chat-agent-list-panel';

    // Header
    var listHeader = document.createElement('div');
    listHeader.className = 'chat-agent-list-header';
    listHeader.appendChild(svgFromTemplate(SvgIcons.robot));
    var headerText = document.createElement('span');
    headerText.textContent = T.agentList;
    listHeader.appendChild(headerText);
    leftPanel.appendChild(listHeader);

    // Search
    var searchWrap = document.createElement('div');
    searchWrap.className = 'chat-agent-search';
    this._agentSearchInput = document.createElement('input');
    this._agentSearchInput.type = 'text';
    this._agentSearchInput.placeholder = T.searchAgent;
    this._agentSearchInput.setAttribute('aria-label', T.searchAgent);
    this._agentSearchInput.addEventListener('input', () => this._filterAgentList());
    searchWrap.appendChild(this._agentSearchInput);
    leftPanel.appendChild(searchWrap);

    // Agent list
    this._agentListEl = document.createElement('ul');
    this._agentListEl.className = 'chat-agent-list';
    this._agentListEl.setAttribute('role', 'listbox');

    for (var i = 0; i < this._agents.length; i++) {
      this._agentListEl.appendChild(this._createAgentListItem(this._agents[i]));
    }
    leftPanel.appendChild(this._agentListEl);
    split.appendChild(leftPanel);

    // ── Right Area: Main Chat ───────────────────
    var mainArea = document.createElement('section');
    mainArea.className = 'chat-main-area';

    // Chat header
    var header = document.createElement('div');
    header.className = 'chat-header';

    this._headerLeft = document.createElement('div');
    this._headerLeft.className = 'chat-header-left';
    this._headerAvatar = document.createElement('div');
    this._headerAvatar.className = 'chat-header-avatar';
    this._headerAvatar.style.background = 'var(--accent)';
    this._headerAvatar.appendChild(svgFromTemplate(SvgIcons.robot));
    this._headerLeft.appendChild(this._headerAvatar);

    var headerInfo = document.createElement('div');
    headerInfo.className = 'chat-header-info';
    this._titleEl = document.createElement('div');
    this._titleEl.className = 'chat-header-name';
    this._titleEl.textContent = T.noAgent;
    this._roleEl = document.createElement('div');
    this._roleEl.className = 'chat-header-role';

    // Status indicator in header
    this._headerStatus = document.createElement('span');
    this._headerStatus.className = 'chat-header-status idle';
    this._titleEl.appendChild(this._headerStatus);

    headerInfo.appendChild(this._titleEl);
    headerInfo.appendChild(this._roleEl);

    // Skill tags row
    this._skillTags = document.createElement('div');
    this._skillTags.className = 'chat-header-tags';
    headerInfo.appendChild(this._skillTags);

    this._headerLeft.appendChild(headerInfo);
    header.appendChild(this._headerLeft);

    var actions = document.createElement('div');
    actions.className = 'chat-header-actions';
    this._downloadBtn = document.createElement('button');
    this._downloadBtn.className = 'chat-action-btn';
    this._downloadBtn.title = T.download;
    this._downloadBtn.setAttribute('aria-label', T.download);
    this._downloadBtn.appendChild(svgFromTemplate(SvgIcons.download));
    this._downloadBtn.addEventListener('click', () => this._showDownloadModal());
    actions.appendChild(this._downloadBtn);
    header.appendChild(actions);
    mainArea.appendChild(header);

    // Offline banner
    this._offlineBanner = document.createElement('div');
    this._offlineBanner.className = 'chat-offline-banner';
    this._offlineBanner.setAttribute('role', 'alert');
    this._offlineBanner.textContent = T.offline;
    mainArea.appendChild(this._offlineBanner);

    // Telegram fallback
    this._tgLink = document.createElement('a');
    this._tgLink.className = 'chat-tg-link';
    this._tgLink.href = ChatClient.DEFAULTS.tgBotLink;
    this._tgLink.target = '_blank';
    this._tgLink.rel = 'noopener';
    this._tgLink.textContent = T.openTelegram;
    this._tgLink.style.display = 'none';
    mainArea.appendChild(this._tgLink);

    // Messages list
    this._messageList = document.createElement('div');
    this._messageList.className = 'chat-messages';
    this._messageList.setAttribute('role', 'log');
    this._messageList.setAttribute('aria-live', 'polite');

    // Empty state (shown when no agent selected)
    this._emptyState = document.createElement('div');
    this._emptyState.className = 'chat-empty-state';
    this._emptyState.setAttribute('aria-label', T.noAgent);
    var emptyIcon = document.createElement('div');
    emptyIcon.className = 'chat-empty-icon';
    emptyIcon.appendChild(svgFromTemplate(SvgIcons.chat));
    this._emptyState.appendChild(emptyIcon);
    var emptyText = document.createElement('div');
    emptyText.className = 'chat-empty-text';
    emptyText.textContent = T.noAgent;
    this._emptyState.appendChild(emptyText);
    this._messageList.appendChild(this._emptyState);

    mainArea.appendChild(this._messageList);

    // Typing indicator
    this._typingEl = document.createElement('div');
    this._typingEl.className = 'chat-typing';
    this._typingEl.setAttribute('aria-live', 'polite');
    this._typingEl.textContent = T.typing;
    this._typingEl.style.display = 'none';
    mainArea.appendChild(this._typingEl);

    // File preview
    this._filePreviewEl = document.createElement('div');
    this._filePreviewEl.style.display = 'none';
    this._filePreviewEl.className = 'chat-file-preview-wrap';
    mainArea.appendChild(this._filePreviewEl);

    // Input area
    var inputArea = document.createElement('div');
    inputArea.className = 'chat-input-area';

    // Upload button
    this._uploadBtn = document.createElement('button');
    this._uploadBtn.className = 'chat-upload-btn';
    this._uploadBtn.title = T.upload;
    this._uploadBtn.setAttribute('aria-label', T.upload);
    this._uploadBtn.appendChild(svgFromTemplate(SvgIcons.clip));
    this._uploadBtn.addEventListener('click', () => this._triggerUpload());

    this._fileInput = document.createElement('input');
    this._fileInput.type = 'file';
    this._fileInput.accept = 'image/*,.pdf,.txt,.csv,.json,.doc,.docx,.xls,.xlsx';
    this._fileInput.style.display = 'none';
    this._fileInput.addEventListener('change', (e) => this._handleFileSelect(e));

    var inputWrap = document.createElement('div');
    inputWrap.className = 'chat-input-wrap';

    this._input = document.createElement('textarea');
    this._input.className = 'chat-input';
    this._input.rows = 1;
    this._input.placeholder = T.placeholder;
    this._input.setAttribute('aria-label', T.placeholder);

    // CJK composition tracking (robust: deferred compositionend)
    this._input.addEventListener('compositionstart', () => { this._composing = true; });
    this._input.addEventListener('compositionend', () => {
      // Defer compositionend to ensure keydown fires AFTER composition finishes
      // This prevents accidental send on Enter while composing CJK characters
      setTimeout(() => { this._composing = false; }, 0);
    });

    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !this._composing && !e.isComposing) {
        e.preventDefault();
        this._sendMessage();
      }
    });

    this._input.addEventListener('input', () => {
      this._autoResize();
      this._updateCharCount();
    });

    this._charCount = document.createElement('div');
    this._charCount.className = 'chat-char-count';

    inputWrap.appendChild(this._input);
    inputWrap.appendChild(this._charCount);

    // Send button
    this._sendBtn = document.createElement('button');
    this._sendBtn.className = 'chat-send-btn';
    this._sendBtn.setAttribute('aria-label', T.send);
    this._sendBtn.appendChild(svgFromTemplate(SvgIcons.chat));
    var sendLabel = document.createElement('span');
    sendLabel.textContent = T.send;
    this._sendBtn.appendChild(sendLabel);
    this._sendBtn.addEventListener('click', () => this._sendMessage());

    var inputActions = document.createElement('div');
    inputActions.className = 'chat-input-actions';
    inputActions.appendChild(this._uploadBtn);
    inputActions.appendChild(this._sendBtn);

    inputArea.appendChild(inputWrap);
    inputArea.appendChild(inputActions);

    // Input hint
    var inputHint = document.createElement('div');
    inputHint.className = 'chat-input-hint';
    inputHint.textContent = T.shiftEnter;
    inputArea.appendChild(inputHint);

    mainArea.appendChild(inputArea);
    mainArea.appendChild(this._fileInput);

    // Drag-and-drop
    var _dragCounter = 0;
    mainArea.addEventListener('dragenter', function(e) {
      e.preventDefault();
      _dragCounter++;
      mainArea.classList.add('drag-over');
    });
    mainArea.addEventListener('dragleave', function() {
      _dragCounter--;
      if (_dragCounter <= 0) {
        _dragCounter = 0;
        mainArea.classList.remove('drag-over');
      }
    });
    mainArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    mainArea.addEventListener('drop', (e) => {
      e.preventDefault();
      _dragCounter = 0;
      mainArea.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) this._processFile(e.dataTransfer.files[0]);
    });

    split.appendChild(mainArea);
    this._container.appendChild(split);
  }

  _createAgentListItem(agent) {
    var palette = PixelSprites.agentPalettes[agent.id];
    var bgColor = palette ? palette.shirt : '#004896';

    var li = document.createElement('li');
    li.className = 'chat-agent-list-item';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.dataset.agentId = agent.id;

    // Avatar
    var avatar = document.createElement('div');
    avatar.className = 'chat-agent-avatar';
    avatar.style.background = bgColor;
    avatar.appendChild(svgFromTemplate(SvgIcons.robot));
    li.appendChild(avatar);

    // Info
    var info = document.createElement('div');
    info.className = 'chat-agent-info';
    var name = document.createElement('div');
    name.className = 'chat-agent-name';
    name.textContent = I18n.agentName(agent.id);
    var lastMsg = document.createElement('div');
    lastMsg.className = 'chat-agent-last-msg';
    lastMsg.textContent = I18n.agentRole(agent.id);
    info.appendChild(name);
    info.appendChild(lastMsg);
    li.appendChild(info);

    // Status dot
    var statusDot = document.createElement('span');
    statusDot.className = 'chat-agent-status-dot idle';
    li.appendChild(statusDot);

    // Click
    li.addEventListener('click', function() {
      this.open(agent);
    }.bind(this));

    return li;
  }

  _filterAgentList() {
    var query = this._agentSearchInput.value.toLowerCase().trim();
    var items = this._agentListEl.querySelectorAll('.chat-agent-list-item');
    items.forEach(function(li) {
      var id = parseInt(li.dataset.agentId, 10);
      var name = I18n.agentName(id).toLowerCase();
      var role = I18n.agentRole(id).toLowerCase();
      var match = !query || name.includes(query) || role.includes(query);
      li.style.display = match ? '' : 'none';
    });
  }

  // ── Auto-resize / char count ──────────────────

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
    if (this._offlineBanner) this._offlineBanner.textContent = T.offline;
    if (this._tgLink) this._tgLink.textContent = T.openTelegram;
    if (this._typingEl) this._typingEl.textContent = this._streaming ? T.streaming : T.typing;
    if (this._input) this._input.placeholder = T.placeholder;
    if (this._input) this._input.setAttribute('aria-label', T.placeholder);

    if (this.agent && this._titleEl) {
      // Remove status dot temporarily, update text, re-add
      var statusEl = this._headerStatus;
      if (statusEl && statusEl.parentElement) statusEl.parentElement.removeChild(statusEl);
      this._titleEl.textContent = I18n.agentName(this.agent.id);
      if (statusEl) this._titleEl.appendChild(statusEl);
      this._roleEl.textContent = I18n.agentRole(this.agent.id);
      this._updateSkillTags(this.agent.id);
    } else if (this._titleEl) {
      var statusEl2 = this._headerStatus;
      if (statusEl2 && statusEl2.parentElement) statusEl2.parentElement.removeChild(statusEl2);
      this._titleEl.textContent = T.noAgent;
      if (statusEl2) this._titleEl.appendChild(statusEl2);
    }
  }

  _updateSkillTags(agentId) {
    if (!this._skillTags) return;
    this._skillTags.textContent = '';
    var roleParts = I18n.agentRole(agentId).split(/[,\u3001]/);
    for (var t = 0; t < Math.min(roleParts.length, 4); t++) {
      var tag = document.createElement('span');
      tag.className = 'chat-header-tag';
      tag.textContent = roleParts[t].trim();
      this._skillTags.appendChild(tag);
    }
  }

  // ── Public API ────────────────────────────────

  open(agent) {
    // Save current conversation
    if (this.agent && this._activeAgentId !== null) {
      this._saveConversation();
    }

    this.agent = agent;
    this._activeAgentId = agent.id;
    this.isOpen = true;
    this._streaming = false;
    this._clearFile();

    // Hide empty state
    if (this._emptyState) this._emptyState.style.display = 'none';

    // Update header
    var palette = PixelSprites.agentPalettes[agent.id];
    if (this._headerAvatar) this._headerAvatar.style.background = palette ? palette.shirt : 'var(--accent)';

    // Update name (keep status dot)
    if (this._titleEl) {
      var statusEl = this._headerStatus;
      if (statusEl && statusEl.parentElement) statusEl.parentElement.removeChild(statusEl);
      this._titleEl.textContent = I18n.agentName(agent.id);
      if (statusEl) this._titleEl.appendChild(statusEl);
    }
    if (this._roleEl) this._roleEl.textContent = I18n.agentRole(agent.id);

    // Update skill tags
    this._updateSkillTags(agent.id);

    // Restore or clear messages
    this._restoreConversation(agent.id);

    // Show welcome message on first open
    if (!this._greeted.has(agent.id) && this._messages.length === 0) {
      this._greeted.add(agent.id);
      this._showWelcomeMessage(agent);
    }

    // Update agent list active state
    if (this._agentListEl) {
      var items = this._agentListEl.querySelectorAll('.chat-agent-list-item');
      items.forEach(function(li) {
        var isActive = li.dataset.agentId === String(agent.id);
        li.classList.toggle('active', isActive);
        li.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    if (this._input) this._input.focus();
  }

  _showWelcomeMessage(agent) {
    var name = I18n.agentName(agent.id);
    var role = I18n.agentRole(agent.id);
    var greeting = '';

    if (I18n.lang === 'en') {
      greeting = 'Hi! I\'m ' + name + ', your ' + role + ' specialist. How can I help you today?';
    } else if (I18n.lang === 'zh-CN') {
      greeting = '\u4F60\u597D\uFF01\u6211\u662F ' + name + '\uFF0C\u64C5\u957F ' + role + '\u3002\u6709\u4EC0\u4E48\u53EF\u4EE5\u5E2E\u5230\u4F60\u7684\uFF1F';
    } else {
      greeting = '\u4F60\u597D\uFF01\u6211\u662F ' + name + '\uFF0C\u64C5\u9577 ' + role + '\u3002\u6709\u4EC0\u9EBC\u53EF\u4EE5\u5E6B\u5230\u4F60\u7684\uFF1F';
    }

    this.addMessage('agent', greeting);
  }

  close() {
    if (this.agent) this._saveConversation();
    this.isOpen = false;
    this.agent = null;
    this._streaming = false;
    this._clearFile();
  }

  setOffline(offline) {
    if (this._offlineBanner) this._offlineBanner.style.display = offline ? 'block' : 'none';
    if (this._input) this._input.disabled = offline;
    if (this._sendBtn) this._sendBtn.disabled = offline;
  }

  showTelegramFallback(show) {
    if (this._tgLink) this._tgLink.style.display = show ? 'block' : 'none';
  }

  setTyping(show) {
    if (this._typingEl) {
      this._typingEl.textContent = ChatPanel.UI_TEXT.typing;
      this._typingEl.style.display = show ? 'block' : 'none';
      if (show) this._scrollToBottom();
    }
  }

  addMessage(role, text, opts) {
    var time = new Date();
    var msg = { role: role, text: text, time: time, failed: opts && opts.failed };
    this._messages.push(msg);

    var msgEl = document.createElement('div');
    msgEl.className = 'chat-msg chat-msg-' + role;
    if (msg.failed) msgEl.classList.add('chat-msg-failed');

    // Avatar for agent messages
    if (role === 'agent' && this.agent) {
      var avatarEl = document.createElement('div');
      avatarEl.className = 'chat-msg-avatar';
      var palette = PixelSprites.agentPalettes[this.agent.id];
      avatarEl.style.background = palette ? palette.shirt : 'var(--accent)';
      avatarEl.appendChild(svgFromTemplate(SvgIcons.robot));
      msgEl.appendChild(avatarEl);
    }

    // Message content wrapper
    var contentWrap = document.createElement('div');
    contentWrap.className = 'chat-msg-content';

    // Meta
    var meta = document.createElement('div');
    meta.className = 'chat-msg-meta';
    var timeStr = String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');
    if (role === 'agent' && this.agent) {
      meta.textContent = I18n.agentName(this.agent.id) + ' \u00B7 ' + timeStr;
    } else {
      meta.textContent = timeStr;
    }

    // Copy button for agent messages
    if (role === 'agent') {
      var copyBtn = document.createElement('button');
      copyBtn.className = 'chat-msg-copy';
      copyBtn.setAttribute('aria-label', 'Copy');
      copyBtn.appendChild(svgFromTemplate(SvgIcons.copy));
      copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(text).then(function() {
          copyBtn.classList.add('copied');
          setTimeout(function() { copyBtn.classList.remove('copied'); }, 1500);
        }).catch(function() {});
      });
      meta.appendChild(copyBtn);
    }

    contentWrap.appendChild(meta);

    // Bubble
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    if (role === 'agent') {
      this._renderMarkdown(bubble, text);
    } else {
      // User messages: preserve whitespace + line breaks
      bubble.style.whiteSpace = 'pre-wrap';
      bubble.textContent = text;
    }
    contentWrap.appendChild(bubble);

    // Retry
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
      contentWrap.appendChild(retryBtn);
    }

    msgEl.appendChild(contentWrap);
    this._messageList.appendChild(msgEl);
    this._trimMessages();
    this._scrollToBottom();

    // Update agent list last message
    this._updateAgentListLastMsg(this._activeAgentId, text);
  }

  startStreamingMessage() {
    this._streaming = true;
    if (this._typingEl) {
      this._typingEl.textContent = ChatPanel.UI_TEXT.streaming;
      this._typingEl.style.display = 'block';
    }

    var msgEl = document.createElement('div');
    msgEl.className = 'chat-msg chat-msg-agent';
    msgEl.setAttribute('data-streaming', 'true');

    // Avatar
    if (this.agent) {
      var avatarEl = document.createElement('div');
      avatarEl.className = 'chat-msg-avatar';
      var palette = PixelSprites.agentPalettes[this.agent.id];
      avatarEl.style.background = palette ? palette.shirt : 'var(--accent)';
      avatarEl.appendChild(svgFromTemplate(SvgIcons.robot));
      msgEl.appendChild(avatarEl);
    }

    var contentWrap = document.createElement('div');
    contentWrap.className = 'chat-msg-content';

    var meta = document.createElement('div');
    meta.className = 'chat-msg-meta';
    var time = new Date();
    var timeStr = String(time.getHours()).padStart(2, '0') + ':' + String(time.getMinutes()).padStart(2, '0');
    if (this.agent) {
      meta.textContent = I18n.agentName(this.agent.id) + ' \u00B7 ' + timeStr;
    } else {
      meta.textContent = timeStr;
    }
    contentWrap.appendChild(meta);

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = '';
    contentWrap.appendChild(bubble);

    msgEl.appendChild(contentWrap);
    this._messageList.appendChild(msgEl);
    this._scrollToBottom();
  }

  updateLastAgentMessage(text) {
    var streamingMsg = this._messageList.querySelector('[data-streaming="true"]');
    if (streamingMsg) {
      var bubble = streamingMsg.querySelector('.chat-bubble');
      if (bubble) this._renderMarkdown(bubble, text);
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

        // Add copy button to meta after streaming
        var meta = streamingMsg.querySelector('.chat-msg-meta');
        if (meta) {
          var finalText = bubble.textContent;
          var copyBtn = document.createElement('button');
          copyBtn.className = 'chat-msg-copy';
          copyBtn.setAttribute('aria-label', 'Copy');
          copyBtn.appendChild(svgFromTemplate(SvgIcons.copy));
          copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(finalText).then(function() {
              copyBtn.classList.add('copied');
              setTimeout(function() { copyBtn.classList.remove('copied'); }, 1500);
            }).catch(function() {});
          });
          meta.appendChild(copyBtn);
        }
      }
    }
    this._streaming = false;
    if (this._typingEl) this._typingEl.style.display = 'none';
  }

  // Update agent status in left panel + header
  updateAgentStatus(agentId, status) {
    if (this._agentListEl) {
      var li = this._agentListEl.querySelector('[data-agent-id="' + agentId + '"]');
      if (li) {
        var dot = li.querySelector('.chat-agent-status-dot');
        if (dot) dot.className = 'chat-agent-status-dot ' + status;
      }
    }
    // Update header status if viewing this agent
    if (this.agent && this.agent.id === agentId && this._headerStatus) {
      this._headerStatus.className = 'chat-header-status ' + status;
    }
  }

  _updateAgentListLastMsg(agentId, text) {
    if (!this._agentListEl || agentId === null || agentId === undefined) return;
    var li = this._agentListEl.querySelector('[data-agent-id="' + agentId + '"]');
    if (li) {
      var lastMsg = li.querySelector('.chat-agent-last-msg');
      if (lastMsg) {
        lastMsg.textContent = text.length > 30 ? text.slice(0, 30) + '\u2026' : text;
      }
    }
  }

  // ── Per-agent conversation memory ─────────────

  _saveConversation() {
    if (this._activeAgentId !== null) {
      this._agentMessages.set(this._activeAgentId, this._messages.slice());
    }
  }

  _restoreConversation(agentId) {
    this._messageList.textContent = '';
    // Re-add empty state (hidden)
    if (this._emptyState) {
      this._emptyState.style.display = 'none';
      this._messageList.appendChild(this._emptyState);
    }

    var saved = this._agentMessages.get(agentId);
    if (saved && saved.length > 0) {
      this._messages = saved.slice();
      for (var i = 0; i < this._messages.length; i++) {
        this._renderSavedMessage(this._messages[i]);
      }
    } else {
      this._messages = [];
    }
    this._scrollToBottom();
  }

  _renderSavedMessage(msg) {
    var msgEl = document.createElement('div');
    msgEl.className = 'chat-msg chat-msg-' + msg.role;

    // Avatar for agent messages
    if (msg.role === 'agent' && this.agent) {
      var avatarEl = document.createElement('div');
      avatarEl.className = 'chat-msg-avatar';
      var palette = PixelSprites.agentPalettes[this.agent.id];
      avatarEl.style.background = palette ? palette.shirt : 'var(--accent)';
      avatarEl.appendChild(svgFromTemplate(SvgIcons.robot));
      msgEl.appendChild(avatarEl);
    }

    var contentWrap = document.createElement('div');
    contentWrap.className = 'chat-msg-content';

    var meta = document.createElement('div');
    meta.className = 'chat-msg-meta';
    var t = msg.time || new Date();
    var timeStr = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    if (msg.role === 'agent' && this.agent) {
      meta.textContent = I18n.agentName(this.agent.id) + ' \u00B7 ' + timeStr;
    } else {
      meta.textContent = timeStr;
    }

    // Copy button for agent messages
    if (msg.role === 'agent') {
      var copyBtn = document.createElement('button');
      copyBtn.className = 'chat-msg-copy';
      copyBtn.setAttribute('aria-label', 'Copy');
      copyBtn.appendChild(svgFromTemplate(SvgIcons.copy));
      (function(text) {
        copyBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(text).then(function() {
            copyBtn.classList.add('copied');
            setTimeout(function() { copyBtn.classList.remove('copied'); }, 1500);
          }).catch(function() {});
        });
      })(msg.text);
      meta.appendChild(copyBtn);
    }

    contentWrap.appendChild(meta);

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    if (msg.role === 'agent') {
      this._renderMarkdown(bubble, msg.text);
    } else {
      bubble.style.whiteSpace = 'pre-wrap';
      bubble.textContent = msg.text;
    }
    contentWrap.appendChild(bubble);

    msgEl.appendChild(contentWrap);
    this._messageList.appendChild(msgEl);
  }

  // ── Markdown Renderer (XSS-safe) ──────────────

  _renderMarkdown(el, text) {
    var tmp = document.createElement('span');
    tmp.textContent = text;
    var escaped = tmp.textContent;

    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    escaped = escaped.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    escaped = escaped.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    escaped = escaped.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    escaped = escaped.replace(/\n/g, '<br>');

    var range = document.createRange();
    el.textContent = '';
    var frag = range.createContextualFragment(escaped);
    el.appendChild(frag);
  }

  // ── File Upload ───────────────────────────────

  _triggerUpload() { this._fileInput.click(); }

  _handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) this._processFile(e.target.files[0]);
    this._fileInput.value = '';
  }

  _processFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      this.addMessage('system', ChatPanel.UI_TEXT.fileTooLarge);
      return;
    }
    this._pendingFile = { file: file, data: null };
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
        var w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          var ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio); h = Math.round(h * ratio);
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var quality = 0.8;
        var dataUrl = canvas.toDataURL('image/jpeg', quality);
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
      img.src = imageUrl; img.alt = name;
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
    if (this._filePreviewEl) {
      this._filePreviewEl.textContent = '';
      this._filePreviewEl.style.display = 'none';
    }
  }

  // ── Download ──────────────────────────────────

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
      { label: 'Markdown (.md)', fn: () => this._exportMarkdown() },
      { label: 'JSON (.json)', fn: () => this._exportJSON() },
      { label: 'Text (.txt)', fn: () => this._exportText() },
    ];
    for (var i = 0; i < formats.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'download-option';
      btn.textContent = formats[i].label;
      (function(fmt) {
        btn.addEventListener('click', function() { fmt.fn(); overlay.remove(); });
      })(formats[i]);
      modal.appendChild(btn);
    }

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.className = 'download-close';
    closeBtn.textContent = ChatPanel.UI_TEXT.close;
    closeBtn.addEventListener('click', function() { overlay.remove(); });
    modal.appendChild(closeBtn);

    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    // Escape key close
    var escHandler = function(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  _exportMarkdown() {
    var name = this.agent ? I18n.agentName(this.agent.id) : 'Agent';
    var lines = ['# ' + name + ' \u2014 Conversation', ''];
    this._messages.forEach(function(m) {
      var t = m.time ? m.time.toLocaleTimeString() : '';
      lines.push('**' + (m.role === 'user' ? 'You' : name) + '** (' + t + ')');
      lines.push(m.text); lines.push('');
    });
    this._downloadFile(name + '_chat.md', lines.join('\n'), 'text/markdown');
  }

  _exportJSON() {
    var name = this.agent ? I18n.agentName(this.agent.id) : 'Agent';
    var data = { agent: name, exported: new Date().toISOString(),
      messages: this._messages.map(function(m) { return { role: m.role, text: m.text, time: m.time ? m.time.toISOString() : null }; })
    };
    this._downloadFile(name + '_chat.json', JSON.stringify(data, null, 2), 'application/json');
  }

  _exportText() {
    var name = this.agent ? I18n.agentName(this.agent.id) : 'Agent';
    var lines = [name + ' \u2014 Conversation', ''];
    this._messages.forEach(function(m) {
      var t = m.time ? m.time.toLocaleTimeString() : '';
      lines.push('[' + t + '] ' + (m.role === 'user' ? 'You' : name) + ': ' + m.text);
    });
    this._downloadFile(name + '_chat.txt', lines.join('\n'), 'text/plain');
  }

  _downloadFile(name, content, type) {
    var blob = new Blob([content], { type: type + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  // ── Send Message ──────────────────────────────

  _sendMessage() {
    var text = this._input.value.trim();
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
    if (!text || !this.agent) {
      // Show hint if no agent selected
      if (!this.agent && this._input && this._input.value.trim()) {
        this._input.classList.add('shake');
        setTimeout(() => { this._input.classList.remove('shake'); }, 400);
      }
      return;
    }
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
        var last = this._messageList.lastElementChild;
        if (last) last.classList.add('chat-msg-failed');
        this.addMessage('system', '\u274C ' + I18n.t('chat.sendFail'));
      }
    }

    this._sending = false;
    this._sendBtn.disabled = false;
  }

  // ── DOM Management ────────────────────────────

  _trimMessages() {
    while (this._messageList.children.length > 100) {
      var first = this._messageList.firstChild;
      // Don't remove empty state
      if (first === this._emptyState) {
        if (this._messageList.children.length > 101) {
          this._messageList.removeChild(this._messageList.children[1]);
        } else {
          break;
        }
      } else {
        this._messageList.removeChild(first);
      }
    }
  }

  _scrollToBottom() {
    this._messageList.scrollTop = this._messageList.scrollHeight;
  }
}
