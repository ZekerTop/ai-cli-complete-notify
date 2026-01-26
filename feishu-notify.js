/**
 * Webhook notifier (Feishu-format payload, legacy entry point).
 * Usage:
 *   node feishu-notify.js --webhook "https://open.feishu.cn/..." --message "测试消息"
 */

const { bootstrapEnv } = require('./src/bootstrap');
bootstrapEnv();

const { parseArgs } = require('./src/args');
const { loadConfig } = require('./src/config');
const { notifyWebhook } = require('./src/notifiers/webhook');

async function notifyTaskCompletion(taskInfo = '任务已完成', webhookUrl = null, projectName = '') {
  const baseConfig = loadConfig();
  const config = JSON.parse(JSON.stringify(baseConfig));

  const urls = webhookUrl ? [String(webhookUrl).trim()] : [];
  if (!config.channels.webhook) config.channels.webhook = { enabled: true, urls: [] };
  if (urls.length) {
    config.channels.webhook.enabled = true;
    config.channels.webhook.urls = urls;
  }
  for (const source of Object.values(config.sources || {})) {
    if (source && source.channels) source.channels.webhook = true;
  }

  const title = projectName ? `${projectName}: ${taskInfo}` : String(taskInfo);
  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
  const contentText = `完成时间：${timestamp}`;

  const result = await notifyWebhook({
    config,
    title,
    contentText,
    projectName,
    timestamp,
    durationText: null,
    sourceLabel: 'Webhook',
    taskInfo
  });
  return Boolean(result.ok);
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const taskInfo = String(flags.message || flags.task || '测试消息');
  const webhookUrl = flags.webhook ? String(flags.webhook) : null;

  const ok = await notifyTaskCompletion(taskInfo, webhookUrl);
  if (ok) console.log('✅ Webhook 通知发送成功');
  else console.log('❌ Webhook 通知发送失败（请检查 webhook / 环境变量）');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Webhook 脚本运行失败:', error && error.message ? error.message : error);
    process.exit(1);
  });
}

module.exports = {
  notifyTaskCompletion,
  main
};
