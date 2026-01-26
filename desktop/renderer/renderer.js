const CHANNELS = [
  { key: 'webhook', titleKey: 'channel.webhook', descKey: 'channel.webhook.desc' },
  { key: 'telegram', titleKey: 'channel.telegram', descKey: 'channel.telegram.desc' },
  { key: 'desktop', titleKey: 'channel.desktop', descKey: 'channel.desktop.desc' },
  { key: 'sound', titleKey: 'channel.sound', descKey: 'channel.sound.desc' },
  { key: 'email', titleKey: 'channel.email', descKey: 'channel.email.desc' }
];

const SOURCES = [
  { key: 'claude', titleKey: 'source.claude', descKey: 'source.claude.desc' },
  { key: 'codex', titleKey: 'source.codex', descKey: 'source.codex.desc' },
  { key: 'gemini', titleKey: 'source.gemini', descKey: 'source.gemini.desc' }
];

const SUPPORTED_LANGUAGES = ['zh-CN', 'en'];

const I18N = {
  'zh-CN': {
    'brand.subtitle': '多种 AI CLI 任务完成提醒',
    'nav.channels': '通道',
    'nav.sources': '来源',
    'nav.watch': '监听',
    'nav.test': '测试',
    'nav.summary': 'AI 摘要',
    'nav.advanced': '高级',
    'ui.language': '语言',
    'ui.watchToggle': '监听',
    'ui.stepUp': '增加',
    'ui.stepDown': '减少',

    'btn.projectLink': '项目地址',
    'btn.openDataDir': '打开数据目录',
    'btn.openSettings': '打开 settings.json',
    'btn.openWatchLog': '打开日志',
    'hint.openDataDir': '数据目录用于保存 settings.json、state.json 和 .env（可选）',
    'btn.save': '保存',
    'btn.reload': '刷新界面/配置',
    'btn.watchStart': '开始监听',
    'btn.watchStop': '停止',
    'btn.send': '发送',

    'section.channels.title': '全局通道',
    'section.channels.sub': '全局开关 + 每来源开关同时生效',
    'section.sources.title': '来源配置',
    'section.sources.sub': '按来源独立控制：启用、阈值、各通道开关',
    'section.watch.title': '交互式监听（watch）',
    'section.watch.sub': '适用于交互式不退出 / VSCode 插件：自动监听日志，在每次回复完成后提醒',
    'section.test.title': '测试提醒',
    'section.test.sub': '用于验证通道是否可用（强制发送，不受阈值影响）',
    'section.summary.title': 'AI 摘要',
    'section.summary.sub': '用于生成通知中的简短摘要，未在超时内返回则使用原始任务描述。',
    'section.advanced.title': '高级',
    'section.advanced.sub': '格式化与展示相关配置',

    'watch.polling': '轮询(ms)',
    'watch.claudeDebounce': 'Claude 去抖(ms)',
    'watch.debounce': 'Gemini 去抖(ms)',
    'watch.logRetention': '日志保留(天)',
    'watch.logRetentionHint': '只保留最近 N 天的本地监听日志',
    'watch.hint': '建议把监听常驻开启（比如开机自启/放在后台终端），这样无论你在终端还是 VSCode 里用 Claude/Codex/Gemini，都能自动提醒。',
    'watch.logs': '监听日志',
    'watch.status.running': '运行中',
    'watch.status.stopped': '未运行',
    'watch.logNotReady': '尚未定位到日志文件',
    'watch.logOpenFailed': '打开日志文件失败',

    'test.source': '来源',
    'test.duration': '耗时(分钟)',
    'test.message': '内容',
    'test.defaultTask': '测试提醒（强制发送）',
    'test.fallbackTask': '测试提醒',

    'summary.enabled': '启用 AI 摘要',
    'summary.provider': '模型平台',
    'summary.provider.openai': 'OpenAI',
    'summary.provider.anthropic': 'Anthropic',
    'summary.provider.google': 'Google / Gemini',
    'summary.provider.qwen': '通义千问',
    'summary.provider.deepseek': 'DeepSeek',
    'summary.apiUrl': 'API URL',
    'summary.apiUrlExample': '示例',
    'summary.apiKey': 'API Key',
    'summary.apiKeyToggle.show': '显示 API Key',
    'summary.apiKeyToggle.hide': '隐藏 API Key',
    'summary.test': '摘要测试',
    'summary.testBtn': '开始测试',
    'summary.test.running': '测试中...',
    'summary.test.success': '测试成功',
    'summary.test.fail': '测试失败',
    'summary.test.missingApiUrl': '请填写 API URL',
    'summary.test.missingApiKey': '请填写 API Key',
    'summary.test.missingModel': '请填写模型',
    'summary.test.emptySummary': '未返回摘要，请检查 API URL/Key/模型',
    'summary.test.httpError': 'HTTP 请求失败',
    'summary.test.timeout': '请求超时',
    'summary.test.networkError': '网络错误',
    'summary.test.invalidJson': '响应不是合法 JSON',
    'summary.test.emptyContent': '摘要上下文为空',
    'summary.test.disabled': '摘要未启用',
    'summary.test.invalidRequest': '请求参数无效',
    'summary.test.unexpected': '未知错误',
    'summary.test.unsupported': '当前版本暂不支持摘要测试',
    'summary.model': '模型',
    'summary.timeout': '超时(ms)',
    'summary.timeoutHint': '超过时限会自动回退到默认任务描述',
    'summary.hint': '填写 API 信息后即可生效，未返回摘要时会自动回退。',

    'advanced.titlePrefix': '标题包含来源前缀（例如 [Codex]）',
    'advanced.useFeishuCard': 'Webhook 使用飞书卡片格式',
    'advanced.closeBehavior': '关闭按钮行为',
    'advanced.closeHint': '选择“隐藏到托盘”后，点击右上角关闭不会退出，会在右下角托盘保留图标，点击即可重新打开。',
    'advanced.autostart': '开机自启动（登录后自动在后台运行）',
    'advanced.autostartHint': 'Windows / macOS 支持开机自启动；Linux 需自行配置。',

    'close.message': '关闭应用？',
    'close.detail': '可选择隐藏到托盘继续运行，或直接退出并停止监听。',
    'close.hide': '隐藏到托盘',
    'close.quit': '退出',
    'close.cancel': '取消',
    'close.remember': '记住我的选择（可在“高级”里修改）',

    'close.ask': '每次询问',
    'close.tray': '隐藏到托盘',
    'close.exit': '直接退出',

    'channel.webhook': 'Webhook',
    'channel.webhook.desc': '通用 Webhook（默认飞书格式，可填多个 URL）',
    'channel.telegram': 'Telegram',
    'channel.telegram.desc': 'Bot 消息推送（可选代理）',
    'channel.desktop': '桌面通知',
    'channel.desktop.desc': 'Windows 气泡提示',
    'channel.sound': '声音',
    'channel.sound.desc': '语音播报 / 蜂鸣',
    'channel.email': '邮件',
    'channel.email.desc': 'SMTP 邮件提醒（配置在 .env）',

    'source.claude': 'Claude',
    'source.claude.desc': 'Claude Code CLI / 插件',
    'source.codex': 'Codex',
    'source.codex.desc': 'Codex CLI / 插件',
    'source.gemini': 'Gemini',
    'source.gemini.desc': 'Gemini CLI / 插件',

    'sources.threshold': '超过(分钟)才提醒',
    'sources.thresholdHint': '当耗时超过此值才会提醒；修改后记得点击“保存”。',
    'hint.saving': '',
    'hint.saved': '',
    'hint.loaded': '',
    'log.testing': '发送测试提醒中...'
  },
  en: {
    'brand.subtitle': 'AI CLI completion notifications',
    'nav.channels': 'Channels',
    'nav.sources': 'Sources',
    'nav.watch': 'Watch',
    'nav.test': 'Test',
    'nav.summary': 'Summary',
    'nav.advanced': 'Advanced',
    'ui.language': 'Language',
    'ui.watchToggle': 'Watch',
    'ui.stepUp': 'Increase',
    'ui.stepDown': 'Decrease',

    'btn.projectLink': 'Project repo',
    'btn.openDataDir': 'Open data folder',
    'btn.openSettings': 'Open settings.json',
    'btn.openWatchLog': 'Open log file',
    'hint.openDataDir': 'Stores settings.json, state.json, and optional .env',
    'btn.save': 'Save',
    'btn.reload': 'Reload UI / config',
    'btn.watchStart': 'Start watching',
    'btn.watchStop': 'Stop',
    'btn.send': 'Send',

    'section.channels.title': 'Channels',
    'section.channels.sub': 'Global toggle + per-source toggles apply',
    'section.sources.title': 'Sources',
    'section.sources.sub': 'Per-source: enable, threshold, channel toggles',
    'section.watch.title': 'Interactive watch',
    'section.watch.sub': 'For interactive mode / VSCode extensions: watch local logs and notify after each reply',
    'section.test.title': 'Test notification',
    'section.test.sub': 'Validate channels (forced send; ignores thresholds)',
    'section.summary.title': 'AI Summary',
    'section.summary.sub': 'Used to generate a short summary; if it times out, the original task is used.',
    'section.advanced.title': 'Advanced',
    'section.advanced.sub': 'Formatting and UI preferences',

    'watch.polling': 'Polling (ms)',
    'watch.claudeDebounce': 'Claude debounce (ms)',
    'watch.debounce': 'Gemini debounce (ms)',
    'watch.logRetention': 'Log retention (days)',
    'watch.logRetentionHint': 'Keep only the last N days of local watch logs',
    'watch.hint': 'Keep watch running in the background so notifications work for both terminal and VSCode.',
    'watch.logs': 'Watch logs',
    'watch.status.running': 'Running',
    'watch.status.stopped': 'Stopped',
    'watch.logNotReady': 'No log file yet',
    'watch.logOpenFailed': 'Failed to open log file',

    'test.source': 'Source',
    'test.duration': 'Duration (min)',
    'test.message': 'Message',
    'test.defaultTask': 'Test notification (forced)',
    'test.fallbackTask': 'Test notification',

    'summary.enabled': 'Enable AI summary',
    'summary.provider': 'Model platform',
    'summary.provider.openai': 'OpenAI',
    'summary.provider.anthropic': 'Anthropic',
    'summary.provider.google': 'Google / Gemini',
    'summary.provider.qwen': 'Qwen',
    'summary.provider.deepseek': 'DeepSeek',
    'summary.apiUrl': 'API URL',
    'summary.apiUrlExample': 'Example',
    'summary.apiKey': 'API Key',
    'summary.apiKeyToggle.show': 'Show API key',
    'summary.apiKeyToggle.hide': 'Hide API key',
    'summary.test': 'Summary test',
    'summary.testBtn': 'Run test',
    'summary.test.running': 'Testing...',
    'summary.test.success': 'Success',
    'summary.test.fail': 'Failed',
    'summary.test.missingApiUrl': 'Please enter the API URL',
    'summary.test.missingApiKey': 'Please enter the API key',
    'summary.test.missingModel': 'Please enter the model',
    'summary.test.emptySummary': 'No summary returned. Check API URL/key/model.',
    'summary.test.httpError': 'HTTP request failed',
    'summary.test.timeout': 'Request timed out',
    'summary.test.networkError': 'Network error',
    'summary.test.invalidJson': 'Response is not valid JSON',
    'summary.test.emptyContent': 'Summary context is empty',
    'summary.test.disabled': 'Summary is disabled',
    'summary.test.invalidRequest': 'Request parameters are invalid',
    'summary.test.unexpected': 'Unexpected error',
    'summary.test.unsupported': 'Summary test is unavailable in this build.',
    'summary.model': 'Model',
    'summary.timeout': 'Timeout (ms)',
    'summary.timeoutHint': 'Falls back to the default task description if it times out',
    'summary.hint': 'Fill in the API settings to enable summaries. It falls back automatically on timeout.',

    'advanced.titlePrefix': 'Include source prefix in title (e.g., [Codex])',
    'advanced.useFeishuCard': 'Use Feishu card format for Webhook',
    'advanced.closeBehavior': 'Close button behavior',
    'advanced.closeHint': 'If set to “Minimize to tray”, closing the window keeps the app running in the system tray.',
    'advanced.autostart': 'Launch at login (run in background after login)',
    'advanced.autostartHint': 'Supported on Windows/macOS; Linux requires manual setup.',

    'close.message': 'Close the app?',
    'close.detail': 'Minimize to tray to keep running, or quit to stop watchers.',
    'close.hide': 'Minimize to tray',
    'close.quit': 'Quit',
    'close.cancel': 'Cancel',
    'close.remember': 'Remember my choice (change later in Advanced)',

    'close.ask': 'Ask every time',
    'close.tray': 'Minimize to tray',
    'close.exit': 'Quit app',

    'channel.telegram': 'Telegram',
    'channel.telegram.desc': 'Bot messages (optional proxy)',
    'channel.webhook': 'Webhook',
    'channel.webhook.desc': 'Generic webhook (Feishu post format; supports multiple URLs)',
    'channel.desktop': 'Desktop',
    'channel.desktop.desc': 'Windows toast/balloon',
    'channel.sound': 'Sound',
    'channel.sound.desc': 'TTS / beep fallback',
    'channel.email': 'Email',
    'channel.email.desc': 'SMTP email alerts (configure via .env)',

    'source.claude': 'Claude',
    'source.claude.desc': 'Claude Code CLI / extension',
    'source.codex': 'Codex',
    'source.codex.desc': 'Codex CLI / extension',
    'source.gemini': 'Gemini',
    'source.gemini.desc': 'Gemini CLI / extension',

    'sources.threshold': 'Notify if over (min)',
    'sources.thresholdHint': 'Only notify if duration exceeds this value. Click “Save” after changing.',
    'hint.saving': '',
    'hint.saved': '',
    'hint.loaded': '',
    'log.testing': 'Sending test notification...'
  }
};

