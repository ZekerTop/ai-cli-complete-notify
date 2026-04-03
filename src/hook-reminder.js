const { getHookStatus } = require('./hooks');
const { loadConfig } = require('./config');

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const REMINDER_STATE_FILE = '.hook-reminder-state.json';

function getStateFilePath() {
  const { getDataDir } = require('./paths');
  const path = require('path');
  return path.join(getDataDir(), REMINDER_STATE_FILE);
}

function loadReminderState() {
  const fs = require('fs');
  const statePath = getStateFilePath();
  try {
    if (!fs.existsSync(statePath)) return {};
    const raw = fs.readFileSync(statePath, 'utf8');
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
}

function saveReminderState(state) {
  const fs = require('fs');
  const path = require('path');
  const statePath = getStateFilePath();
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

function shouldShowReminder(source) {
  const state = loadReminderState();
  const lastShown = state[source] || 0;
  return Date.now() - lastShown > REMINDER_COOLDOWN_MS;
}

function markReminderShown(source) {
  const state = loadReminderState();
  state[source] = Date.now();
  saveReminderState(state);
}

function getSourceDisplayName(source) {
  const names = {
    claude: 'Claude Code',
    gemini: 'Gemini CLI',
    opencode: 'OpenCode'
  };
  return names[source] || source;
}

function getInstallCommand(source) {
  const path = require('path');
  const exeName = process.pkg ? path.basename(process.execPath) : 'node ai-reminder.js';
  return `${exeName} hooks install --target ${source}`;
}

function buildReminderMessage(source, lang) {
  const displayName = getSourceDisplayName(source);
  const installCmd = getInstallCommand(source);

  if (lang === 'en') {
    return [
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `⚠️  ${displayName} Hook Not Configured`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `You're using watch mode, but ${displayName} hooks are not installed.`,
      'This may cause inaccurate notifications (e.g., notifying before task completion).',
      '',
      '📌 Recommended: Install hooks for accurate, event-driven notifications',
      '',
      `   ${installCmd}`,
      '',
      'Hooks provide:',
      '  ✓ Precise timing - notifies exactly when tasks complete',
      '  ✓ Better reliability - no polling delays or false positives',
      '  ✓ Lower resource usage - event-driven instead of file watching',
      '',
      'Note: This reminder shows once per 24 hours.',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ''
    ].join('\n');
  }

  return [
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `⚠️  ${displayName} Hook 未配置`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `您正在使用 watch 模式，但 ${displayName} 的 hooks 尚未安装。`,
    '这可能导致通知不准确（例如任务未完成就提醒）。',
    '',
    '📌 建议：安装 hooks 以获得精确的事件驱动通知',
    '',
    `   ${installCmd}`,
    '',
    'Hooks 的优势：',
    '  ✓ 精确时机 - 在任务真正完成时通知',
    '  ✓ 更可靠 - 无轮询延迟或误报',
    '  ✓ 低资源占用 - 事件驱动而非文件监听',
    '',
    '提示：此提醒每 24 小时显示一次。',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ''
  ].join('\n');
}

function checkAndRemindHooks(sources, options = {}) {
  const config = loadConfig();
  const lang = (config && config.ui && config.ui.language) || 'zh-CN';
  const quiet = Boolean(options.quiet);

  // Parse sources
  const sourceList = typeof sources === 'string'
    ? sources.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    : Array.isArray(sources)
      ? sources.map(s => String(s).trim().toLowerCase()).filter(Boolean)
      : [];

  // Expand 'all' to specific sources
  const expandedSources = sourceList.includes('all')
    ? ['claude', 'gemini', 'opencode']
    : sourceList;

  // Check hook status
  const hookStatus = getHookStatus();
  const uninstalledSources = [];

  for (const source of expandedSources) {
    if (source === 'codex') continue; // Codex doesn't support hooks

    const status = hookStatus[source];
    if (status && !status.installed) {
      uninstalledSources.push(source);
    }
  }

  // Show reminders for uninstalled hooks
  if (!quiet && uninstalledSources.length > 0) {
    for (const source of uninstalledSources) {
      if (shouldShowReminder(source)) {
        console.log(buildReminderMessage(source, lang));
        markReminderShown(source);
      }
    }
  }

  return {
    checked: expandedSources,
    uninstalled: uninstalledSources,
    reminded: uninstalledSources.filter(s => shouldShowReminder(s))
  };
}

module.exports = {
  checkAndRemindHooks,
  shouldShowReminder,
  markReminderShown
};
