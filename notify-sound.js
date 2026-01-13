/**
 * 声音提醒脚本（兼容旧用法）
 * 用法:
 *   node notify-sound.js
 */

const { bootstrapEnv } = require('./src/bootstrap');
bootstrapEnv();

const { loadConfig } = require('./src/config');
const { notifySound } = require('./src/notifiers/sound');

async function notifyTaskCompletion(taskInfo = '任务已完成') {
  const config = loadConfig();
  const title = String(taskInfo);
  const result = await notifySound({ config, title });
  return Boolean(result.ok);
}

async function main() {
  const ok = await notifyTaskCompletion('任务完成');
  if (ok) console.log('✅ 声音提醒已触发');
  else console.log('❌ 声音提醒触发失败');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('声音脚本运行失败:', error && error.message ? error.message : error);
    process.exit(1);
  });
}

module.exports = {
  notifyTaskCompletion,
  main
};