let currentLanguage = 'zh-CN';

function normalizeLanguage(value) {
  if (typeof value !== 'string') return 'zh-CN';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  if (normalized === 'zh' || normalized.startsWith('zh')) return 'zh-CN';
  return SUPPORTED_LANGUAGES.includes(value) ? value : 'zh-CN';
}

function t(key) {
  const langPack = I18N[currentLanguage] || I18N['zh-CN'];
  return langPack[key] || I18N.en[key] || I18N['zh-CN'][key] || String(key);
}

function $(id) {
  return document.getElementById(id);
}

function setHint(text) {
  $('hint').textContent = text || '';
}

function setLog(text) {
  $('log').textContent = text || '';
}

function setWatchLog(text) {
  $('watchLog').textContent = text || '';
}

function formatLogTimestamp(ts) {
  const date = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function appendWatchLog(line) {
  const rawLine = String(line || '');
  const stamped = `[${formatLogTimestamp(Date.now())}] ${rawLine}`;
  const next = ($('watchLog').textContent || '') + stamped + '\n';
  $('watchLog').textContent = next.length > 12000 ? next.slice(-12000) : next;
  $('watchLog').scrollTop = $('watchLog').scrollHeight;
}

function updateDefaultInputValue(id, perLangDefaults) {
  const el = $(id);
  if (!el) return;
  const current = String(el.value || '');
  const known = Object.values(perLangDefaults);
  if (!known.includes(current)) return;
  el.value = perLangDefaults[currentLanguage] || perLangDefaults.en || current;
}

function applyLanguageToDom(config, opts = {}) {
  const onGlobalChange = typeof opts.onGlobalChange === 'function' ? opts.onGlobalChange : null;
  const onSourceChange = typeof opts.onSourceChange === 'function' ? opts.onSourceChange : null;

  currentLanguage = normalizeLanguage(currentLanguage);
  document.documentElement.lang = currentLanguage === 'en' ? 'en' : 'zh-CN';

  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    if (!key) continue;
    el.textContent = t(key);
  }
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    const key = el.getAttribute('data-i18n-title');
    if (!key) continue;
    const text = t(key);
    el.setAttribute('title', text);
    el.setAttribute('aria-label', text);
  }

  updateDefaultInputValue('testTask', {
    'zh-CN': I18N['zh-CN']['test.defaultTask'],
    en: I18N.en['test.defaultTask']
  });

  const summaryProvider = config && config.summary ? normalizeSummaryProvider(config.summary.provider) : 'openai';
  applySummaryProviderPlaceholders(summaryProvider);
  syncSummaryApiKeyToggle();

  if (config) {
    renderGlobalChannels(config, onGlobalChange);
    renderSources(config, onSourceChange);
  }
}

