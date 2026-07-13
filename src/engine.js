const { loadConfig } = require('./config');
const { getProjectName } = require('./project-name');
const { formatDurationMs, getSourceLabel, buildTitle } = require('./format');
const { notifyWebhook } = require('./notifiers/webhook');
const { notifyTelegram } = require('./notifiers/telegram');
const { notifySound } = require('./notifiers/sound');
const { notifyDesktopBalloon, prewarmWpf } = require('./notifiers/desktop');
const { notifyEmail } = require('./notifiers/email');
const { notifyGotify } = require('./notifiers/gotify');
const { summarizeTaskDetailed } = require('./summary');
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
  if (channelName === 'desktop' && process.platform !== 'win32' && process.platform !== 'darwin') {
    return false;
  }
  if (channelName === 'sound' && process.platform !== 'win32' && process.platform !== 'darwin') {
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

function buildSummaryDiagnostics(result, skipped) {
  if (skipped) {
    return { attempted: false, used: false, skipped: true, reason: 'skipSummary' };
  }
  if (result && result.ok && result.summary) {
    const diagnostics = { attempted: true, used: true };
    if (result.status) diagnostics.status = result.status;
    return diagnostics;
  }
  const diagnostics = { attempted: true, used: false };
  if (result && result.error) diagnostics.error = String(result.error);
  if (result && result.status) diagnostics.status = result.status;
  return diagnostics;
}

function shouldSkipByNotificationMode({ sourceName, fromHook, notificationMode }) {
  const mode = notificationMode === 'hooks' ? 'hooks' : 'watch';
  const hookCapable = sourceName === 'claude' || sourceName === 'gemini';

  // Codex has no hooks path and always uses watch.
  // OpenCode has no watch path and always uses plugin hooks.
  if (sourceName === 'codex' || sourceName === 'opencode') {
    return null;
  }

  // Watch-only mode means log polling for Claude/Gemini too: suppress their
  // installed hooks so the mode option keeps a distinct engine meaning.
  // Hybrid ("hooks") mode allows both paths; content-based dedupe later
  // collapses same-completion duplicates, and watch remains a real fallback
  // when hooks are missing or do not fire. Direct CLI notify/stop/run never
  // set fromHook, so they stay available in either mode.
  if (mode === 'watch' && fromHook && hookCapable) {
    return {
      skipped: true,
      reason: `notificationMode is watch; hook-originated notification skipped for ${sourceName}`,
      results: [],
    };
  }

  return null;
}

async function sendNotifications({ source, taskInfo, durationMs, cwd, projectNameOverride, force, summaryContext, outputContent, skipSummary, notifyKind, fromHook, dedupeKey }) {
  const config = loadConfig();
  const sourceName = source || 'claude';
  const sourceConfig = config.sources[sourceName] || config.sources.claude;
  const kind = notifyKind === 'confirm' ? 'confirm' : notifyKind === 'error' ? 'error' : 'complete';

  if (!sourceConfig || !sourceConfig.enabled) {
    return { skipped: true, reason: `source ${sourceName} disabled`, results: [] };
  }

  // Hybrid ("hooks") keeps Codex on watch while Claude/Gemini/OpenCode can use
  // hooks/plugins. Watch-only suppresses Claude/Gemini hooks so the two modes
  // stay distinct. Cross-path duplicates still rely on content-based dedupe.
  const notificationMode = (config.ui && config.ui.notificationMode) || 'hooks';
  const modeSkip = shouldSkipByNotificationMode({
    sourceName,
    fromHook: Boolean(fromHook),
    notificationMode
  });
  if (modeSkip) return modeSkip;

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
  const explicitDedupeKey = String(dedupeKey || '').trim();
  const dedupeText = String(
    explicitDedupeKey
      || outputContent
      || (summaryContext && summaryContext.assistantMessage)
      || taskInfo
      || ''
  ).trim();

  if (dedupeText) {
    const duplicated = checkAndRememberNotification({
      source: sourceName,
      // Explicit dedupe keys are content-scoped (e.g. Gemini hook/watch) and
      // must ignore cwd — GUI watch cwd often differs from the project cwd in
      // the hook payload, which would otherwise break cross-path dedupe.
      cwd: explicitDedupeKey ? '' : cwdToUse,
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
    ? Promise.resolve(null)
    : summarizeTaskDetailed({ config, taskInfo, contentText, summaryContext })
      .catch((error) => ({
        ok: false,
        error: error && error.message ? error.message : String(error)
      }));

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
  const summaryResult = await summaryPromise;
  const summary = summaryResult && summaryResult.ok && summaryResult.summary ? summaryResult.summary : '';
  const summaryUsed = Boolean(summary);
  const summaryDiagnostics = buildSummaryDiagnostics(summaryResult, Boolean(skipSummary));
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
        summaryUsed,
        summaryDiagnostics
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

  if (isChannelEnabled(config, 'gotify', sourceName)) {
    tasks.push(
      notifyGotify({
        config,
        kind,
        projectName,
        sourceLabel,
        taskInfo: effectiveTaskInfo,
        contentText,
        language: config?.ui?.language,
      })
        .then((r) => ({ channel: 'gotify', ...r }))
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

  return { skipped: false, reason: null, results, summary: summaryDiagnostics };
}

module.exports = {
  sendNotifications,
  shouldNotifyByDuration,
  shouldSkipByNotificationMode
};
