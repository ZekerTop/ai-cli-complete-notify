const { loadConfig } = require('./config');
const { getProjectName } = require('./project-name');
const { formatDurationMs, getSourceLabel, buildTitle } = require('./format');
const { notifyWebhook } = require('./notifiers/webhook');
const { notifyTelegram } = require('./notifiers/telegram');
const { notifySound } = require('./notifiers/sound');
const { notifyDesktopBalloon, prewarmWpf } = require('./notifiers/desktop');
const { notifyEmail } = require('./notifiers/email');
const { summarizeTask } = require('./summary');
const { focusTarget } = require('./focus');
const { checkAndRememberNotification } = require('./state');

const NOTIFICATION_DEDUPE_MS = Math.max(30 * 1000, Number(process.env.NOTIFICATION_DEDUPE_MS || 2 * 60 * 1000));

// Pre-warm PowerShell WPF assemblies on module load for faster desktop notifications
if (process.platform === 'win32') prewarmWpf();

function isChannelEnabled(config, channelName, sourceName) {
  const channelGlobal = config.channels[channelName] && config.channels[channelName].enabled;
  const source = config.sources[sourceName];
  const channelPerSource = source && source.channels && source.channels[channelName];
  if (!channelGlobal || !channelPerSource) return false;
  if (channelName === 'desktop' && process.platform !== 'win32') {
    return false;
  }
  if (channelName === 'sound' && process.platform !== 'win32') {
    const isWsl = Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);
    if (!isWsl) return false;
  }
  return true;
}

function shouldNotifyByDuration({ minDurationMinutes, durationMs, force }) {
  const thresholdMs = Math.max(0, Number(minDurationMinutes || 0)) * 60 * 1000;
  if (thresholdMs <= 0) return { should: true, reason: null };
  if (force) return { should: true, reason: null };
  if (durationMs == null) return { should: false, reason: `No duration recorded (threshold ${minDurationMinutes} min)` };
  if (durationMs < thresholdMs) return { should: false, reason: `Duration ${formatDurationMs(durationMs)} below threshold ${minDurationMinutes} min` };
  return { should: true, reason: null };
}