function setupNav() {
  const navLinks = Array.from(document.querySelectorAll('.navItem'));
  const contentRoot = document.querySelector('.content');

  if (navLinks.length === 0) return () => {};

  function setActiveByHash(hash) {
    const targetHash = hash && hash.startsWith('#') ? hash : navLinks[0].getAttribute('href') || '';
    for (const link of navLinks) {
      link.classList.toggle('isActive', link.getAttribute('href') === targetHash);
    }
  }

  for (const link of navLinks) {
    link.addEventListener('click', () => setActiveByHash(link.getAttribute('href')));
  }

  window.addEventListener('hashchange', () => setActiveByHash(window.location.hash));
  setActiveByHash(window.location.hash);

  const sections = navLinks
    .map((l) => document.querySelector(l.getAttribute('href') || ''))
    .filter(Boolean);

  if (!contentRoot || sections.length === 0 || typeof IntersectionObserver !== 'function') {
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length === 0) return;
      visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const top = visible[0].target;
      if (top && top.id) setActiveByHash('#' + top.id);
    },
    { root: contentRoot, threshold: [0.18, 0.26, 0.35, 0.45, 0.6] }
  );

  for (const section of sections) observer.observe(section);
  return () => observer.disconnect();
}

function createSwitch(checked, onChange) {
  const label = document.createElement('label');
  label.className = 'switch';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = Boolean(checked);
  input.addEventListener('change', () => onChange(input.checked));

  const slider = document.createElement('span');
  slider.className = 'slider';

  label.appendChild(input);
  label.appendChild(slider);
  return { root: label, input };
}

