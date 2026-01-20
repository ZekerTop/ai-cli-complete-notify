const { parseArgs } = require('./args');
const { loadConfig, saveConfig, getConfigPath } = require('./config');
const { markTaskStart, consumeTaskStart } = require('./state');
const { sendNotifications } = require('./engine');
const { PRODUCT_NAME } = require('./paths');
const { spawn } = require('child_process');

function toNumberOrNull(value) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function printHelp() {
  console.log(`${PRODUCT_NAME}

用法:
  ${PRODUCT_NAME}.exe start  --source claude  --task "..."
  ${PRODUCT_NAME}.exe stop   --source claude  --task "..." [--force]
  ${PRODUCT_NAME}.exe notify --source claude  --task "..." [--duration-minutes 12] [--force]
  ${PRODUCT_NAME}.exe run    --source claude  -- <command> [args...]
  ${PRODUCT_NAME}.exe watch  [--sources all] [--interval-ms 1000] [--gemini-quiet-ms 3000] [--claude-quiet-ms 60000] [--quiet]
  ${PRODUCT_NAME}.exe config

说明:
  - source 支持: claude / codex / gemini
  - 阈值提醒建议使用 start/stop（自动计算耗时）
  - 最省事的接入方式是 run：由 ${PRODUCT_NAME} 负责计时并在命令结束后提醒
  - 交互式/VSCode 插件场景建议使用 watch：自动监听本机日志并在每次回复完成后提醒

配置:
  - settings: ${getConfigPath()}
  - env: WEBHOOK_URLS, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, EMAIL_HOST/EMAIL_USER/EMAIL_PASS/EMAIL_FROM/EMAIL_TO
`);
}

