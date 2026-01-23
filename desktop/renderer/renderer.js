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
    'nav.advanced': '高级',
    'ui.language': '语言',
    'ui.watchToggle': '监听',

    'btn.projectLink': '项目地址',
    'btn.openDataDir': '打开数据目录',
    'btn.openSettings': '打开 settings.json',
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
    'section.advanced.title': '高级',
    'section.advanced.sub': '格式化与展示相关配置',

    'watch.polling': '轮询(ms)',
    'watch.claudeDebounce': 'Claude 去抖(ms)',
    'watch.debounce': 'Gemini 去抖(ms)',
    'watch.hint': '建议把监听常驻开启（比如开机自启/放在后台终端），这样无论你在终端还是 VSCode 里用 Claude/Codex/Gemini，都能自动提醒。',
    'watch.logs': '监听日志',
    'watch.status.running': '运行中',
    'watch.status.stopped': '未运行',

    'test.source': '来源',
    'test.duration': '耗时(分钟)',
    'test.message': '内容',
    'test.defaultTask': '测试提醒（强制发送）',
    'test.fallbackTask': '测试提醒',

    'advanced.titlePrefix': '标题包含来源前缀（例如 [Codex]）',
    'advanced.useFeishuCard': 'Webhook 使用飞书卡片格式',
    'advanced.closeBehavior': '关闭按钮行为',
    'advanced.closeHint': '选择“隐藏到托盘”后，点击右上角关闭不会退出，会在右下角托盘保留图标，点击即可重新打开。',
    'advanced.autostart': '开机自启动（登录后自动在后台运行）',
    'advanced.autostartHint': 'Windows / macOS 支持开机自启动；Linux 需自行配置。',

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
    'nav.advanced': 'Advanced',
    'ui.language': 'Language',
    'ui.watchToggle': 'Watch',

    'btn.projectLink': 'Project repo',
    'btn.openDataDir': 'Open data folder',
    'btn.openSettings': 'Open settings.json',
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
    'section.advanced.title': 'Advanced',
    'section.advanced.sub': 'Formatting and UI preferences',

    'watch.polling': 'Polling (ms)',
    'watch.claudeDebounce': 'Claude debounce (ms)',
    'watch.debounce': 'Gemini debounce (ms)',
    'watch.hint': 'Keep watch running in the background so notifications work for both terminal and VSCode.',
    'watch.logs': 'Watch logs',
    'watch.status.running': 'Running',
    'watch.status.stopped': 'Stopped',

    'test.source': 'Source',
    'test.duration': 'Duration (min)',
    'test.message': 'Message',
    'test.defaultTask': 'Test notification (forced)',
    'test.fallbackTask': 'Test notification',

    'advanced.titlePrefix': 'Include source prefix in title (e.g., [Codex])',
    'advanced.useFeishuCard': 'Use Feishu card format for Webhook',
    'advanced.closeBehavior': 'Close button behavior',
    'advanced.closeHint': 'If set to “Minimize to tray”, closing the window keeps the app running in the system tray.',
    'advanced.autostart': 'Launch at login (run in background after login)',
    'advanced.autostartHint': 'Supported on Windows/macOS; Linux requires manual setup.',

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

function appendWatchLog(line) {
  const next = ($('watchLog').textContent || '') + String(line || '') + '\n';
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

async function main() {
  const cleanupNav = setupNav();
  const meta = await window.completeNotify.getMeta();
  $('productName').textContent = meta.productName;

  $('openDataDir').addEventListener('click', () => window.completeNotify.openPath(meta.dataDir));
  $('openConfigPath').addEventListener('click', () => window.completeNotify.openPath(meta.configPath));
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

  $('useFeishuCard').checked = Boolean(config.channels?.webhook?.useFeishuCard);
  $('useFeishuCard').addEventListener('change', () => {
    config.channels.webhook = config.channels.webhook || {};
    config.channels.webhook.useFeishuCard = $('useFeishuCard').checked;
    triggerAutoSave();
  });

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

  applyLanguageToDom(config, { onGlobalChange: triggerAutoSave, onSourceChange: triggerAutoSave });

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
    if (typeof cleanupNav === 'function') cleanupNav();
  });
}

main().catch((error) => {
  setHint(String(error?.message || error));
});