function renderGlobalChannels(config, onChange) {
  const root = $('globalChannels');
  root.innerHTML = '';

  for (const ch of CHANNELS) {
    const tile = document.createElement('div');
    tile.className = 'tile';

    const left = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'tileTitle';
    title.textContent = t(ch.titleKey);

    const desc = document.createElement('div');
    desc.className = 'tileDesc';
    desc.textContent = t(ch.descKey);

    left.appendChild(title);
    left.appendChild(desc);

    const toggle = createSwitch(config.channels?.[ch.key]?.enabled, (v) => {
      config.channels[ch.key].enabled = v;
      if (onChange) onChange();
    });

    tile.appendChild(left);
    tile.appendChild(toggle.root);
    root.appendChild(tile);
  }
}

function renderSources(config, onChange) {
  const root = $('sources');
  root.innerHTML = '';

  for (const src of SOURCES) {
    const card = document.createElement('div');
    card.className = 'sourceCard';

    const head = document.createElement('div');
    head.className = 'sourceHead';

    const left = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'sourceTitle';
    title.textContent = t(src.titleKey);
    const meta = document.createElement('div');
    meta.className = 'sourceMeta';
    meta.textContent = t(src.descKey);
    left.appendChild(title);
    left.appendChild(meta);

    const controls = document.createElement('div');
    controls.className = 'sourceControls';

    const thresholdLabel = document.createElement('label');
    thresholdLabel.className = 'labelWithHint';
    thresholdLabel.textContent = t('sources.threshold');
    const thresholdHint = document.createElement('span');
    thresholdHint.className = 'hintIcon';
    thresholdHint.textContent = '?';
    thresholdHint.title = t('sources.thresholdHint');
    thresholdHint.setAttribute('aria-label', t('sources.thresholdHint'));
    thresholdLabel.appendChild(thresholdHint);

    const threshold = document.createElement('input');
    threshold.type = 'number';
    threshold.min = '0';
    threshold.step = '1';
    threshold.style.width = '110px';
    threshold.value = String(config.sources?.[src.key]?.minDurationMinutes ?? 0);
    threshold.addEventListener('change', () => {
      const n = Number(threshold.value);
      config.sources[src.key].minDurationMinutes = Number.isFinite(n) && n >= 0 ? n : 0;
      if (onChange) onChange();
    });

    const enabledToggle = createSwitch(config.sources?.[src.key]?.enabled, (v) => {
      config.sources[src.key].enabled = v;
      disabledWrap.classList.toggle('isDisabled', !v);
      if (onChange) onChange();
    });

    controls.appendChild(thresholdLabel);
    controls.appendChild(threshold);
    controls.appendChild(enabledToggle.root);

    head.appendChild(left);
    head.appendChild(controls);
    card.appendChild(head);

    const disabledWrap = document.createElement('div');
    disabledWrap.className = 'channelGrid';
    disabledWrap.classList.toggle('isDisabled', !config.sources?.[src.key]?.enabled);

    for (const ch of CHANNELS) {
      const item = document.createElement('div');
      item.className = 'channelItem';

      const name = document.createElement('span');
      name.textContent = t(ch.titleKey);

      const toggle = createSwitch(config.sources?.[src.key]?.channels?.[ch.key], (v) => {
        config.sources[src.key].channels[ch.key] = v;
        if (onChange) onChange();
      });

      item.appendChild(name);
      item.appendChild(toggle.root);
      disabledWrap.appendChild(item);
    }

    card.appendChild(disabledWrap);
    root.appendChild(card);
  }
}

const SUMMARY_PROVIDER_DEFAULTS = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  anthropic: {
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-haiku-20240307'
  },
  google: {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    model: 'gemini-1.5-flash'
  },
  qwen: {
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo'
  },
  deepseek: {
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat'
  }
};
const SUMMARY_LEGACY_DEFAULTS = {
  apiUrls: [
    'https://open.bigmodel.cn/api/paas/v4/chat/completions'
  ],
  models: [
    'glm-4-flash-250414'
  ]
};
const SUMMARY_TEST_ERROR_KEYS = {
  disabled: 'summary.test.disabled',
  missing_api_url: 'summary.test.missingApiUrl',
  missing_api_key: 'summary.test.missingApiKey',
  missing_model: 'summary.test.missingModel',
  empty_summary: 'summary.test.emptySummary',
  empty_content: 'summary.test.emptyContent',
  invalid_request: 'summary.test.invalidRequest',
  http_error: 'summary.test.httpError',
  timeout: 'summary.test.timeout',
  network_error: 'summary.test.networkError',
  invalid_json: 'summary.test.invalidJson',
  unexpected_error: 'summary.test.unexpected'
};

function normalizeSummaryProvider(value) {
  if (!value) return 'openai';
  const raw = String(value).trim().toLowerCase();
  if (raw === 'gemini') return 'google';
  if (raw === 'google' || raw === 'openai' || raw === 'anthropic' || raw === 'qwen' || raw === 'deepseek') {
    return raw;
  }
  return 'openai';
}

function getSummaryProviderDefaults(provider) {
  const key = normalizeSummaryProvider(provider);
  return SUMMARY_PROVIDER_DEFAULTS[key] || SUMMARY_PROVIDER_DEFAULTS.openai;
}

