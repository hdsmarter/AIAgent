/**
 * i18n.js — Internationalization singleton (zh-TW / zh-CN / en)
 * Load order: FIRST (before all other scripts)
 * Pattern: global singleton like PixelSprites
 */
const I18n = {
  _lang: 'zh-TW',
  _listeners: [],

  langs: ['zh-TW', 'zh-CN', 'en'],

  strings: {
    // ── Chat Panel ──────────────────────────────
    'chat.title':        { 'zh-TW': '對話',           'zh-CN': '对话',            en: 'Chat' },
    'chat.placeholder':  { 'zh-TW': '輸入訊息...',    'zh-CN': '输入消息...',     en: 'Type a message...' },
    'chat.send':         { 'zh-TW': '發送',           'zh-CN': '发送',            en: 'Send' },
    'chat.offline':      { 'zh-TW': '離線模式 — 未連線', 'zh-CN': '离线模式 — 未连线', en: 'Offline — not connected' },
    'chat.typing':       { 'zh-TW': '思考中...',      'zh-CN': '思考中...',       en: 'Thinking...' },
    'chat.close':        { 'zh-TW': '關閉',           'zh-CN': '关闭',            en: 'Close' },
    'chat.noAgent':      { 'zh-TW': '請點擊 Agent 開始對話', 'zh-CN': '请点击 Agent 开始对话', en: 'Click an Agent to start chatting' },
    'chat.sendFail':     { 'zh-TW': '無法傳送，未連線', 'zh-CN': '无法发送，未连线', en: 'Cannot send, not connected' },
    'chat.openTelegram': { 'zh-TW': '在 Telegram 開啟對話', 'zh-CN': '在 Telegram 打开对话', en: 'Open chat in Telegram' },

    // ── Settings Panel ──────────────────────────
    'settings.title':          { 'zh-TW': '設定',           'zh-CN': '设置',           en: 'Settings' },
    'settings.langLabel':      { 'zh-TW': '介面語言',       'zh-CN': '界面语言',       en: 'Language' },
    'settings.chatModeLabel':  { 'zh-TW': '對話模式',       'zh-CN': '对话模式',       en: 'Chat Mode' },
    'settings.chatModeTg':     { 'zh-TW': 'Telegram Bot',   'zh-CN': 'Telegram Bot',   en: 'Telegram Bot' },
    'settings.chatModeGw':     { 'zh-TW': 'Gateway WebSocket', 'zh-CN': 'Gateway WebSocket', en: 'Gateway WebSocket' },
    'settings.urlLabel':       { 'zh-TW': '閘道器位址',     'zh-CN': '网关地址',       en: 'Gateway URL' },
    'settings.urlPlaceholder': { 'zh-TW': 'ws://localhost:18789', 'zh-CN': 'ws://localhost:18789', en: 'ws://localhost:18789' },
    'settings.tokenLabel':     { 'zh-TW': '認證令牌',       'zh-CN': '认证令牌',       en: 'Auth Token' },
    'settings.tokenPlaceholder': { 'zh-TW': '（選填）',     'zh-CN': '（选填）',       en: '(optional)' },
    'settings.tgTokenLabel':   { 'zh-TW': 'Bot Token',      'zh-CN': 'Bot Token',      en: 'Bot Token' },
    'settings.tgChatIdLabel':  { 'zh-TW': 'Chat ID',        'zh-CN': 'Chat ID',        en: 'Chat ID' },
    'settings.testBtn':        { 'zh-TW': '測試連線',       'zh-CN': '测试连接',       en: 'Test' },
    'settings.saveBtn':        { 'zh-TW': '儲存',           'zh-CN': '保存',           en: 'Save' },
    'settings.cancelBtn':      { 'zh-TW': '取消',           'zh-CN': '取消',           en: 'Cancel' },
    'settings.testing':        { 'zh-TW': '測試中...',      'zh-CN': '测试中...',      en: 'Testing...' },
    'settings.testOk':         { 'zh-TW': '連線成功',       'zh-CN': '连接成功',       en: 'Connected' },
    'settings.testFail':       { 'zh-TW': '連線失敗',       'zh-CN': '连接失败',       en: 'Failed' },
    'settings.statusConnected':    { 'zh-TW': '已連線',     'zh-CN': '已连接',         en: 'Connected' },
    'settings.statusConnecting':   { 'zh-TW': '連線中...',  'zh-CN': '连接中...',      en: 'Connecting...' },
    'settings.statusDisconnected': { 'zh-TW': '未連線',     'zh-CN': '未连接',         en: 'Disconnected' },

    // ── App / Status Bar ────────────────────────
    'app.connected':    { 'zh-TW': '已連線到閘道器',  'zh-CN': '已连接到网关',   en: 'Connected to gateway' },
    'app.disconnected': { 'zh-TW': '閘道器連線中斷',  'zh-CN': '网关连接中断',   en: 'Gateway disconnected' },
    'app.sendFail':     { 'zh-TW': '無法傳送，閘道器未連線', 'zh-CN': '无法发送，网关未连线', en: 'Cannot send, gateway offline' },
    'app.agents':       { 'zh-TW': '個 Agent',        'zh-CN': '个 Agent',       en: 'Agents' },
    'app.settings':     { 'zh-TW': '設定',            'zh-CN': '设置',           en: 'Settings' },
    'app.gwRunning':    { 'zh-TW': '運行中',          'zh-CN': '运行中',         en: 'Running' },
    'app.gwOffline':    { 'zh-TW': '離線',            'zh-CN': '离线',           en: 'Offline' },

    // ── Office Scene — State Names ──────────────
    'state.type':  { 'zh-TW': '工作中',   'zh-CN': '工作中',   en: 'Working' },
    'state.walk':  { 'zh-TW': '走動中',   'zh-CN': '走动中',   en: 'Walking' },
    'state.idle':  { 'zh-TW': '休息中',   'zh-CN': '休息中',   en: 'Resting' },

    // ── Real Agent Status ───────────────────────
    'status.active':  { 'zh-TW': '執行任務中', 'zh-CN': '执行任务中', en: 'Active' },
    'status.idle':    { 'zh-TW': '待命',       'zh-CN': '待命',       en: 'Idle' },
    'status.offline': { 'zh-TW': '離線',       'zh-CN': '离线',       en: 'Offline' },

    // ── Agent Names (16) ────────────────────────
    'agent.0':  { 'zh-TW': '數據分析師',     'zh-CN': '数据分析师',     en: 'Data Analyst' },
    'agent.1':  { 'zh-TW': '行銷策略師',     'zh-CN': '营销策略师',     en: 'Marketing Strategist' },
    'agent.2':  { 'zh-TW': '財務顧問',       'zh-CN': '财务顾问',       en: 'Finance Advisor' },
    'agent.3':  { 'zh-TW': '人資管理師',     'zh-CN': '人资管理师',     en: 'HR Manager' },
    'agent.4':  { 'zh-TW': '供應鏈專家',     'zh-CN': '供应链专家',     en: 'Supply Chain Expert' },
    'agent.5':  { 'zh-TW': 'IT 架構師',      'zh-CN': 'IT 架构师',      en: 'IT Architect' },
    'agent.6':  { 'zh-TW': '專案經理',       'zh-CN': '项目经理',       en: 'Project Manager' },
    'agent.7':  { 'zh-TW': '客服主管',       'zh-CN': '客服主管',       en: 'Customer Service Lead' },
    'agent.8':  { 'zh-TW': '法務顧問',       'zh-CN': '法务顾问',       en: 'Legal Advisor' },
    'agent.9':  { 'zh-TW': '產品經理',       'zh-CN': '产品经理',       en: 'Product Manager' },
    'agent.10': { 'zh-TW': 'UX 設計師',      'zh-CN': 'UX 设计师',      en: 'UX Designer' },
    'agent.11': { 'zh-TW': '內容策略師',     'zh-CN': '内容策略师',     en: 'Content Strategist' },
    'agent.12': { 'zh-TW': '業務開發經理',   'zh-CN': '业务开发经理',   en: 'BD Manager' },
    'agent.13': { 'zh-TW': '品質管理師',     'zh-CN': '品质管理师',     en: 'Quality Manager' },
    'agent.14': { 'zh-TW': '資安專家',       'zh-CN': '信息安全专家',   en: 'Security Expert' },
    'agent.15': { 'zh-TW': '人力資源總監',   'zh-CN': '人力资源总监',   en: 'HR Director' },

    // ── Agent Role Descriptions ─────────────────
    'role.0':  { 'zh-TW': 'SQL、KPI、報表',        'zh-CN': 'SQL、KPI、报表',       en: 'SQL, KPI, Reports' },
    'role.1':  { 'zh-TW': '行銷、品牌、市場',      'zh-CN': '营销、品牌、市场',     en: 'Campaign, Brand, Market' },
    'role.2':  { 'zh-TW': '預算、預測、ROI',        'zh-CN': '预算、预测、ROI',      en: 'Budget, Forecast, ROI' },
    'role.3':  { 'zh-TW': '招聘、政策、員工',       'zh-CN': '招聘、政策、员工',     en: 'Recruit, Policy, Staff' },
    'role.4':  { 'zh-TW': '物流、庫存、採購',       'zh-CN': '物流、库存、采购',     en: 'Logistics, Inventory, Procurement' },
    'role.5':  { 'zh-TW': '系統、雲端、DevOps',     'zh-CN': '系统、云端、DevOps',   en: 'Systems, Cloud, DevOps' },
    'role.6':  { 'zh-TW': '時程、Sprint、風險',     'zh-CN': '时程、Sprint、风险',   en: 'Schedule, Sprint, Risk' },
    'role.7':  { 'zh-TW': '工單、SLA、滿意度',      'zh-CN': '工单、SLA、满意度',    en: 'Tickets, SLA, Satisfaction' },
    'role.8':  { 'zh-TW': '合約、合規、智財',       'zh-CN': '合同、合规、知识产权', en: 'Contract, Compliance, IP' },
    'role.9':  { 'zh-TW': 'Roadmap、User Story',    'zh-CN': 'Roadmap、User Story',  en: 'Roadmap, User Story' },
    'role.10': { 'zh-TW': '研究、Wireframe、可用性', 'zh-CN': '研究、Wireframe、可用性', en: 'Research, Wireframe, Usability' },
    'role.11': { 'zh-TW': '日曆、編輯、品牌聲調',   'zh-CN': '日历、编辑、品牌声调', en: 'Calendar, Editorial, Brand Voice' },
    'role.12': { 'zh-TW': '合作、拓展、Lead',       'zh-CN': '合作、拓展、Lead',     en: 'Partnership, Expansion, Lead' },
    'role.13': { 'zh-TW': 'QA、ISO、稽核',          'zh-CN': 'QA、ISO、审核',        en: 'QA, ISO, Audit' },
    'role.14': { 'zh-TW': '弱點評估、合規、SIEM',   'zh-CN': '漏洞评估、合规、SIEM', en: 'Vuln Assessment, Compliance, SIEM' },
    'role.15': { 'zh-TW': '團隊建制、角色規劃',     'zh-CN': '团队建设、角色规划',   en: 'Team Building, Role Planning' },

    // ── Speech Bubbles (30) ─────────────────────
    'speech.0':  { 'zh-TW': '報告完成了！',     'zh-CN': '报告完成了！',     en: 'Report done!' },
    'speech.1':  { 'zh-TW': '數據分析中...',     'zh-CN': '数据分析中...',     en: 'Analyzing data...' },
    'speech.2':  { 'zh-TW': '這個方案不錯',     'zh-CN': '这个方案不错',     en: 'Nice plan!' },
    'speech.3':  { 'zh-TW': '我來優化流程',     'zh-CN': '我来优化流程',     en: 'Optimizing flow' },
    'speech.4':  { 'zh-TW': '客戶回覆了',       'zh-CN': '客户回复了',       en: 'Client replied' },
    'speech.5':  { 'zh-TW': 'KPI 達標 ✓',       'zh-CN': 'KPI 达标 ✓',       en: 'KPI on target ✓' },
    'speech.6':  { 'zh-TW': '會議準備好了',     'zh-CN': '会议准备好了',     en: 'Meeting ready' },
    'speech.7':  { 'zh-TW': '系統運作正常',     'zh-CN': '系统运作正常',     en: 'Systems normal' },
    'speech.8':  { 'zh-TW': '正在整理資料',     'zh-CN': '正在整理资料',     en: 'Organizing data' },
    'speech.9':  { 'zh-TW': '自動化部署中',     'zh-CN': '自动化部署中',     en: 'Auto deploying' },
    'speech.10': { 'zh-TW': '效率提升 23%',     'zh-CN': '效率提升 23%',     en: 'Efficiency +23%' },
    'speech.11': { 'zh-TW': '等一下開會',       'zh-CN': '等一下开会',       en: 'Meeting soon' },
    'speech.12': { 'zh-TW': '任務已派發',       'zh-CN': '任务已派发',       en: 'Task assigned' },
    'speech.13': { 'zh-TW': '品質檢查通過',     'zh-CN': '品质检查通过',     en: 'QA passed' },
    'speech.14': { 'zh-TW': '明天交報告',       'zh-CN': '明天交报告',       en: 'Report due tomorrow' },
    'speech.15': { 'zh-TW': '這組數據有趣',     'zh-CN': '这组数据有趣',     en: 'Interesting data' },
    'speech.16': { 'zh-TW': '需要喝杯咖啡',    'zh-CN': '需要喝杯咖啡',    en: 'Need coffee' },
    'speech.17': { 'zh-TW': '排程已更新',       'zh-CN': '排程已更新',       en: 'Schedule updated' },
    'speech.18': { 'zh-TW': '預算審核完畢',     'zh-CN': '预算审核完毕',     en: 'Budget reviewed' },
    'speech.19': { 'zh-TW': '新需求進來了',     'zh-CN': '新需求进来了',     en: 'New request in' },
    'speech.20': { 'zh-TW': '合約條款已確認',   'zh-CN': '合同条款已确认',   en: 'Contract confirmed' },
    'speech.21': { 'zh-TW': '原型設計完成',     'zh-CN': '原型设计完成',     en: 'Prototype done' },
    'speech.22': { 'zh-TW': '用戶測試過了',     'zh-CN': '用户测试过了',     en: 'User test passed' },
    'speech.23': { 'zh-TW': '內容日曆更新',     'zh-CN': '内容日历更新',     en: 'Calendar updated' },
    'speech.24': { 'zh-TW': '合作案在推進',     'zh-CN': '合作案在推进',     en: 'Deal progressing' },
    'speech.25': { 'zh-TW': 'ISO 稽核準備中',   'zh-CN': 'ISO 审核准备中',   en: 'ISO audit prep' },
    'speech.26': { 'zh-TW': '弱點掃描完畢',     'zh-CN': '漏洞扫描完毕',     en: 'Vuln scan done' },
    'speech.27': { 'zh-TW': '新人報到明天',     'zh-CN': '新人报到明天',     en: 'New hire tomorrow' },
    'speech.28': { 'zh-TW': '衝刺目標達成',     'zh-CN': '冲刺目标达成',     en: 'Sprint goal met' },
    'speech.29': { 'zh-TW': '架構圖畫好了',     'zh-CN': '架构图画好了',     en: 'Architecture ready' },
  },

  /** Get translated string; fallback: zh-TW → key */
  t(key) {
    const entry = this.strings[key];
    if (!entry) return key;
    return entry[this._lang] || entry['zh-TW'] || key;
  },

  /** Get current language */
  get lang() { return this._lang; },

  /** Set language + persist + notify listeners */
  setLang(lang) {
    if (!this.strings['chat.title'][lang]) lang = 'zh-TW';
    this._lang = lang;
    localStorage.setItem('nexus-lang', lang);
    document.documentElement.lang = lang === 'zh-TW' ? 'zh-Hant' : lang === 'zh-CN' ? 'zh-Hans' : lang;
    this._listeners.forEach(fn => fn(lang));
  },

  /** Register language-change callback */
  onChange(fn) {
    this._listeners.push(fn);
  },

  /** Detect browser language, fallback zh-TW */
  detect() {
    const nav = navigator.language || navigator.userLanguage || '';
    if (nav.startsWith('zh')) {
      // zh-CN, zh-Hans → zh-CN; everything else → zh-TW
      return (nav === 'zh-CN' || nav.includes('Hans')) ? 'zh-CN' : 'zh-TW';
    }
    if (nav.startsWith('en')) return 'en';
    return 'zh-TW';
  },

  /** Initialize: load saved preference or detect */
  init() {
    const saved = localStorage.getItem('nexus-lang');
    const lang = saved || this.detect();
    this.setLang(lang);
  },

  /** Helper: get speech text by index */
  speech(idx) {
    return this.t('speech.' + idx);
  },

  /** Helper: get agent name by index */
  agentName(idx) {
    return this.t('agent.' + idx);
  },

  /** Helper: get agent role description by index */
  agentRole(idx) {
    return this.t('role.' + idx);
  },

  /** Total speech count */
  speechCount: 30,
};
