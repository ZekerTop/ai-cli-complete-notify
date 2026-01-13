/**
 * Telegram 通知测试脚本（兼容旧用法）
 * 用法:
 *   node telegram-notify.js --message "测试消息"
 */

const { bootstrapEnv } = require('./src/bootstrap');
bootstrapEnv();

const { parseArgs } = require('./src/args');
const { loadConfig } = require('./src/config');
const { notifyTelegram } = require('./src/notifiers/telegram');

class TelegramNotifier {
  constructor() {
    const config = loadConfig();
    const botTokenEnv = config.channels.telegram.botTokenEnv || 'TELEGRAM_BOT_TOKEN';
    const chatIdEnv = config.channels.telegram.chatIdEnv || 'TELEGRAM_CHAT_ID';
    this.enabled = Boolean(process.env[botTokenEnv] && process.env[chatIdEnv]);
  }
}

async function notifyTaskCompletion(taskInfo = '任务已完成', projectName = '') {
  const config = loadConfig();
  const title = projectName ? `${projectName}: ${taskInfo}` : String(taskInfo);
  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
  const contentText = `完成时间：${timestamp}`;
  const result = await notifyTelegram({ config, title, contentText });
  return Boolean(result.ok);
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const taskInfo = String(flags.message || flags.task || '测试消息');

  const config = loadConfig();
  const title = taskInfo;
  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
  const contentText = `完成时间：${timestamp}`;

  const result = await notifyTelegram({ config, title, contentText });
  if (result.ok) console.log('✅ Telegram消息发送成功');
  else console.log(`❌ Telegram消息发送失败: ${result.error || 'unknown'}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Telegram脚本运行失败:', error && error.message ? error.message : error);
    process.exit(1);
  });
}

module.exports = {
  TelegramNotifier,
  notifyTaskCompletion,
  main
};