async function runCli(argv) {
  const { positional, flags, rest } = parseArgs(argv);
  const command = positional[0] || 'help';

  if (flags.help || flags.h || command === 'help' || command === '--help') {
    printHelp();
    return { ok: true, mode: 'help' };
  }

  if (command === 'config') {
    if (flags.set) {
      const config = loadConfig();
      const patch = JSON.parse(String(flags.set));
      const next = saveConfig({ ...config, ...patch });
      console.log(JSON.stringify(next, null, 2));
      return { ok: true, mode: 'config' };
    }
    console.log(JSON.stringify(loadConfig(), null, 2));
    return { ok: true, mode: 'config' };
  }

  if (command === 'watch') {
    const sources = flags.sources || flags.source || flags.s || 'all';
    const intervalMs = toNumberOrNull(flags['interval-ms']) || 1000;
    const geminiQuietMs = toNumberOrNull(flags['gemini-quiet-ms']) || 3000;
    const claudeQuietMs = toNumberOrNull(flags['claude-quiet-ms']);
    const quiet = Boolean(flags.quiet);

    const { startWatch } = require('./watch');
    const stop = startWatch({
      sources,
      intervalMs,
      geminiQuietMs,
      claudeQuietMs,
      log: quiet ? () => {} : console.log
    });

    if (!quiet) {
      const claudeLabel = claudeQuietMs == null ? 'default' : claudeQuietMs;
      console.log(`watching sources=${String(sources)} intervalMs=${intervalMs} geminiQuietMs=${geminiQuietMs} claudeQuietMs=${claudeLabel}`);
      console.log('Press Ctrl+C to stop.');
    }

    const cleanup = () => {
      try {
        stop();
      } catch (_error) {
        // ignore
      }
    };

    process.once('SIGINT', () => {
      cleanup();
      process.exit(0);
    });

    process.once('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });

    await new Promise(() => {});
  }

  const source = String(flags.source || flags.s || 'claude');
  const taskInfo = String(flags.task || flags.message || flags.m || '任务已完成');
  const cwd = process.cwd();

  if (command === 'start') {
    const entry = markTaskStart({ source, cwd, task: taskInfo });
    console.log(`已记录开始: ${entry.source} (${entry.cwd})`);
    return { ok: true, mode: 'start' };
  }

  if (command === 'stop') {
    const entry = consumeTaskStart({ source, cwd });
    const durationMs = entry ? Date.now() - entry.startedAt : null;

    const result = await sendNotifications({ source, taskInfo, durationMs, cwd, force: Boolean(flags.force) });
    printResult(result);
    return { ok: true, mode: 'stop', result };
  }

  if (command === 'notify') {
    const durationMinutes = toNumberOrNull(flags['duration-minutes']);
    const durationMs = durationMinutes != null ? durationMinutes * 60 * 1000 : toNumberOrNull(flags['duration-ms']);

    const result = await sendNotifications({ source, taskInfo, durationMs, cwd, force: Boolean(flags.force) });
    printResult(result);
    return { ok: true, mode: 'notify', result };
  }

  if (command === 'run') {
    const childArgv = rest.length > 0 ? rest : positional.slice(1);
    if (childArgv.length === 0) {
      return { ok: false, mode: 'run', error: '缺少要执行的命令。示例：run --source codex -- codex <args...>' };
    }

    const startedAt = Date.now();
    const { exitCode, spawnError } = await runChild(childArgv);
    const durationMs = Date.now() - startedAt;

    const effectiveTask = flags.task || flags.message || flags.m || buildAutoTask(childArgv, exitCode);
    const notifyResult = await sendNotifications({
      source,
      taskInfo: String(effectiveTask),
      durationMs,
      cwd,
      force: Boolean(flags.force)
    });
    printResult(notifyResult);

    if (spawnError) {
      return { ok: false, mode: 'run', error: spawnError, exitCode: typeof exitCode === 'number' ? exitCode : 1 };
    }

    return { ok: true, mode: 'run', exitCode: typeof exitCode === 'number' ? exitCode : 0, result: notifyResult };
  }

  return { ok: false, mode: 'unknown', error: `未知命令: ${command}` };
}

function runChild(childArgv) {
  return new Promise((resolve) => {
    const command = String(childArgv[0] || '');
    const args = childArgv.slice(1).map((a) => String(a));

    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const child = spawn(command, args, {
      stdio: 'inherit',
      windowsHide: false
    });

    child.on('error', (error) => {
      if (process.platform !== 'win32') {
        done({ exitCode: 127, spawnError: error && error.message ? error.message : String(error) });
        return;
      }

      // Windows 下对 .cmd/.bat 等情况做一次 cmd.exe 兜底
      const cmdExe = process.env.ComSpec || 'cmd.exe';
      const cmdLine = [command, ...args].map(quoteForCmd).join(' ');
      const fallback = spawn(cmdExe, ['/d', '/s', '/c', cmdLine], {
        stdio: 'inherit',
        windowsHide: false
      });

      fallback.on('error', (fallbackError) => {
        done({ exitCode: 127, spawnError: fallbackError && fallbackError.message ? fallbackError.message : String(fallbackError) });
      });

      fallback.on('close', (code) => {
        done({ exitCode: code == null ? 0 : code, spawnError: null });
      });
    });

    child.on('close', (code) => {
      done({ exitCode: code == null ? 0 : code, spawnError: null });
    });
  });
}

function quoteForCmd(text) {
  const value = String(text);
  if (value === '') return '""';
  if (!/[\s"]/g.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

function buildAutoTask(childArgv, exitCode) {
  const preview = formatCommandPreview(childArgv);
  if (exitCode === 0) return `完成: ${preview}`;
  return `失败(退出码 ${exitCode}): ${preview}`;
}

function formatCommandPreview(argv) {
  const parts = argv.map((p) => quoteIfNeeded(String(p)));
  const joined = parts.join(' ');
  if (joined.length <= 120) return joined;
  return joined.slice(0, 117) + '...';
}

function quoteIfNeeded(text) {
  if (text === '') return '""';
  if (!/[\s"]/g.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

function printResult(result) {
  if (result.skipped) {
    console.log(`已跳过提醒: ${result.reason}`);
    return;
  }
  for (const r of result.results) {
    const status = r.ok ? 'OK' : 'FAIL';
    console.log(`${status} ${r.channel}${r.error ? `: ${r.error}` : ''}`);
  }
}

module.exports = {
  runCli
};