function buildDesktopErrorPreview(text, fallback) {
  const raw = String(text || fallback || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  if (!raw) return '';
  if (raw.length <= 100) return raw;
  return `${raw.slice(0, 97).trimEnd()}...`;
}

async function sendNotifications({ source, taskInfo, durationMs, cwd, projectNameOverride, force, summaryContext, outputContent, skipSummary, notifyKind, fromHook }) {
  const config = loadConfig();
  const sourceName = source || 'claude';
  const sourceConfig = config.sources[sourceName] || config.sources.claude;
  const kind = notifyKind === 'confirm' ? 'confirm' : notifyKind === 'error' ? 'error' : 'complete';

  if (!sourceConfig || !sourceConfig.enabled) {
    return { skipped: true, reason: `source ${sourceName} disabled`, results: [] };
  }

  // Hooks are only supported by Claude Code and Gemini CLI.
  // In hooks mode, keep watch-originated results as a fallback because some CLI
  // builds may stop emitting hook events for certain responses. Cross-path
  // duplicates are suppressed later via persistent notification dedupe.
  const notificationMode = (config.ui && config.ui.notificationMode) || 'watch';
  const sourceUsesHooks = sourceName === 'claude' || sourceName === 'gemini';
  if (notificationMode === 'watch' && fromHook && sourceUsesHooks) {
    return {
      skipped: true,
      reason: `notificationMode is watch; hook-originated notification skipped for ${sourceName}`,
      results: []
    };
  }

  const { should, reason } = shouldNotifyByDuration({
    minDurationMinutes: sourceConfig.minDurationMinutes,
    durationMs,
    force: Boolean(force)
  });

  if (!should) {
    return { skipped: true, reason, results: [] };
  }

  const cwdToUse = cwd || process.cwd();
  const projectName = projectNameOverride || getProjectName(cwdToUse);
  const sourceLabel = getSourceLabel(sourceName);
  const dedupeText = String(
    outputContent
      || (summaryContext && summaryContext.assistantMessage)
      || taskInfo
      || ''
  ).trim();

  if (dedupeText) {
    const duplicated = checkAndRememberNotification({
      source: sourceName,
      cwd: cwdToUse,
      text: dedupeText,
      dedupeMs: NOTIFICATION_DEDUPE_MS,
    });
    if (duplicated) {
      return {
        skipped: true,
        reason: `duplicate notification suppressed for ${sourceName}`,
        results: [],
      };
    }
  }

  const durationText = formatDurationMs(durationMs);
  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
  const statusLine = kind === 'error' ? 'Failed at' : kind === 'confirm' ? 'Alert at' : 'Completed at';
  const resolvedOutput = String(
    outputContent
      || (summaryContext && summaryContext.assistantMessage)
      || ''
  );
  const lines = [
    `${statusLine}: ${timestamp}`,
    durationText ? `Duration: ${durationText}` : null,
    `Source: ${sourceLabel}`
  ].filter(Boolean);
  const contentText = lines.join('\n');
  const tasks = [];
  const results = [];

  // Start summary generation immediately (don't await yet)
  const summaryPromise = skipSummary
    ? Promise.resolve('')
    : summarizeTask({ config, taskInfo, contentText, summaryContext });

  // Add desktop notification task immediately (uses original taskInfo, doesn't need summary)
  if (isChannelEnabled(config, 'desktop', sourceName)) {
    const focusEnabled = Boolean(config?.ui?.autoFocusOnNotify);
    const focusTargetKey = String(config?.ui?.focusTarget || 'auto');
    const lang = String(config?.ui?.language || 'zh-CN');
    const targetLabel = focusTargetKey === 'vscode'
      ? 'VSCode'
      : focusTargetKey === 'terminal'
        ? (lang === 'en' ? 'terminal' : '命令行')
        : (lang === 'en' ? 'workspace' : '工作界面');
    const notifyLabel = kind === 'confirm'
      ? (lang === 'en' ? 'Confirmation needed' : '确认提醒')
      : kind === 'error'
        ? (lang === 'en' ? 'Task failed' : '任务失败')
      : (lang === 'en' ? 'Task completed' : '任务完成');
    const clickHint = focusEnabled
      ? (lang === 'en' ? `Return to ${targetLabel}` : `点击返回${targetLabel}`)
      : '';
    const desktopTitle = kind === 'confirm'
      ? notifyLabel
      : kind === 'error'
        ? String(taskInfo || notifyLabel)
      : String(taskInfo || notifyLabel);
    const desktopMessage = kind === 'confirm'
      ? (lang === 'en' ? 'Please confirm in the workspace' : '请确认任务结果')
      : kind === 'error'
        ? buildDesktopErrorPreview(
            resolvedOutput,
            lang === 'en' ? 'See Claude output for details' : '请查看 Claude 输出详情',
          )
      : (durationText ? (lang === 'en' ? `Duration: ${durationText}` : `耗时：${durationText}`) : '');
    tasks.push(
      notifyDesktopBalloon({
        title: desktopTitle,
        message: desktopMessage,
        timeoutMs: config.channels.desktop.balloonMs,
        clickHint,
        kind,
        projectName,
        onClick: focusEnabled
          ? () => focusTarget(config, { cwd: cwdToUse, source: sourceName, ppid: process.ppid })
          : null
      }).then((r) => ({ channel: 'desktop', ...r }))
    );
  }

  // Add sound notification task (doesn't need summary)
  if (isChannelEnabled(config, 'sound', sourceName)) {
    tasks.push(
      notifySound({ config, title: taskInfo }).then((r) => ({ channel: 'sound', ...r }))
    );
  }

  // Now wait for summary to complete before adding notifications that need it
  const summary = await summaryPromise;
  const summaryUsed = Boolean(summary);
  const effectiveTaskInfo = summary || taskInfo;

  const titleTaskInfo = effectiveTaskInfo;
  const title = buildTitle({
    projectName,
    taskInfo: titleTaskInfo,
    sourceLabel,
    includeSourcePrefixInTitle: true
  });

  if (isChannelEnabled(config, 'telegram', sourceName)) {
    tasks.push(
      notifyTelegram({ config, title, contentText })
        .then((r) => ({ channel: 'telegram', ...r }))
    );
  }

  if (isChannelEnabled(config, 'webhook', sourceName)) {
    tasks.push(
      notifyWebhook({
        config,
        title,
        contentText,
        projectName,
        timestamp,
        durationText,
        sourceLabel,
        taskInfo: effectiveTaskInfo,
        outputContent: resolvedOutput,
        summaryUsed
      })
        .then((r) => ({ channel: 'webhook', ...r }))
    );
  }

  if (isChannelEnabled(config, 'email', sourceName)) {
    tasks.push(
      notifyEmail({ config, title, contentText })
        .then((r) => ({ channel: 'email', ...r }))
    );
  }

  if (tasks.length === 0) {
    if (process.platform !== 'win32') {
      const unsupported = [];
      if (config.channels.sound && config.channels.sound.enabled && sourceConfig.channels.sound) unsupported.push('sound');
      if (config.channels.desktop && config.channels.desktop.enabled && sourceConfig.channels.desktop) unsupported.push('desktop');
      if (unsupported.length) {
        return { skipped: true, reason: `Unsupported on this platform: ${unsupported.join('/')}`, results: [] };
      }
    }
    return { skipped: true, reason: 'No notification channels enabled', results: [] };
  }

  const settled = await Promise.allSettled(tasks);
  for (const item of settled) {
    if (item.status === 'fulfilled') results.push(item.value);
    else results.push({ channel: 'unknown', ok: false, error: item.reason ? String(item.reason) : 'unknown error' });
  }

  return { skipped: false, reason: null, results };
}

module.exports = {
  sendNotifications,
  shouldNotifyByDuration
};


