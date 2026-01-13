/**
 * 一键配置向导（v2）
 * - 创建/更新 settings.json（开关、阈值等）
 * - 创建/更新 .env（webhook / token 等敏感信息）
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { bootstrapEnv } = require('./src/bootstrap');
bootstrapEnv();

const { loadConfig, saveConfig } = require('./src/config');
const { sendNotifications } = require('./src/engine');
const { getDataDir, PRODUCT_NAME } = require('./src/paths');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function upsertEnvFile(updates) {
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const envPath = path.join(dataDir, '.env');
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  const remaining = { ...updates };

  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) return line;
    const key = match[1];
    if (!(key in remaining)) return line;
    const value = remaining[key];
    delete remaining[key];
    return `${key}=${value}`;
  });

  const append = Object.entries(remaining).map(([k, v]) => `${k}=${v}`);
  const final = [...nextLines.filter((l) => l !== undefined), '', ...append, ''].join('\n');
  fs.writeFileSync(envPath, final, 'utf8');
}

async function setupWizard() {
  console.log(`${PRODUCT_NAME} - 配置向导`);
  console.log('='.repeat(50));
  console.log('');

  const config = loadConfig();

  const enableWebhook = await question('是否配置通用 Webhook（默认飞书格式，可填多个，逗号分隔）？(y/n): ');
  const envUpdates = {};

  if (String(enableWebhook).trim().toLowerCase().startsWith('y')) {
    console.log('');
    console.log('Webhook 获取示例：飞书群机器人 / 钉钉 / 企微，复制 webhook URL（可多个，用逗号分隔）');
    const webhookUrl = await question('请输入 Webhook URL（可多个，用逗号分隔）: ');

    const urls = String(webhookUrl || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (urls.length === 0) {
      console.log('❌ 未提供有效的 Webhook URL，已跳过 Webhook 配置');
    } else {
      envUpdates.WEBHOOK_URLS = urls.join(',');
      config.channels.webhook.enabled = true;
      config.channels.webhook.urls = urls;
      for (const source of Object.values(config.sources || {})) {
        if (source && source.channels) source.channels.webhook = true;
      }
      console.log('✅ 已写入 WEBHOOK_URLS');
    }
  }

  console.log('');
  const enableTelegram = await question('是否配置 Telegram 通知？(y/n): ');
  if (String(enableTelegram).trim().toLowerCase().startsWith('y')) {
    const token = await question('请输入 TELEGRAM_BOT_TOKEN: ');
    const chatId = await question('请输入 TELEGRAM_CHAT_ID: ');
    if (!token || !chatId) {
      console.log('❌ Telegram 配置不完整，已跳过');
    } else {
      envUpdates.TELEGRAM_BOT_TOKEN = String(token).trim();
      envUpdates.TELEGRAM_CHAT_ID = String(chatId).trim();
      config.channels.telegram.enabled = true;
      for (const source of Object.values(config.sources || {})) {
        if (source && source.channels) source.channels.telegram = true;
      }
      console.log('✅ 已写入 Telegram 环境变量');
    }
  }

  console.log('');
  const threshold = await question('“超过多少分钟才提醒”？(默认 0): ');
  const thresholdNum = Number(threshold);
  const minDurationMinutes = Number.isFinite(thresholdNum) && thresholdNum >= 0 ? thresholdNum : 0;
  for (const source of Object.values(config.sources || {})) {
    if (source) source.minDurationMinutes = minDurationMinutes;
  }

  if (Object.keys(envUpdates).length > 0) upsertEnvFile(envUpdates);
  saveConfig(config);

  console.log('');
  const test = await question('是否发送一次测试提醒？(y/n): ');
  if (String(test).trim().toLowerCase().startsWith('y')) {
    const result = await sendNotifications({
      source: 'claude',
      taskInfo: '配置向导测试提醒（强制发送）',
      durationMs: 10 * 60 * 1000,
      cwd: process.cwd(),
      force: true
    });
    console.log(JSON.stringify(result, null, 2));
  }

  console.log('');
  console.log('✅ 配置完成');
  console.log(`✅ 已写入: ${path.join(getDataDir(), '.env')}`);
  console.log('下一步: 运行 `npm run dev` 启动桌面应用，或直接打包后双击 EXE');

  rl.close();
}

if (require.main === module) {
  setupWizard().catch((error) => {
    console.error('配置向导失败:', error && error.message ? error.message : error);
    rl.close();
    process.exit(1);
  });
}

module.exports = {
  setupWizard
};
