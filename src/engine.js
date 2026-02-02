const { loadConfig } = require('./config');
const { getProjectName } = require('./project-name');
const { formatDurationMs, getSourceLabel, buildTitle } = require('./format');
const { notifyWebhook } = require('./notifiers/webhook');
const { notifyTelegram } = require('./notifiers/telegram');
const { notifySound } = require('./notifiers/sound');
const { notifyDesktopBalloon } = require('./notifiers/desktop');
const { notifyEmail } = require('./notifiers/email');
const { summarizeTask } = require('./summary');
const { focusTarget } = require('./focus');

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

async function sendNotifications({ source, taskInfo, durationMs, cwd, projectNameOverride, force, summaryContext, outputContent, skipSummary, notifyKind }) {
  const config = loadConfig();
  const sourceName = source || 'claude';
  const sourceConfig = config.sources[sourceName] || config.sources.claude;
  const kind = notifyKind === 'confirm' ? 'confirm' : 'complete';

  if (!sourceConfig || !sourceConfig.enabled) {
    return { skipped: true, reason: `source ${sourceName} disabled`, results: [] };
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

  const durationText = formatDurationMs(durationMs);
  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
  const lines = [
    `Completed at: ${timestamp}`,
    durationText ? `Duration: ${durationText}` : null,
    `Source: ${sourceLabel}`
  ].filter(Boolean);
  const contentText = lines.join('\n');

  const summary = skipSummary ? '' : await summarizeTask({ config, taskInfo, contentText, summaryContext });
  const summaryUsed = Boolean(summary);
  const effectiveTaskInfo = summary || taskInfo;
  const resolvedOutput = String(
    outputContent
      || (summaryContext && summaryContext.assistantMessage)
      || ''
  );

  const titleTaskInfo = effectiveTaskInfo;
  const title = buildTitle({
    projectName,
    taskInfo: titleTaskInfo,
    sourceLabel,
    includeSourcePrefixInTitle: true
  });

  const tasks = [];
  const results = [];

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
      : (lang === 'en' ? 'Task completed' : '任务完成');
    const clickHint = focusEnabled
      ? (lang === 'en' ? `Click to return to ${targetLabel}` : `点击通知切回${targetLabel}`)
      : '';
    const desktopTitle = kind === 'confirm'
      ? notifyLabel
      : String(effectiveTaskInfo || notifyLabel);
    const desktopMessage = kind === 'confirm'
      ? (lang === 'en' ? 'Please confirm in the workspace' : '请确认任务结果')
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

  if (isChannelEnabled(config, 'sound', sourceName)) {
    tasks.push(
      notifySound({ config, title }).then((r) => ({ channel: 'sound', ...r }))
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