function normalizeUrlString(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isSummaryDefaultUrl(value) {
  if (!value) return true;
  const raw = normalizeUrlString(value);
  if (!raw) return true;
  if (SUMMARY_LEGACY_DEFAULTS.apiUrls.map(normalizeUrlString).includes(raw)) return true;
  return Object.values(SUMMARY_PROVIDER_DEFAULTS).some((item) => normalizeUrlString(item.apiUrl) === raw);
}

function isSummaryDefaultModel(value) {
  if (!value) return true;
  const raw = String(value).trim();
  if (!raw) return true;
  if (SUMMARY_LEGACY_DEFAULTS.models.includes(raw)) return true;
  return Object.values(SUMMARY_PROVIDER_DEFAULTS).some((item) => item.model === raw);
}

function hasApiKeyInUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return Boolean(parsed.searchParams.get('key') || parsed.searchParams.get('api_key'));
  } catch (_error) {
    return false;
  }
}

function applySummaryProviderPlaceholders(provider) {
  const defaults = getSummaryProviderDefaults(provider);
  if ($('summaryApiUrl')) $('summaryApiUrl').placeholder = defaults.apiUrl;
  if ($('summaryModel')) $('summaryModel').placeholder = defaults.model;
  if ($('summaryApiUrlExample')) {
    $('summaryApiUrlExample').textContent = `${t('summary.apiUrlExample')}: ${defaults.apiUrl}`;
  }
}

function normalizeSummaryTestDetail(detail) {
  if (!detail) return '';
  const trimmed = String(detail).replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.length > 180 ? trimmed.slice(0, 177) + '...' : trimmed;
}

function setSummaryTestResult(statusKey, detail) {
  const el = $('summaryTestResult');
  if (!el) return;
  if (!statusKey) {
    el.textContent = '';
    return;
  }
  const base = t(statusKey);
  const cleaned = normalizeSummaryTestDetail(detail);
  if (!cleaned) {
    el.textContent = base;
    return;
  }
  const sep = currentLanguage === 'en' ? ': ' : '：';
  el.textContent = `${base}${sep}${cleaned}`;
}

function clearSummaryTestResult() {
  const el = $('summaryTestResult');
  if (el) el.textContent = '';
}

function formatSummaryTestFailure(result) {
  if (!result || typeof result !== 'object') return '';
  const pieces = [];
  const errorKey = result.error ? SUMMARY_TEST_ERROR_KEYS[String(result.error)] : '';
  if (errorKey) pieces.push(t(errorKey));
  if (typeof result.status === 'number' && result.status > 0) pieces.push(`HTTP ${result.status}`);
  if (result.detail) pieces.push(String(result.detail));
  const sep = currentLanguage === 'en' ? ' - ' : ' - ';
  return pieces.filter(Boolean).join(sep);
}

function setSummaryApiKeyVisibility(visible) {
  const input = $('summaryApiKey');
  const toggle = $('summaryApiKeyToggle');
  if (!input || !toggle) return;
  input.type = visible ? 'text' : 'password';
  toggle.classList.toggle('isActive', visible);
  const key = visible ? 'summary.apiKeyToggle.hide' : 'summary.apiKeyToggle.show';
  const label = t(key);
  toggle.setAttribute('title', label);
  toggle.setAttribute('aria-label', label);
}

function syncSummaryApiKeyToggle() {
  const input = $('summaryApiKey');
  if (!input) return;
  setSummaryApiKeyVisibility(input.type === 'text');
}

function updateSummaryProviderDefaults(summary, nextProvider) {
  const nextDefaults = getSummaryProviderDefaults(nextProvider);
  summary.provider = nextProvider;
  if (isSummaryDefaultUrl(summary.apiUrl)) summary.apiUrl = nextDefaults.apiUrl;
  if (isSummaryDefaultModel(summary.model)) summary.model = nextDefaults.model;
}

function ensureSummaryConfig(config) {
  if (!config.summary || typeof config.summary !== 'object') config.summary = {};
  if (!config.summary.provider) config.summary.provider = 'openai';
  if (config.summary.timeoutMs == null || config.summary.timeoutMs === 1200) {
    config.summary.timeoutMs = 15000;
  }
  return config.summary;
}

function applySummaryValues(config) {
  if (!$('summaryEnabled')) return;
  const summary = ensureSummaryConfig(config);
  summary.provider = normalizeSummaryProvider(summary.provider);
  $('summaryEnabled').checked = Boolean(summary.enabled);
  if ($('summaryProvider')) $('summaryProvider').value = summary.provider;
  $('summaryApiUrl').value = summary.apiUrl || '';
  $('summaryApiKey').value = summary.apiKey || '';
  $('summaryModel').value = summary.model || '';
  $('summaryTimeoutMs').value = String(summary.timeoutMs ?? 15000);
  applySummaryProviderPlaceholders(summary.provider);
}

function setSummaryVisibility(enabled) {
  const fields = $('summaryFields');
  if (!fields) return;
  fields.classList.toggle('isCollapsed', !enabled);
}

