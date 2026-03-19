const { parseArgs } = require('./args');
const { loadConfig, saveConfig, getConfigPath } = require('./config');
const { markTaskStart, consumeTaskStart } = require('./state');
const { sendNotifications } = require('./engine');
const {
  PRODUCT_NAME,
  getDataDir,
  getStatePath,
  getWatchLogsDir,
  getWatchLogPath,
  getLatestWatchLogPath
} = require('./paths');
const { getClaudeHookNotificationContext } = require('./hook-context');
const { spawn } = require('child_process');
const path = require('path');

function toNumberOrNull(value) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function printHelp() {
  const invoke = getCliInvokeLabel();
  console.log(`${PRODUCT_NAME}

用法:
  ${invoke} start  --source claude  --task "..."
  ${invoke} stop   --source claude  --task "..." [--force]
  ${invoke} notify --source claude  --task "..." [--duration-minutes 12] [--force] [--from-hook]
  ${invoke} run    --source claude  -- <command> [args...]
  ${invoke} watch  [--sources all] [--interval-ms 1000] [--gemini-quiet-ms 3000] [--claude-quiet-ms 60000] [--quiet]
  ${invoke} paths
  ${invoke} hooks  status
  ${invoke} hooks  install   --target claude|gemini
  ${invoke} hooks  uninstall --target claude|gemini
  ${invoke} config

说明:
  - source 支持: claude / codex / gemini
  - 阈值提醒建议使用 start/stop（自动计算耗时）
  - 最省事的接入方式是 run：由 ${PRODUCT_NAME} 负责计时并在命令结束后提醒
  - 交互式/VSCode 插件场景建议使用 watch：自动监听本机日志并在每次回复完成后提醒
  - hooks：利用 Claude Code / Gemini CLI 的原生 hooks 机制实现即时通知

配置:
  - settings: ${getConfigPath()}
  - env: WEBHOOK_URLS, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, EMAIL_HOST/EMAIL_USER/EMAIL_PASS/EMAIL_FROM/EMAIL_TO
`);
}

function getCliInvokeLabel() {
  if (process.pkg) {
    return path.basename(process.execPath || 'ai-reminder.exe');
  }
  const scriptPath = process.argv[1] ? path.basename(process.argv[1]) : 'ai-reminder.js';
  return `node ${scriptPath}`;
}

