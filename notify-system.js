/**
 * 兼容入口：保持原来的 `node notify-system.js --task "..."` 用法
 * 同时支持新的 start/stop/notify 事件模型（用于“超过 X 分钟才提醒”）。
 */

const { bootstrapEnv } = require('./src/bootstrap');
bootstrapEnv();

const { parseArgs } = require('./src/args');
const { markTaskStart, consumeTaskStart } = require('./src/state');
const { sendNotifications } = require('./src/engine');

function toNumberOrNull(value) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));

  const source = String(flags.source || flags.s || 'claude');
  const taskInfo = String(flags.message || flags.task || 'Claude Code任务已完成');
  const event = String(flags.event || '');

  const cwd = process.cwd();

  if (event === 'start' || flags.start) {
    markTaskStart({ source, cwd, task: taskInfo });
    return;
  }

  if (event === 'stop' || flags.stop) {
    const entry = consumeTaskStart({ source, cwd });
    const durationMs = entry ? Date.now() - entry.startedAt : null;
    await sendNotifications({ source, taskInfo, durationMs, cwd, force: Boolean(flags.force) });
    return;
  }

  const durationMinutes = toNumberOrNull(flags['duration-minutes']);
  const durationMs = durationMinutes != null ? durationMinutes * 60 * 1000 : toNumberOrNull(flags['duration-ms']);
  await sendNotifications({ source, taskInfo, durationMs, cwd, force: Boolean(flags.force) });
}

if (require.main === module) {
  main().catch((error) => {
    console.error('notify-system 运行失败:', error && error.message ? error.message : error);
    process.exit(1);
  });
}

module.exports = {
  main
};