function bindNumberSteppers() {
  const fields = Array.from(document.querySelectorAll('.numberField'));
  if (fields.length === 0) return;

  const triggerEvents = (input) => {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const step = (input, direction) => {
    if (!input || input.disabled) return;
    try {
      if (direction === 'up') input.stepUp();
      else input.stepDown();
      triggerEvents(input);
    } catch (_error) {
      // ignore
    }
  };

  for (const field of fields) {
    const input = field.querySelector('input[type="number"]');
    const up = field.querySelector('[data-step="up"]');
    const down = field.querySelector('[data-step="down"]');
    if (!input || !up || !down) continue;

    up.addEventListener('click', (event) => {
      event.preventDefault();
      step(input, 'up');
    });
    down.addEventListener('click', (event) => {
      event.preventDefault();
      step(input, 'down');
    });
  }
}

function applyWatchLogRetention(config) {
  const input = $('watchLogRetentionDays');
  if (!input) return;
  const days = Number(config?.ui?.watchLogRetentionDays);
  input.value = String(Number.isFinite(days) && days >= 1 ? days : 7);
}

function applyWebhookCardToggle(config) {
  const input = $('useFeishuCard');
  if (!input) return;
  input.checked = Boolean(config?.channels?.webhook?.useFeishuCard);
}

function bindClosePrompt() {
  const modal = $('closeModal');
  if (!modal) return () => {};

  let activeId = null;

  const setOpen = (open) => {
    modal.classList.toggle('isOpen', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      const remember = $('closeRemember');
      if (remember) remember.checked = false;
      const hideBtn = $('closeHideBtn');
      if (hideBtn) hideBtn.focus();
    }
  };

  const respond = (action) => {
    if (!activeId) {
      setOpen(false);
      return;
    }
    const payload = {
      id: activeId,
      action,
      remember: Boolean($('closeRemember')?.checked)
    };
    activeId = null;
    if (window.completeNotify && typeof window.completeNotify.respondClosePrompt === 'function') {
      window.completeNotify.respondClosePrompt(payload);
    }
    setOpen(false);
  };

  const onRequest = (payload) => {
    const id = payload && payload.id ? String(payload.id) : '';
    if (!id) return;
    activeId = id;
    setOpen(true);
  };

  const onMaskClick = (event) => {
    if (event.target === modal) respond('cancel');
  };

  const onKeydown = (event) => {
    if (event.key === 'Escape' && modal.classList.contains('isOpen')) {
      respond('cancel');
    }
  };

  const hideBtn = $('closeHideBtn');
  const quitBtn = $('closeQuitBtn');
  const cancelBtn = $('closeCancelBtn');

  const onHideClick = () => respond('tray');
  const onQuitClick = () => respond('exit');
  const onCancelClick = () => respond('cancel');

  if (hideBtn) hideBtn.addEventListener('click', onHideClick);
  if (quitBtn) quitBtn.addEventListener('click', onQuitClick);
  if (cancelBtn) cancelBtn.addEventListener('click', onCancelClick);
  modal.addEventListener('click', onMaskClick);
  window.addEventListener('keydown', onKeydown);

  const unsubscribe = window.completeNotify && typeof window.completeNotify.onClosePrompt === 'function'
    ? window.completeNotify.onClosePrompt(onRequest)
    : () => {};

  return () => {
    if (hideBtn) hideBtn.removeEventListener('click', onHideClick);
    if (quitBtn) quitBtn.removeEventListener('click', onQuitClick);
    if (cancelBtn) cancelBtn.removeEventListener('click', onCancelClick);
    modal.removeEventListener('click', onMaskClick);
    window.removeEventListener('keydown', onKeydown);
    if (typeof unsubscribe === 'function') unsubscribe();
  };
}

async function main() {
  const cleanupNav = setupNav();
  const cleanupClosePrompt = bindClosePrompt();
  bindNumberSteppers();
  const meta = await window.completeNotify.getMeta();
  $('productName').textContent = meta.productName;

  $('openDataDir').addEventListener('click', () => window.completeNotify.openPath(meta.dataDir));
  $('openConfigPath').addEventListener('click', () => window.completeNotify.openPath(meta.configPath));
  if ($('openWatchLogBtn')) {
    $('openWatchLogBtn').addEventListener('click', async () => {
      try {
        if (typeof window.completeNotify.openWatchLog !== 'function') {
          setHint(t('watch.logOpenFailed'));
          return;
        }
        const result = await window.completeNotify.openWatchLog();
        if (!result || !result.ok) {
          setHint(t('watch.logOpenFailed'));
          return;
        }
        setHint('');
      } catch (_error) {
        setHint(t('watch.logOpenFailed'));
      }
    });
  }
  if (meta.version && $('productVersion')) $('productVersion').textContent = `v${meta.version}`;
  if ($('githubBtn')) {
    $('githubBtn').addEventListener('click', () => {
      try {
        window.completeNotify.openExternal('https://github.com/ZekerTop/ai-cli-complete-notify');
      } catch (_error) {
        // ignore
      }
    });
  }

  const config = await window.completeNotify.getConfig();
  let autoSaveTimer = null;
  const triggerAutoSave = () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      try {
        await window.completeNotify.saveConfig(config);
        setHint('');
      } catch (error) {
        setHint(String(error?.message || error));
      }
    }, 250);
  };

  config.ui = config.ui || {};
  currentLanguage = normalizeLanguage(config.ui.language || 'zh-CN');
  config.ui.language = currentLanguage;
  $('languageSelect').value = currentLanguage;
  $('languageSelect').addEventListener('change', async () => {
    const next = normalizeLanguage(String($('languageSelect').value || 'zh-CN'));
    if (next === currentLanguage) return;
    currentLanguage = next;
    config.ui.language = next;
    try {
      await window.completeNotify.setUiLanguage(next);
    } catch (_error) {
      // ignore
    }
    triggerAutoSave();
    applyLanguageToDom(config, { onGlobalChange: triggerAutoSave, onSourceChange: triggerAutoSave });
    await refreshWatchStatus();
  });

  $('includeSourcePrefixInTitle').checked = Boolean(config.format?.includeSourcePrefixInTitle);
  $('includeSourcePrefixInTitle').addEventListener('change', () => {
    config.format.includeSourcePrefixInTitle = $('includeSourcePrefixInTitle').checked;
    triggerAutoSave();
  });

  const useFeishuCardEl = $('useFeishuCard');
  if (useFeishuCardEl) {
    useFeishuCardEl.checked = Boolean(config.channels?.webhook?.useFeishuCard);
    useFeishuCardEl.addEventListener('change', () => {
      config.channels = config.channels || {};
      config.channels.webhook = config.channels.webhook || {};
      config.channels.webhook.useFeishuCard = useFeishuCardEl.checked;
      triggerAutoSave();
    });
  }

  const closeBehavior = ['ask', 'tray', 'exit'].includes(String(config.ui.closeBehavior)) ? String(config.ui.closeBehavior) : 'ask';
  $('closeBehavior').value = closeBehavior;
  $('closeBehavior').addEventListener('change', async () => {
    const next = String($('closeBehavior').value || 'ask');
    config.ui.closeBehavior = ['ask', 'tray', 'exit'].includes(next) ? next : 'ask';
    try {
      if (typeof window.completeNotify.setCloseBehavior === 'function') {
        await window.completeNotify.setCloseBehavior(config.ui.closeBehavior);
      }
      triggerAutoSave();
    } catch (_error) {
      // ignore
    }
  });

  // Autostart
  if ($('autostart')) {
    try {
      const state = await window.completeNotify.getAutostart();
      if (state && typeof state.autostart === 'boolean') {
        config.ui.autostart = state.autostart;
      }
    } catch (_error) {
      // ignore
    }
    $('autostart').checked = Boolean(config.ui.autostart);
    $('autostart').addEventListener('change', async () => {
      $('autostart').disabled = true;
      const enabled = Boolean($('autostart').checked);
      try {
        const result = await window.completeNotify.setAutostart(enabled);
        if (result && result.ok) {
          config.ui.autostart = enabled;
          triggerAutoSave();
        } else if (result && result.error) {
          setHint(String(result.error));
        }
      } catch (error) {
        setHint(String(error?.message || error));
      } finally {
        $('autostart').disabled = false;
      }
    });
  }

  let summaryBound = false;
  const bindSummaryControls = () => {
    if (summaryBound || !$('summaryEnabled')) return;
    summaryBound = true;

    $('summaryEnabled').addEventListener('change', () => {
      const summary = ensureSummaryConfig(config);
      summary.enabled = Boolean($('summaryEnabled').checked);
      setSummaryVisibility(summary.enabled);
      triggerAutoSave();
      clearSummaryTestResult();
    });
    if ($('summaryProvider')) {
      $('summaryProvider').addEventListener('change', () => {
        const summary = ensureSummaryConfig(config);
        const nextProvider = normalizeSummaryProvider($('summaryProvider').value);
        if (nextProvider === normalizeSummaryProvider(summary.provider)) return;
        updateSummaryProviderDefaults(summary, nextProvider);
        applySummaryValues(config);
        triggerAutoSave();
        clearSummaryTestResult();
      });
    }
    $('summaryApiUrl').addEventListener('input', () => {
      const summary = ensureSummaryConfig(config);
      summary.apiUrl = String($('summaryApiUrl').value || '').trim();
      triggerAutoSave();
      clearSummaryTestResult();
    });
    $('summaryApiKey').addEventListener('input', () => {
      const summary = ensureSummaryConfig(config);
      summary.apiKey = String($('summaryApiKey').value || '').trim();
      triggerAutoSave();
      clearSummaryTestResult();
    });
    $('summaryModel').addEventListener('input', () => {
      const summary = ensureSummaryConfig(config);
      summary.model = String($('summaryModel').value || '').trim();
      triggerAutoSave();
      clearSummaryTestResult();
    });
    $('summaryTimeoutMs').addEventListener('change', () => {
      const summary = ensureSummaryConfig(config);
      const n = Number($('summaryTimeoutMs').value);
      summary.timeoutMs = Number.isFinite(n) && n >= 200 ? n : 15000;
      triggerAutoSave();
      clearSummaryTestResult();
    });

    if ($('summaryApiKeyToggle')) {
      $('summaryApiKeyToggle').addEventListener('click', () => {
        const input = $('summaryApiKey');
        if (!input) return;
        setSummaryApiKeyVisibility(input.type === 'password');
      });
      syncSummaryApiKeyToggle();
    }

    if ($('summaryTestBtn')) {
      $('summaryTestBtn').addEventListener('click', async () => {
        if (!window.completeNotify || typeof window.completeNotify.testSummary !== 'function') {
          setSummaryTestResult('summary.test.fail', t('summary.test.unsupported'));
          return;
        }

        const provider = normalizeSummaryProvider($('summaryProvider')?.value);
        const apiUrl = String($('summaryApiUrl')?.value || '').trim();
        const apiKey = String($('summaryApiKey')?.value || '').trim();
        const model = String($('summaryModel')?.value || '').trim();
        const timeoutRaw = Number($('summaryTimeoutMs')?.value || 15000);
        const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw >= 200 ? timeoutRaw : 15000;

        if (!apiUrl) {
          setSummaryTestResult('summary.test.fail', t('summary.test.missingApiUrl'));
          return;
        }
        if (!model) {
          setSummaryTestResult('summary.test.fail', t('summary.test.missingModel'));
          return;
        }
        if (provider === 'google') {
          if (!apiKey && !hasApiKeyInUrl(apiUrl)) {
            setSummaryTestResult('summary.test.fail', t('summary.test.missingApiKey'));
            return;
          }
        } else if (!apiKey) {
          setSummaryTestResult('summary.test.fail', t('summary.test.missingApiKey'));
          return;
        }

        const summary = ensureSummaryConfig(config);
        summary.provider = provider;
        summary.apiUrl = apiUrl;
        summary.apiKey = apiKey;
        summary.model = model;
        summary.timeoutMs = timeoutMs;
        triggerAutoSave();

        const isEnglish = currentLanguage === 'en';
        const payload = {
          summary: {
            provider,
            apiUrl,
            apiKey,
            model,
            timeoutMs
          },
          taskInfo: isEnglish ? 'Summary test: verify API connectivity.' : '摘要测试：验证 API 连通性。',
          contentText: isEnglish
            ? 'The task completed successfully and needs a short summary.'
            : '任务已完成，需要生成简短摘要。',
          summaryContext: isEnglish
            ? { userMessage: 'Please summarize the task outcome.', assistantMessage: 'Completed successfully.' }
            : { userMessage: '请总结任务结果。', assistantMessage: '任务已完成。' }
        };

        $('summaryTestBtn').disabled = true;
        setSummaryTestResult('summary.test.running');
        try {
          const result = await window.completeNotify.testSummary(payload);
          if (result && result.ok && result.summary) {
            setSummaryTestResult('summary.test.success', result.summary);
            return;
          }
          const detail = formatSummaryTestFailure(result);
          setSummaryTestResult('summary.test.fail', detail);
        } catch (error) {
          setSummaryTestResult('summary.test.fail', String(error?.message || error));
        } finally {
          $('summaryTestBtn').disabled = false;
        }
      });
    }
  };

  applyLanguageToDom(config, { onGlobalChange: triggerAutoSave, onSourceChange: triggerAutoSave });
  bindSummaryControls();
  applySummaryValues(config);
  setSummaryVisibility(Boolean(config?.summary?.enabled));
  applyWatchLogRetention(config);
  applyWebhookCardToggle(config);

  if ($('watchLogRetentionDays')) {
    $('watchLogRetentionDays').addEventListener('change', () => {
      config.ui = config.ui || {};
      const n = Number($('watchLogRetentionDays').value);
      config.ui.watchLogRetentionDays = Number.isFinite(n) && n >= 1 ? n : 7;
      applyWatchLogRetention(config);
      triggerAutoSave();
    });
  }

  $('reloadBtn').addEventListener('click', async () => {
    $('reloadBtn').disabled = true;
    try {
      const latest = await window.completeNotify.getConfig();
      // Replace config contents to keep listeners’ references
      for (const key of Object.keys(config)) delete config[key];
      Object.assign(config, latest || {});

      currentLanguage = normalizeLanguage(config.ui?.language || 'zh-CN');
      config.ui.language = currentLanguage;
      $('languageSelect').value = currentLanguage;

      applyLanguageToDom(config, { onGlobalChange: triggerAutoSave, onSourceChange: triggerAutoSave });
      applySummaryValues(config);
      setSummaryVisibility(Boolean(config?.summary?.enabled));
      applyWatchLogRetention(config);
      applyWebhookCardToggle(config);
      await refreshWatchStatus();
    } catch (error) {
      setHint(String(error?.message || error));
    } finally {
      $('reloadBtn').disabled = false;
    }
  });

  $('testBtn').addEventListener('click', async () => {
    $('testBtn').disabled = true;
    setLog(t('log.testing'));
    try {
      const payload = {
        source: $('testSource').value,
        durationMinutes: Number($('testDuration').value || 0),
        taskInfo: $('testTask').value || t('test.fallbackTask')
      };
      const result = await window.completeNotify.testNotify(payload);
      setLog(JSON.stringify(result, null, 2));
    } catch (error) {
      setLog(String(error?.message || error));
    } finally {
      $('testBtn').disabled = false;
    }
  });

  // watch (interactive / VSCode plugin)
  let unsubscribeWatchLog = null;
  try {
    unsubscribeWatchLog = window.completeNotify.onWatchLog((line) => appendWatchLog(line));
  } catch (_error) {
    // ignore
  }

  async function refreshWatchStatus() {
    try {
      const status = await window.completeNotify.watchStatus();
      const running = Boolean(status && status.running);
      $('watchStatus').textContent = running ? t('watch.status.running') : t('watch.status.stopped');
      $('watchStatus').classList.toggle('on', running);
      $('watchStartBtn').disabled = running;
      $('watchStopBtn').disabled = !running;
      if ($('watchToggle')) $('watchToggle').checked = running;
    } catch (error) {
      $('watchStatus').textContent = String(error?.message || error);
      $('watchStatus').classList.remove('on');
      if ($('watchToggle')) $('watchToggle').checked = false;
    }
  }

  function buildWatchPayloadFromUi() {
    const sources = [];
    if ($('watchClaude') && $('watchClaude').checked) sources.push('claude');
    if ($('watchCodex') && $('watchCodex').checked) sources.push('codex');
    if ($('watchGemini') && $('watchGemini').checked) sources.push('gemini');
    const geminiQuietMs = Number($('watchGeminiQuietMs')?.value || 3000);
    const claudeQuietMs = Number($('watchClaudeQuietMs')?.value || 60000);
    return {
      sources: sources.length ? sources.join(',') : 'all',
      intervalMs: Number($('watchIntervalMs')?.value || 1000),
      geminiQuietMs,
      claudeQuietMs
    };
  }

  if ($('watchToggle')) {
    $('watchToggle').addEventListener('change', async () => {
      $('watchToggle').disabled = true;
      try {
        if ($('watchToggle').checked) {
          const result = await window.completeNotify.watchStart(buildWatchPayloadFromUi());
          appendWatchLog(`[watch] start result: ${JSON.stringify(result)}`);
        } else {
          const result = await window.completeNotify.watchStop();
          appendWatchLog(`[watch] stop result: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        appendWatchLog(`[watch] toggle failed: ${String(error?.message || error)}`);
      } finally {
        $('watchToggle').disabled = false;
        await refreshWatchStatus();
      }
    });
  }

  $('watchStartBtn').addEventListener('click', async () => {
    $('watchStartBtn').disabled = true;
    try {
      const result = await window.completeNotify.watchStart(buildWatchPayloadFromUi());
      appendWatchLog(`[watch] start result: ${JSON.stringify(result)}`);
    } catch (error) {
      appendWatchLog(`[watch] start failed: ${String(error?.message || error)}`);
    } finally {
      await refreshWatchStatus();
    }
  });

  $('watchStopBtn').addEventListener('click', async () => {
    $('watchStopBtn').disabled = true;
    try {
      const result = await window.completeNotify.watchStop();
      appendWatchLog(`[watch] stop result: ${JSON.stringify(result)}`);
    } catch (error) {
      appendWatchLog(`[watch] stop failed: ${String(error?.message || error)}`);
    } finally {
      await refreshWatchStatus();
    }
  });

  setWatchLog('');
  await refreshWatchStatus();

  setHint('');

  window.addEventListener('beforeunload', () => {
    if (typeof unsubscribeWatchLog === 'function') unsubscribeWatchLog();
    if (typeof cleanupClosePrompt === 'function') cleanupClosePrompt();
    if (typeof cleanupNav === 'function') cleanupNav();
  });
}

main().catch((error) => {
  setHint(String(error?.message || error));
});