function sleep(ms) {
  const delay = Number(ms);
  if (!Number.isFinite(delay) || delay <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delay));
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

  if (command === 'paths') {
    const payload = {
      dataDir: getDataDir(),
      settingsPath: getConfigPath(),
      statePath: getStatePath(),
      watchLogsDir: getWatchLogsDir(),
      activeWatchLogPath: getWatchLogPath(),
      latestWatchLogPath: getLatestWatchLogPath()
    };
    console.log(JSON.stringify(payload, null, 2));
    return { ok: true, mode: 'paths', result: payload };
  }

  if (command === 'hooks') {
    const { getHookStatus, installHook, uninstallHook, getHookConfigPreview } = require('./hooks');
    const subCommand = positional[1] || 'status';
    const target = flags.target || flags.t || '';

    if (subCommand === 'status') {
      const status = getHookStatus();
      console.log(JSON.stringify(status, null, 2));
      return { ok: true, mode: 'hooks', subCommand: 'status', result: status };
    }

    if (subCommand === 'install') {
      if (!target || (target !== 'claude' && target !== 'gemini')) {
        console.error('请指定 --target claude 或 --target gemini');
        return { ok: false, mode: 'hooks', error: 'Missing or invalid --target' };
      }
      const result = installHook(target);
      console.log(result.ok ? `已安装 ${target} hook → ${result.settingsPath}` : `安装失败: ${result.error}`);
      return { ok: result.ok, mode: 'hooks', subCommand: 'install', result };
    }

    if (subCommand === 'uninstall') {
      if (!target || (target !== 'claude' && target !== 'gemini')) {
        console.error('请指定 --target claude 或 --target gemini');
        return { ok: false, mode: 'hooks', error: 'Missing or invalid --target' };
      }
      const result = uninstallHook(target);
      console.log(result.ok ? `已卸载 ${target} hook` : `卸载失败: ${result.error}`);
      return { ok: result.ok, mode: 'hooks', subCommand: 'uninstall', result };
    }

    if (subCommand === 'preview') {
      const previewTarget = target || 'claude';
      const preview = getHookConfigPreview(previewTarget);
      console.log(preview);
      return { ok: true, mode: 'hooks', subCommand: 'preview' };
    }

    console.error(`未知 hooks 子命令: ${subCommand}`);
    return { ok: false, mode: 'hooks', error: `Unknown hooks sub-command: ${subCommand}` };
  }

  if (command === 'watch') {
    const sources = flags.sources || flags.source || flags.s || 'all';
    const intervalMs = toNumberOrNull(flags['interval-ms']) || 1000;
    const geminiQuietMs = toNumberOrNull(flags['gemini-quiet-ms']) || 3000;
    const claudeQuietMs = toNumberOrNull(flags['claude-quiet-ms']);
    const quiet = Boolean(flags.quiet);
    const config = loadConfig();
    const confirmAlert = () => {
      const latestConfig = loadConfig();
      return latestConfig && latestConfig.ui ? latestConfig.ui.confirmAlert : null;
    };
    const { createWatchLogWriter } = require('./watch-log');
    const logWriter = createWatchLogWriter(config && config.ui ? config.ui.watchLogRetentionDays : 7);
    const writeWatchLog = (line) => {
      logWriter.writeLine(line);
      if (!quiet) console.log(line);
    };

    const { startWatch } = require('./watch');
    const stop = startWatch({
      sources,
      intervalMs,
      geminiQuietMs,
      claudeQuietMs,
      confirmAlert,
      log: writeWatchLog
    });

    if (!quiet) {
      const claudeLabel = claudeQuietMs == null ? 'default' : claudeQuietMs;
      writeWatchLog(`watching sources=${String(sources)} intervalMs=${intervalMs} geminiQuietMs=${geminiQuietMs} claudeQuietMs=${claudeLabel}`);
    }

    const cleanup = () => {
      try {
        stop();
      } catch (_error) {
        // ignore
      }
      logWriter.close();
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
    const fromHook = Boolean(flags['from-hook']);
    const durationMinutes = toNumberOrNull(flags['duration-minutes']);
    const durationMs = durationMinutes != null ? durationMinutes * 60 * 1000 : toNumberOrNull(flags['duration-ms']);

    let hookContext = null;
    if (fromHook) {
      const { readStdinJson } = require('./hooks-stdin');
      hookContext = await readStdinJson();
    }

    const effectiveCwd = (hookContext && hookContext.cwd) || cwd;
    const effectiveTask = (hookContext && hookContext.task_info) || taskInfo;
    const hookNotificationContext =
      fromHook && source === 'claude'
        ? getClaudeHookNotificationContext(hookContext, effectiveTask)
        : null;

    if (hookNotificationContext && hookNotificationContext.skip) {
      const skipped = {
        skipped: true,
        reason: hookNotificationContext.reason || 'hook notification skipped',
        results: []
      };
      printResult(skipped);
      return { ok: true, mode: 'notify', result: skipped };
    }

    if (hookNotificationContext && hookNotificationContext.delayMs > 0) {
      await sleep(hookNotificationContext.delayMs);
    }

    const result = await sendNotifications({
      source,
      taskInfo: hookNotificationContext?.taskInfo || effectiveTask,
      durationMs,
      cwd: effectiveCwd,
      force: Boolean(flags.force),
      fromHook,
      outputContent: hookNotificationContext?.outputContent,
      summaryContext: hookNotificationContext?.summaryContext,
      skipSummary: Boolean(hookNotificationContext?.skipSummary),
      notifyKind: hookNotificationContext?.notifyKind,
    });
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
