/**
 * i18n.js — Internationalization singleton (zh-TW / zh-CN / en)
 * Load order: FIRST (before all other scripts)
 * Pattern: global singleton like PixelSprites
 * Zero hardcoded user-facing strings
 */
const I18n = {
  _lang: 'zh-TW',
  _listeners: [],

  langs: ['zh-TW', 'zh-CN', 'en'],

  strings: {
    // ── Auth Gate ──────────────────────────────
    'auth.title':     { 'zh-TW': '\u8ACB\u5148\u767B\u5165',         'zh-CN': '\u8BF7\u5148\u767B\u5F55',         en: 'Login Required' },
    'auth.userLabel': { 'zh-TW': '\u5E33\u865F',             'zh-CN': '\u8D26\u53F7',             en: 'Username' },
    'auth.passLabel': { 'zh-TW': '\u5BC6\u78BC',             'zh-CN': '\u5BC6\u7801',             en: 'Password' },
    'auth.loginBtn':  { 'zh-TW': '\u767B\u5165',             'zh-CN': '\u767B\u5F55',             en: 'Login' },
    'auth.error':     { 'zh-TW': '\u5E33\u865F\u6216\u5BC6\u78BC\u932F\u8AA4', 'zh-CN': '\u8D26\u53F7\u6216\u5BC6\u7801\u9519\u8BEF', en: 'Invalid credentials' },
    'auth.logoutBtn': { 'zh-TW': '\u767B\u51FA',             'zh-CN': '\u9000\u51FA',             en: 'Logout' },

    // ── Chat Panel ──────────────────────────────
    'chat.title':        { 'zh-TW': '\u5C0D\u8A71',           'zh-CN': '\u5BF9\u8BDD',            en: 'Chat' },
    'chat.placeholder':  { 'zh-TW': '\u8F38\u5165\u8A0A\u606F\u2026 (Shift+Enter \u63DB\u884C)', 'zh-CN': '\u8F93\u5165\u6D88\u606F\u2026 (Shift+Enter \u6362\u884C)', en: 'Type message\u2026 (Shift+Enter for newline)' },
    'chat.send':         { 'zh-TW': '\u767C\u9001',           'zh-CN': '\u53D1\u9001',            en: 'Send' },
    'chat.offline':      { 'zh-TW': '\u96E2\u7DDA\u6A21\u5F0F \u2014 \u672A\u9023\u7DDA', 'zh-CN': '\u79BB\u7EBF\u6A21\u5F0F \u2014 \u672A\u8FDE\u7EBF', en: 'Offline \u2014 not connected' },
    'chat.typing':       { 'zh-TW': '\u601D\u8003\u4E2D...',      'zh-CN': '\u601D\u8003\u4E2D...',       en: 'Thinking...' },
    'chat.streaming':    { 'zh-TW': '\u7522\u751F\u4E2D...',      'zh-CN': '\u751F\u6210\u4E2D...',       en: 'Generating...' },
    'chat.close':        { 'zh-TW': '\u95DC\u9589',           'zh-CN': '\u5173\u95ED',            en: 'Close' },
    'chat.noAgent':      { 'zh-TW': '\u8ACB\u9EDE\u64CA Agent \u958B\u59CB\u5C0D\u8A71', 'zh-CN': '\u8BF7\u70B9\u51FB Agent \u5F00\u59CB\u5BF9\u8BDD', en: 'Click an Agent to start chatting' },
    'chat.sendFail':     { 'zh-TW': '\u7121\u6CD5\u50B3\u9001\uFF0C\u672A\u9023\u7DDA', 'zh-CN': '\u65E0\u6CD5\u53D1\u9001\uFF0C\u672A\u8FDE\u7EBF', en: 'Cannot send, not connected' },
    'chat.openTelegram': { 'zh-TW': '\u5728 Telegram \u958B\u555F\u5C0D\u8A71', 'zh-CN': '\u5728 Telegram \u6253\u5F00\u5BF9\u8BDD', en: 'Open chat in Telegram' },
    'chat.upload':       { 'zh-TW': '\u4E0A\u50B3\u6A94\u6848',       'zh-CN': '\u4E0A\u4F20\u6587\u4EF6',       en: 'Upload file' },
    'chat.download':     { 'zh-TW': '\u4E0B\u8F09\u5C0D\u8A71',       'zh-CN': '\u4E0B\u8F7D\u5BF9\u8BDD',       en: 'Download' },
    'chat.retry':        { 'zh-TW': '\u91CD\u8A66',           'zh-CN': '\u91CD\u8BD5',            en: 'Retry' },
    'chat.fileTooLarge': { 'zh-TW': '\u6A94\u6848\u8D85\u904E 10MB \u9650\u5236', 'zh-CN': '\u6587\u4EF6\u8D85\u8FC7 10MB \u9650\u5236', en: 'File exceeds 10MB limit' },
    'chat.emptyMsg':     { 'zh-TW': '\u8ACB\u8F38\u5165\u8A0A\u606F',       'zh-CN': '\u8BF7\u8F93\u5165\u6D88\u606F',       en: 'Please enter a message' },
    'chat.downloadFmt':  { 'zh-TW': '\u532F\u51FA\u683C\u5F0F',       'zh-CN': '\u5BFC\u51FA\u683C\u5F0F',       en: 'Export format' },
    'chat.charCount':    { 'zh-TW': '\u5B57\u5143',           'zh-CN': '\u5B57\u7B26',            en: 'characters' },
    'chat.sending':      { 'zh-TW': '\u767C\u9001\u4E2D\u2026',       'zh-CN': '\u53D1\u9001\u4E2D\u2026',       en: 'Sending\u2026' },
    'chat.shiftEnter':   { 'zh-TW': 'Shift+Enter \u63DB\u884C', 'zh-CN': 'Shift+Enter \u6362\u884C', en: 'Shift+Enter for newline' },
    'chat.imageUploaded': { 'zh-TW': '\u8ACB\u5206\u6790\u9019\u5F35\u5716\u7247', 'zh-CN': '\u8BF7\u5206\u6790\u8FD9\u5F20\u56FE\u7247', en: 'Please analyze this image' },

    // ── Settings Panel ──────────────────────────
    'settings.title':          { 'zh-TW': '\u8A2D\u5B9A',           'zh-CN': '\u8BBE\u7F6E',           en: 'Settings' },
    'settings.langLabel':      { 'zh-TW': '\u4ECB\u9762\u8A9E\u8A00',       'zh-CN': '\u754C\u9762\u8BED\u8A00',       en: 'Language' },
    'settings.chatModeLabel':  { 'zh-TW': '\u5C0D\u8A71\u6A21\u5F0F',       'zh-CN': '\u5BF9\u8BDD\u6A21\u5F0F',       en: 'Chat Mode' },
    'settings.chatModeTg':     { 'zh-TW': 'Telegram Bot',   'zh-CN': 'Telegram Bot',   en: 'Telegram Bot' },
    'settings.chatModeGw':     { 'zh-TW': 'Gateway WebSocket', 'zh-CN': 'Gateway WebSocket', en: 'Gateway WebSocket' },
    'settings.chatModeOr':     { 'zh-TW': 'OpenRouter API', 'zh-CN': 'OpenRouter API', en: 'OpenRouter API' },
    'settings.chatModeGwApi':  { 'zh-TW': 'Gateway API (Gemini)', 'zh-CN': 'Gateway API (Gemini)', en: 'Gateway API (Gemini)' },
    'settings.gwApiUrlLabel':  { 'zh-TW': 'Gateway URL',  'zh-CN': 'Gateway URL',  en: 'Gateway URL' },
    'settings.gwApiUrlPlaceholder': { 'zh-TW': 'https://xxx.ngrok-free.app', 'zh-CN': 'https://xxx.ngrok-free.app', en: 'https://xxx.ngrok-free.app' },
    'settings.gwApiTokenLabel': { 'zh-TW': '\u8A8D\u8B49\u4EE4\u724C', 'zh-CN': '\u8BA4\u8BC1\u4EE4\u724C', en: 'Auth Token' },
    'settings.gwApiModelLabel': { 'zh-TW': '\u6A21\u578B', 'zh-CN': '\u6A21\u578B', en: 'Model' },
    'settings.urlLabel':       { 'zh-TW': '\u9598\u9053\u5668\u4F4D\u5740',     'zh-CN': '\u7F51\u5173\u5730\u5740',       en: 'Gateway URL' },
    'settings.urlPlaceholder': { 'zh-TW': 'ws://localhost:18789', 'zh-CN': 'ws://localhost:18789', en: 'ws://localhost:18789' },
    'settings.tokenLabel':     { 'zh-TW': '\u8A8D\u8B49\u4EE4\u724C',       'zh-CN': '\u8BA4\u8BC1\u4EE4\u724C',       en: 'Auth Token' },
    'settings.tokenPlaceholder': { 'zh-TW': '\uFF08\u9078\u586B\uFF09',     'zh-CN': '\uFF08\u9009\u586B\uFF09',       en: '(optional)' },
    'settings.tgTokenLabel':   { 'zh-TW': 'Bot Token',      'zh-CN': 'Bot Token',      en: 'Bot Token' },
    'settings.tgChatIdLabel':  { 'zh-TW': 'Chat ID',        'zh-CN': 'Chat ID',        en: 'Chat ID' },
    'settings.orApiKeyLabel':  { 'zh-TW': 'API Key',        'zh-CN': 'API Key',        en: 'API Key' },
    'settings.orModelLabel':   { 'zh-TW': '\u6A21\u578B\u540D\u7A31',        'zh-CN': '\u6A21\u578B\u540D\u79F0',        en: 'Model Name' },
    'settings.orApiKeyPlaceholder': { 'zh-TW': 'sk-or-...', 'zh-CN': 'sk-or-...', en: 'sk-or-...' },
    'settings.testBtn':        { 'zh-TW': '\u6E2C\u8A66\u9023\u7DDA',       'zh-CN': '\u6D4B\u8BD5\u8FDE\u63A5',       en: 'Test' },
    'settings.saveBtn':        { 'zh-TW': '\u5132\u5B58',           'zh-CN': '\u4FDD\u5B58',           en: 'Save' },
    'settings.cancelBtn':      { 'zh-TW': '\u53D6\u6D88',           'zh-CN': '\u53D6\u6D88',           en: 'Cancel' },
    'settings.testing':        { 'zh-TW': '\u6E2C\u8A66\u4E2D...',      'zh-CN': '\u6D4B\u8BD5\u4E2D...',      en: 'Testing...' },
    'settings.testOk':         { 'zh-TW': '\u9023\u7DDA\u6210\u529F',       'zh-CN': '\u8FDE\u63A5\u6210\u529F',       en: 'Connected' },
    'settings.testFail':       { 'zh-TW': '\u9023\u7DDA\u5931\u6557',       'zh-CN': '\u8FDE\u63A5\u5931\u8D25',       en: 'Failed' },
    'settings.statusConnected':    { 'zh-TW': '\u5DF2\u9023\u7DDA',     'zh-CN': '\u5DF2\u8FDE\u63A5',         en: 'Connected' },
    'settings.statusConnecting':   { 'zh-TW': '\u9023\u7DDA\u4E2D...',  'zh-CN': '\u8FDE\u63A5\u4E2D...',      en: 'Connecting...' },
    'settings.statusDisconnected': { 'zh-TW': '\u672A\u9023\u7DDA',     'zh-CN': '\u672A\u8FDE\u63A5',         en: 'Disconnected' },

    // ── App / Status Bar ────────────────────────
    'app.connected':    { 'zh-TW': '\u5DF2\u9023\u7DDA\u5230\u9598\u9053\u5668',  'zh-CN': '\u5DF2\u8FDE\u63A5\u5230\u7F51\u5173',   en: 'Connected to gateway' },
    'app.disconnected': { 'zh-TW': '\u9598\u9053\u5668\u9023\u7DDA\u4E2D\u65B7',  'zh-CN': '\u7F51\u5173\u8FDE\u63A5\u4E2D\u65AD',   en: 'Gateway disconnected' },
    'app.sendFail':     { 'zh-TW': '\u7121\u6CD5\u50B3\u9001\uFF0C\u9598\u9053\u5668\u672A\u9023\u7DDA', 'zh-CN': '\u65E0\u6CD5\u53D1\u9001\uFF0C\u7F51\u5173\u672A\u8FDE\u7EBF', en: 'Cannot send, gateway offline' },
    'app.agents':       { 'zh-TW': '\u500B Agent',        'zh-CN': '\u4E2A Agent',       en: 'Agents' },
    'app.settings':     { 'zh-TW': '\u8A2D\u5B9A',            'zh-CN': '\u8BBE\u7F6E',           en: 'Settings' },
    'app.gwRunning':    { 'zh-TW': '\u904B\u884C\u4E2D',          'zh-CN': '\u8FD0\u884C\u4E2D',         en: 'Running' },
    'app.gwOffline':    { 'zh-TW': '\u96E2\u7DDA',            'zh-CN': '\u79BB\u7EBF',           en: 'Offline' },
    'app.themeLight':   { 'zh-TW': '\u6DFA\u8272\u4E3B\u984C',        'zh-CN': '\u6D45\u8272\u4E3B\u9898',       en: 'Light Theme' },
    'app.themeDark':    { 'zh-TW': '\u6DF1\u8272\u4E3B\u984C',        'zh-CN': '\u6DF1\u8272\u4E3B\u9898',       en: 'Dark Theme' },
    'app.themeToggle':  { 'zh-TW': '\u5207\u63DB\u4E3B\u984C',        'zh-CN': '\u5207\u6362\u4E3B\u9898',       en: 'Toggle Theme' },
    'app.agentList':    { 'zh-TW': 'Agent \u5217\u8868',     'zh-CN': 'Agent \u5217\u8868',     en: 'Agent List' },

    // ── Sidebar + Views ───────────────────────────
    'sidebar.title':    { 'zh-TW': 'AI \u52A9\u7406\u5718\u968A',     'zh-CN': 'AI \u52A9\u7406\u56E2\u961F',     en: 'AI Agent Team' },
    'sidebar.search':   { 'zh-TW': '\u641C\u5C0B\u52A9\u7406\u2026',       'zh-CN': '\u641C\u7D22\u52A9\u7406\u2026',       en: 'Search agents\u2026' },
    'view.workspace':   { 'zh-TW': '\u5DE5\u4F5C\u5340',         'zh-CN': '\u5DE5\u4F5C\u533A',         en: 'Workspace' },
    'view.office':      { 'zh-TW': '\u8FA6\u516C\u5BA4',         'zh-CN': '\u529E\u516C\u5BA4',         en: 'Office' },
    'workspace.lastMsg':  { 'zh-TW': '\u6700\u5F8C\u8A0A\u606F',     'zh-CN': '\u6700\u540E\u6D88\u606F',     en: 'Last message' },
    'workspace.noChat':   { 'zh-TW': '\u5C1A\u672A\u958B\u59CB\u5C0D\u8A71', 'zh-CN': '\u5C1A\u672A\u5F00\u59CB\u5BF9\u8BDD', en: 'No conversation yet' },
    'chat.offline2':      { 'zh-TW': '\u9023\u7DDA\u4E2D\u65B7\uFF0C\u8ACB\u6AA2\u67E5\u8A2D\u5B9A', 'zh-CN': '\u8FDE\u7EBF\u4E2D\u65AD\uFF0C\u8BF7\u68C0\u67E5\u8BBE\u7F6E', en: 'Disconnected, check settings' },

    // ── Nav Sidebar ──────────────────────────────
    'nav.dashboard':       { 'zh-TW': '\u63A7\u5236\u53F0',       'zh-CN': '\u63A7\u5236\u53F0',       en: 'Dashboard' },
    'nav.aiAssistant':     { 'zh-TW': 'AI \u52A9\u7406',     'zh-CN': 'AI \u52A9\u7406',     en: 'AI Assistant' },
    'nav.agentOverview':   { 'zh-TW': '\u52A9\u7406\u7E3D\u89BD',     'zh-CN': '\u52A9\u7406\u603B\u89C8',     en: 'Agent Overview' },
    'nav.conversation':    { 'zh-TW': '\u5C0D\u8A71',         'zh-CN': '\u5BF9\u8BDD',         en: 'Conversation' },
    'nav.office':          { 'zh-TW': '\u8FA6\u516C\u5BA4\u5834\u666F',   'zh-CN': '\u529E\u516C\u5BA4\u573A\u666F',   en: 'Office Scene' },
    'nav.settings':        { 'zh-TW': '\u8A2D\u5B9A',         'zh-CN': '\u8BBE\u7F6E',         en: 'Settings' },
    'nav.connection':      { 'zh-TW': '\u9023\u7DDA\u8A2D\u5B9A',     'zh-CN': '\u8FDE\u7EBF\u8BBE\u7F6E',     en: 'Connection' },
    'nav.language':        { 'zh-TW': '\u8A9E\u8A00',         'zh-CN': '\u8BED\u8A00',         en: 'Language' },
    'nav.theme':           { 'zh-TW': '\u4E3B\u984C',         'zh-CN': '\u4E3B\u9898',         en: 'Theme' },
    'nav.account':         { 'zh-TW': '\u5E33\u6236',         'zh-CN': '\u8D26\u6237',         en: 'Account' },
    'nav.security':        { 'zh-TW': '\u5B89\u5168\u8A2D\u5B9A',     'zh-CN': '\u5B89\u5168\u8BBE\u7F6E',     en: 'Security' },
    'nav.logout':          { 'zh-TW': '\u767B\u51FA',         'zh-CN': '\u9000\u51FA',         en: 'Logout' },
    'nav.agents':          { 'zh-TW': '\u52A9\u7406',         'zh-CN': '\u52A9\u7406',         en: 'Agents' },
    'nav.searchAgents':    { 'zh-TW': '\u641C\u5C0B\u52A9\u7406\u2026',   'zh-CN': '\u641C\u7D22\u52A9\u7406\u2026',   en: 'Search agents\u2026' },
    'nav.searchPlaceholder': { 'zh-TW': '\u641C\u5C0B\u2026',     'zh-CN': '\u641C\u7D22\u2026',       en: 'Search\u2026' },
    'nav.chat':            { 'zh-TW': '\u5C0D\u8A71',         'zh-CN': '\u5BF9\u8BDD',         en: 'Chat' },

    // ── Dashboard View ───────────────────────────
    'dash.morning':        { 'zh-TW': '\u65E9\u5B89\uFF0C',       'zh-CN': '\u65E9\u4E0A\u597D\uFF0C',     en: 'Good morning, ' },
    'dash.afternoon':      { 'zh-TW': '\u5348\u5B89\uFF0C',       'zh-CN': '\u4E0B\u5348\u597D\uFF0C',     en: 'Good afternoon, ' },
    'dash.evening':        { 'zh-TW': '\u665A\u5B89\uFF0C',       'zh-CN': '\u665A\u4E0A\u597D\uFF0C',     en: 'Good evening, ' },
    'dash.welcomeSub':     { 'zh-TW': '\u6B61\u8FCE\u4F7F\u7528 HD \u667A\u52D5\u5316 AI Agent \u5E73\u53F0', 'zh-CN': '\u6B22\u8FCE\u4F7F\u7528 HD \u667A\u52A8\u5316 AI Agent \u5E73\u53F0', en: 'Welcome to HD Smarter AI Agent Platform' },
    'dash.startChat':      { 'zh-TW': '\u958B\u59CB\u5C0D\u8A71',     'zh-CN': '\u5F00\u59CB\u5BF9\u8BDD',     en: 'Start Chat' },
    'dash.viewAgents':     { 'zh-TW': '\u67E5\u770B\u52A9\u7406',     'zh-CN': '\u67E5\u770B\u52A9\u7406',     en: 'View Agents' },
    'dash.officeScene':    { 'zh-TW': '\u8FA6\u516C\u5BA4\u5834\u666F',   'zh-CN': '\u529E\u516C\u5BA4\u573A\u666F',   en: 'Office Scene' },
    'dash.connSettings':   { 'zh-TW': '\u9023\u7DDA\u8A2D\u5B9A',     'zh-CN': '\u8FDE\u7EBF\u8BBE\u7F6E',     en: 'Connection' },
    'dash.agentCount':     { 'zh-TW': 'AI \u52A9\u7406\u6578',   'zh-CN': 'AI \u52A9\u7406\u6570',   en: 'AI Agents' },
    'dash.gatewayStatus':  { 'zh-TW': 'Gateway \u72C0\u614B', 'zh-CN': 'Gateway \u72B6\u6001', en: 'Gateway Status' },
    'dash.telegramStatus': { 'zh-TW': 'Telegram \u72C0\u614B', 'zh-CN': 'Telegram \u72B6\u6001', en: 'Telegram Status' },
    'dash.lineStatus':     { 'zh-TW': 'LINE \u72C0\u614B',   'zh-CN': 'LINE \u72B6\u6001',   en: 'LINE Status' },
    'dash.recentChats':    { 'zh-TW': '\u8FD1\u671F\u5C0D\u8A71',     'zh-CN': '\u8FD1\u671F\u5BF9\u8BDD',     en: 'Recent Conversations' },
    'dash.noRecentChats':  { 'zh-TW': '\u5C1A\u7121\u5C0D\u8A71\u8A18\u9304', 'zh-CN': '\u6682\u65E0\u5BF9\u8BDD\u8BB0\u5F55', en: 'No recent conversations' },
    'dash.systemActivity': { 'zh-TW': '\u7CFB\u7D71\u6D3B\u52D5',     'zh-CN': '\u7CFB\u7EDF\u6D3B\u52A8',     en: 'System Activity' },
    'dash.noActivity':     { 'zh-TW': '\u5C1A\u7121\u6D3B\u52D5',     'zh-CN': '\u6682\u65E0\u6D3B\u52A8',     en: 'No activity' },

    // ── Agents View ──────────────────────────────
    'agents.filterAll':    { 'zh-TW': '\u5168\u90E8',         'zh-CN': '\u5168\u90E8',         en: 'All' },
    'agents.filterActive': { 'zh-TW': '\u57F7\u884C\u4E2D',       'zh-CN': '\u8FD0\u884C\u4E2D',       en: 'Active' },
    'agents.filterIdle':   { 'zh-TW': '\u5F85\u547D',         'zh-CN': '\u5F85\u547D',         en: 'Idle' },
    'agents.online':       { 'zh-TW': '\u5DF2\u4E0A\u7DDA',       'zh-CN': '\u5DF2\u4E0A\u7EBF',       en: 'Online' },
    'agents.active':       { 'zh-TW': '\u57F7\u884C\u4E2D',       'zh-CN': '\u8FD0\u884C\u4E2D',       en: 'Active' },
    'agents.startChat':    { 'zh-TW': '\u958B\u59CB\u5C0D\u8A71',     'zh-CN': '\u5F00\u59CB\u5BF9\u8BDD',     en: 'Start Chat' },

    // ── Chat View ────────────────────────────────
    'chat.agentList':      { 'zh-TW': 'AI \u52A9\u7406',     'zh-CN': 'AI \u52A9\u7406',     en: 'AI Agents' },
    'chat.searchAgent':    { 'zh-TW': '\u641C\u5C0B\u52A9\u7406\u2026',   'zh-CN': '\u641C\u7D22\u52A9\u7406\u2026',   en: 'Search agents\u2026' },

    // ── Settings View ────────────────────────────
    'settings.themeLabel':   { 'zh-TW': '\u4E3B\u984C',       'zh-CN': '\u4E3B\u9898',         en: 'Theme' },
    'settings.securityInfo': { 'zh-TW': '\u767B\u5165\u968E\u6BB5\u5B89\u5168\u8A2D\u5B9A\u3002\u9592\u7F6E 30 \u5206\u9418\u5C07\u81EA\u52D5\u767B\u51FA\u3002', 'zh-CN': '\u767B\u5F55\u4F1A\u8BDD\u5B89\u5168\u8BBE\u7F6E\u3002\u95F2\u7F6E 30 \u5206\u949F\u5C06\u81EA\u52A8\u9000\u51FA\u3002', en: 'Session security settings. Auto-logout after 30 minutes of inactivity.' },

    // ── Office Scene — State Names ──────────────
    'state.type':  { 'zh-TW': '\u5DE5\u4F5C\u4E2D',   'zh-CN': '\u5DE5\u4F5C\u4E2D',   en: 'Working' },
    'state.walk':  { 'zh-TW': '\u8D70\u52D5\u4E2D',   'zh-CN': '\u8D70\u52A8\u4E2D',   en: 'Walking' },
    'state.idle':  { 'zh-TW': '\u4F11\u606F\u4E2D',   'zh-CN': '\u4F11\u606F\u4E2D',   en: 'Resting' },

    // ── Real Agent Status ───────────────────────
    'status.active':  { 'zh-TW': '\u57F7\u884C\u4EFB\u52D9\u4E2D', 'zh-CN': '\u6267\u884C\u4EFB\u52A1\u4E2D', en: 'Active' },
    'status.idle':    { 'zh-TW': '\u5F85\u547D',       'zh-CN': '\u5F85\u547D',       en: 'Idle' },
    'status.offline': { 'zh-TW': '\u96E2\u7DDA',       'zh-CN': '\u79BB\u7EBF',       en: 'Offline' },

    // ── Agent Names (16) ────────────────────────
    'agent.0':  { 'zh-TW': '\u6578\u64DA\u5206\u6790\u5E2B',     'zh-CN': '\u6570\u636E\u5206\u6790\u5E08',     en: 'Data Analyst' },
    'agent.1':  { 'zh-TW': '\u884C\u92B7\u7B56\u7565\u5E2B',     'zh-CN': '\u8425\u9500\u7B56\u7565\u5E08',     en: 'Marketing Strategist' },
    'agent.2':  { 'zh-TW': '\u8CA1\u52D9\u9867\u554F',       'zh-CN': '\u8D22\u52A1\u987E\u95EE',       en: 'Finance Advisor' },
    'agent.3':  { 'zh-TW': '\u4EBA\u8CC7\u7BA1\u7406\u5E2B',     'zh-CN': '\u4EBA\u8D44\u7BA1\u7406\u5E08',     en: 'HR Manager' },
    'agent.4':  { 'zh-TW': '\u4F9B\u61C9\u93C8\u5C08\u5BB6',     'zh-CN': '\u4F9B\u5E94\u94FE\u4E13\u5BB6',     en: 'Supply Chain Expert' },
    'agent.5':  { 'zh-TW': 'IT \u67B6\u69CB\u5E2B',      'zh-CN': 'IT \u67B6\u6784\u5E08',      en: 'IT Architect' },
    'agent.6':  { 'zh-TW': '\u5C08\u6848\u7D93\u7406',       'zh-CN': '\u9879\u76EE\u7ECF\u7406',       en: 'Project Manager' },
    'agent.7':  { 'zh-TW': '\u5BA2\u670D\u4E3B\u7BA1',       'zh-CN': '\u5BA2\u670D\u4E3B\u7BA1',       en: 'Customer Service Lead' },
    'agent.8':  { 'zh-TW': '\u6CD5\u52D9\u9867\u554F',       'zh-CN': '\u6CD5\u52A1\u987E\u95EE',       en: 'Legal Advisor' },
    'agent.9':  { 'zh-TW': '\u7522\u54C1\u7D93\u7406',       'zh-CN': '\u4EA7\u54C1\u7ECF\u7406',       en: 'Product Manager' },
    'agent.10': { 'zh-TW': 'UX \u8A2D\u8A08\u5E2B',      'zh-CN': 'UX \u8BBE\u8BA1\u5E08',      en: 'UX Designer' },
    'agent.11': { 'zh-TW': '\u5167\u5BB9\u7B56\u7565\u5E2B',     'zh-CN': '\u5185\u5BB9\u7B56\u7565\u5E08',     en: 'Content Strategist' },
    'agent.12': { 'zh-TW': '\u696D\u52D9\u958B\u767C\u7D93\u7406',   'zh-CN': '\u4E1A\u52A1\u5F00\u53D1\u7ECF\u7406',   en: 'BD Manager' },
    'agent.13': { 'zh-TW': '\u54C1\u8CEA\u7BA1\u7406\u5E2B',     'zh-CN': '\u54C1\u8D28\u7BA1\u7406\u5E08',     en: 'Quality Manager' },
    'agent.14': { 'zh-TW': '\u8CC7\u5B89\u5C08\u5BB6',       'zh-CN': '\u4FE1\u606F\u5B89\u5168\u4E13\u5BB6',   en: 'Security Expert' },
    'agent.15': { 'zh-TW': '\u4EBA\u529B\u8CC7\u6E90\u7E3D\u76E3',   'zh-CN': '\u4EBA\u529B\u8D44\u6E90\u603B\u76D1',   en: 'HR Director' },

    // ── Agent Role Descriptions ─────────────────
    'role.0':  { 'zh-TW': 'SQL\u3001KPI\u3001\u5831\u8868',        'zh-CN': 'SQL\u3001KPI\u3001\u62A5\u8868',       en: 'SQL, KPI, Reports' },
    'role.1':  { 'zh-TW': '\u884C\u92B7\u3001\u54C1\u724C\u3001\u5E02\u5834',      'zh-CN': '\u8425\u9500\u3001\u54C1\u724C\u3001\u5E02\u573A',     en: 'Campaign, Brand, Market' },
    'role.2':  { 'zh-TW': '\u9810\u7B97\u3001\u9810\u6E2C\u3001ROI',        'zh-CN': '\u9884\u7B97\u3001\u9884\u6D4B\u3001ROI',      en: 'Budget, Forecast, ROI' },
    'role.3':  { 'zh-TW': '\u62DB\u8058\u3001\u653F\u7B56\u3001\u54E1\u5DE5',       'zh-CN': '\u62DB\u8058\u3001\u653F\u7B56\u3001\u5458\u5DE5',     en: 'Recruit, Policy, Staff' },
    'role.4':  { 'zh-TW': '\u7269\u6D41\u3001\u5EAB\u5B58\u3001\u63A1\u8CFC',       'zh-CN': '\u7269\u6D41\u3001\u5E93\u5B58\u3001\u91C7\u8D2D',     en: 'Logistics, Inventory, Procurement' },
    'role.5':  { 'zh-TW': '\u7CFB\u7D71\u3001\u96F2\u7AEF\u3001DevOps',     'zh-CN': '\u7CFB\u7EDF\u3001\u4E91\u7AEF\u3001DevOps',   en: 'Systems, Cloud, DevOps' },
    'role.6':  { 'zh-TW': '\u6642\u7A0B\u3001Sprint\u3001\u98A8\u96AA',     'zh-CN': '\u65F6\u7A0B\u3001Sprint\u3001\u98CE\u9669',   en: 'Schedule, Sprint, Risk' },
    'role.7':  { 'zh-TW': '\u5DE5\u55AE\u3001SLA\u3001\u6EFF\u610F\u5EA6',      'zh-CN': '\u5DE5\u5355\u3001SLA\u3001\u6EE1\u610F\u5EA6',    en: 'Tickets, SLA, Satisfaction' },
    'role.8':  { 'zh-TW': '\u5408\u7D04\u3001\u5408\u898F\u3001\u667A\u8CA1',       'zh-CN': '\u5408\u540C\u3001\u5408\u89C4\u3001\u77E5\u8BC6\u4EA7\u6743', en: 'Contract, Compliance, IP' },
    'role.9':  { 'zh-TW': 'Roadmap\u3001User Story',    'zh-CN': 'Roadmap\u3001User Story',  en: 'Roadmap, User Story' },
    'role.10': { 'zh-TW': '\u7814\u7A76\u3001Wireframe\u3001\u53EF\u7528\u6027', 'zh-CN': '\u7814\u7A76\u3001Wireframe\u3001\u53EF\u7528\u6027', en: 'Research, Wireframe, Usability' },
    'role.11': { 'zh-TW': '\u65E5\u66C6\u3001\u7DE8\u8F2F\u3001\u54C1\u724C\u8072\u8ABF',   'zh-CN': '\u65E5\u5386\u3001\u7F16\u8F91\u3001\u54C1\u724C\u58F0\u8C03', en: 'Calendar, Editorial, Brand Voice' },
    'role.12': { 'zh-TW': '\u5408\u4F5C\u3001\u62D3\u5C55\u3001Lead',       'zh-CN': '\u5408\u4F5C\u3001\u62D3\u5C55\u3001Lead',     en: 'Partnership, Expansion, Lead' },
    'role.13': { 'zh-TW': 'QA\u3001ISO\u3001\u7A3D\u6838',          'zh-CN': 'QA\u3001ISO\u3001\u5BA1\u6838',        en: 'QA, ISO, Audit' },
    'role.14': { 'zh-TW': '\u5F31\u9EDE\u8A55\u4F30\u3001\u5408\u898F\u3001SIEM',   'zh-CN': '\u6F0F\u6D1E\u8BC4\u4F30\u3001\u5408\u89C4\u3001SIEM', en: 'Vuln Assessment, Compliance, SIEM' },
    'role.15': { 'zh-TW': '\u5718\u968A\u5EFA\u5236\u3001\u89D2\u8272\u898F\u5283',     'zh-CN': '\u56E2\u961F\u5EFA\u8BBE\u3001\u89D2\u8272\u89C4\u5212',   en: 'Team Building, Role Planning' },

    // ── Speech Bubbles (30) ─────────────────────
    'speech.0':  { 'zh-TW': '\u5831\u544A\u5B8C\u6210\u4E86\uFF01',     'zh-CN': '\u62A5\u544A\u5B8C\u6210\u4E86\uFF01',     en: 'Report done!' },
    'speech.1':  { 'zh-TW': '\u6578\u64DA\u5206\u6790\u4E2D...',     'zh-CN': '\u6570\u636E\u5206\u6790\u4E2D...',     en: 'Analyzing data...' },
    'speech.2':  { 'zh-TW': '\u9019\u500B\u65B9\u6848\u4E0D\u932F',     'zh-CN': '\u8FD9\u4E2A\u65B9\u6848\u4E0D\u9519',     en: 'Nice plan!' },
    'speech.3':  { 'zh-TW': '\u6211\u4F86\u512A\u5316\u6D41\u7A0B',     'zh-CN': '\u6211\u6765\u4F18\u5316\u6D41\u7A0B',     en: 'Optimizing flow' },
    'speech.4':  { 'zh-TW': '\u5BA2\u6236\u56DE\u8986\u4E86',       'zh-CN': '\u5BA2\u6237\u56DE\u590D\u4E86',       en: 'Client replied' },
    'speech.5':  { 'zh-TW': 'KPI \u9054\u6A19 \u2713',       'zh-CN': 'KPI \u8FBE\u6807 \u2713',       en: 'KPI on target \u2713' },
    'speech.6':  { 'zh-TW': '\u6703\u8B70\u6E96\u5099\u597D\u4E86',     'zh-CN': '\u4F1A\u8BAE\u51C6\u5907\u597D\u4E86',     en: 'Meeting ready' },
    'speech.7':  { 'zh-TW': '\u7CFB\u7D71\u904B\u4F5C\u6B63\u5E38',     'zh-CN': '\u7CFB\u7EDF\u8FD0\u4F5C\u6B63\u5E38',     en: 'Systems normal' },
    'speech.8':  { 'zh-TW': '\u6B63\u5728\u6574\u7406\u8CC7\u6599',     'zh-CN': '\u6B63\u5728\u6574\u7406\u8D44\u6599',     en: 'Organizing data' },
    'speech.9':  { 'zh-TW': '\u81EA\u52D5\u5316\u90E8\u7F72\u4E2D',     'zh-CN': '\u81EA\u52A8\u5316\u90E8\u7F72\u4E2D',     en: 'Auto deploying' },
    'speech.10': { 'zh-TW': '\u6548\u7387\u63D0\u5347 23%',     'zh-CN': '\u6548\u7387\u63D0\u5347 23%',     en: 'Efficiency +23%' },
    'speech.11': { 'zh-TW': '\u7B49\u4E00\u4E0B\u958B\u6703',       'zh-CN': '\u7B49\u4E00\u4E0B\u5F00\u4F1A',       en: 'Meeting soon' },
    'speech.12': { 'zh-TW': '\u4EFB\u52D9\u5DF2\u6D3E\u767C',       'zh-CN': '\u4EFB\u52A1\u5DF2\u6D3E\u53D1',       en: 'Task assigned' },
    'speech.13': { 'zh-TW': '\u54C1\u8CEA\u6AA2\u67E5\u901A\u904E',     'zh-CN': '\u54C1\u8D28\u68C0\u67E5\u901A\u8FC7',     en: 'QA passed' },
    'speech.14': { 'zh-TW': '\u660E\u5929\u4EA4\u5831\u544A',       'zh-CN': '\u660E\u5929\u4EA4\u62A5\u544A',       en: 'Report due tomorrow' },
    'speech.15': { 'zh-TW': '\u9019\u7D44\u6578\u64DA\u6709\u8DA3',     'zh-CN': '\u8FD9\u7EC4\u6570\u636E\u6709\u8DA3',     en: 'Interesting data' },
    'speech.16': { 'zh-TW': '\u9700\u8981\u559D\u676F\u5496\u5561',    'zh-CN': '\u9700\u8981\u559D\u676F\u5496\u5561',    en: 'Need coffee' },
    'speech.17': { 'zh-TW': '\u6392\u7A0B\u5DF2\u66F4\u65B0',       'zh-CN': '\u6392\u7A0B\u5DF2\u66F4\u65B0',       en: 'Schedule updated' },
    'speech.18': { 'zh-TW': '\u9810\u7B97\u5BE9\u6838\u5B8C\u7562',     'zh-CN': '\u9884\u7B97\u5BA1\u6838\u5B8C\u6BD5',     en: 'Budget reviewed' },
    'speech.19': { 'zh-TW': '\u65B0\u9700\u6C42\u9032\u4F86\u4E86',     'zh-CN': '\u65B0\u9700\u6C42\u8FDB\u6765\u4E86',     en: 'New request in' },
    'speech.20': { 'zh-TW': '\u5408\u7D04\u689D\u6B3E\u5DF2\u78BA\u8A8D',   'zh-CN': '\u5408\u540C\u6761\u6B3E\u5DF2\u786E\u8BA4',   en: 'Contract confirmed' },
    'speech.21': { 'zh-TW': '\u539F\u578B\u8A2D\u8A08\u5B8C\u6210',     'zh-CN': '\u539F\u578B\u8BBE\u8BA1\u5B8C\u6210',     en: 'Prototype done' },
    'speech.22': { 'zh-TW': '\u7528\u6236\u6E2C\u8A66\u904E\u4E86',     'zh-CN': '\u7528\u6237\u6D4B\u8BD5\u8FC7\u4E86',     en: 'User test passed' },
    'speech.23': { 'zh-TW': '\u5167\u5BB9\u65E5\u66C6\u66F4\u65B0',     'zh-CN': '\u5185\u5BB9\u65E5\u5386\u66F4\u65B0',     en: 'Calendar updated' },
    'speech.24': { 'zh-TW': '\u5408\u4F5C\u6848\u5728\u63A8\u9032',     'zh-CN': '\u5408\u4F5C\u6848\u5728\u63A8\u8FDB',     en: 'Deal progressing' },
    'speech.25': { 'zh-TW': 'ISO \u7A3D\u6838\u6E96\u5099\u4E2D',   'zh-CN': 'ISO \u5BA1\u6838\u51C6\u5907\u4E2D',   en: 'ISO audit prep' },
    'speech.26': { 'zh-TW': '\u5F31\u9EDE\u6383\u63CF\u5B8C\u7562',     'zh-CN': '\u6F0F\u6D1E\u626B\u63CF\u5B8C\u6BD5',     en: 'Vuln scan done' },
    'speech.27': { 'zh-TW': '\u65B0\u4EBA\u5831\u5230\u660E\u5929',     'zh-CN': '\u65B0\u4EBA\u62A5\u5230\u660E\u5929',     en: 'New hire tomorrow' },
    'speech.28': { 'zh-TW': '\u885D\u523A\u76EE\u6A19\u9054\u6210',     'zh-CN': '\u51B2\u523A\u76EE\u6807\u8FBE\u6210',     en: 'Sprint goal met' },
    'speech.29': { 'zh-TW': '\u67B6\u69CB\u5716\u756B\u597D\u4E86',     'zh-CN': '\u67B6\u6784\u56FE\u753B\u597D\u4E86',     en: 'Architecture ready' },
  },

  t(key) {
    const entry = this.strings[key];
    if (!entry) return key;
    return entry[this._lang] || entry['zh-TW'] || key;
  },

  get lang() { return this._lang; },

  setLang(lang) {
    if (!this.strings['chat.title'][lang]) lang = 'zh-TW';
    this._lang = lang;
    localStorage.setItem('hdsmarter-lang', lang);
    document.documentElement.lang = lang === 'zh-TW' ? 'zh-Hant' : lang === 'zh-CN' ? 'zh-Hans' : lang;
    this._listeners.forEach(fn => fn(lang));
  },

  onChange(fn) {
    this._listeners.push(fn);
  },

  detect() {
    const nav = navigator.language || navigator.userLanguage || '';
    if (nav.startsWith('zh')) {
      return (nav === 'zh-CN' || nav.includes('Hans')) ? 'zh-CN' : 'zh-TW';
    }
    if (nav.startsWith('en')) return 'en';
    return 'zh-TW';
  },

  init() {
    const saved = localStorage.getItem('hdsmarter-lang');
    const lang = saved || this.detect();
    this.setLang(lang);
  },

  speech(idx) {
    return this.t('speech.' + idx);
  },

  agentName(idx) {
    return this.t('agent.' + idx);
  },

  agentRole(idx) {
    return this.t('role.' + idx);
  },

  speechCount: 30,
};
