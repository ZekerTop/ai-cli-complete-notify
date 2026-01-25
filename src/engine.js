const { loadConfig } = require('./config');
const { getProjectName } = require('./project-name');
const { formatDurationMs, getSourceLabel, buildTitle } = require('./format');
const { notifyWebhook } = require('./notifiers/webhook');
const { notifyTelegram } = require('./notifiers/telegram');
const { notifySound } = require('./notifiers/sound');
const { notifyDesktopBalloon } = require('./notifiers/desktop');
const { notifyEmail } = require('./notifiers/email');

function isChannelEnabled(config, channelName, sourceName) {
  const channelGlobal = config.channels[channelName] && config.channels[channelName].enabled;
  const source = config.sources[sourceName];
  const channelPerSource = source && source.channels && source.channels[channelName];
  if (!channelGlobal || !channelPerSource) return false;
  if ((channelName === 'sound' || channelName === 'desktop') && process.platform !== 'win32') {
    return false;
  }
  return true;
}

function shouldNotifyByDuration({ minDurationMinutes, durationMs, force }) {
  const thresholdMs = Math.max(0, Number(minDurationMinutes || 0)) * 60 * 1000;
  if (thresholdMs <= 0) return { should: true, reason: null };
  if (force) return { should: true, reason: null };
  if (durationMs == null) return { should: false, reason: `未获取到耗时，阈值为 ${minDurationMinutes} 分钟` };
  if (durationMs < thresholdMs) return { should: false, reason: `耗时 ${formatDurationMs(durationMs)} 未达到阈值 ${minDurationMinutes} 分钟` };
  return { should: true, reason: null };
}

async function sendNotifications({ source, taskInfo, durationMs, cwd, projectNameOverride, force, outputContent }) {
  const config = loadConfig();
  const sourceName = source || 'claude';
  const sourceConfig = config.sources[sourceName] || config.sources.claude;

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

  const title = buildTitle({
    projectName,
    taskInfo,
    sourceLabel,
    includeSourcePrefixInTitle: Boolean(config.format.includeSourcePrefixInTitle)
  });

  const durationText = formatDurationMs(durationMs);
  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
  const lines = [
    `完成时间：${timestamp}`,
    durationText ? `耗时：${durationText}` : null,
    `来源：${sourceLabel}`
  ].filter(Boolean);
  const contentText = lines.join('\n');

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
        taskInfo,
        outputContent // 传递输出内容
      })
        .then((r) => ({ channel: 'webhook', ...r }))
    );
  }

  if (isChannelEnabled(config, 'desktop', sourceName)) {
    tasks.push(
      notifyDesktopBalloon({
        title,
        message: durationText ? `${taskInfo}\n耗时：${durationText}` : String(taskInfo),
        timeoutMs: config.channels.desktop.balloonMs
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
