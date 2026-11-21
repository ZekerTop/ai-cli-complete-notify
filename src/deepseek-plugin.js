const fs = require('fs');
const path = require('path');
const { getDataDir } = require('./paths');

const PLUGIN_NAME = 'ai-cli-complete-notify-deepseek-plugin';
const MARKER = 'ai-cli-complete-notify:deepseek-plugin:v1';
const PACKAGE_MARKER = 'deepseek-plugin:v1';
const FILES = ['package.json', 'index.js', 'cordis.patch.yml'];

function createDeepseekRuntime({ send, getCwd, getGoal } = {}) {
  const sessions = new WeakMap();
  const pending = new Set();
  let disposed = false;

  function textOf(content) {
    return Array.isArray(content)
      ? content.filter((block) => block?.type === 'text' && typeof block.text === 'string').map((block) => block.text).join('')
      : '';
  }

  function onEvent(session, event) {
    if (disposed || !session || typeof session !== 'object' || !event || session.header?.origin === 'subagent') return;
    let state = sessions.get(session);
    if (!state) {
      state = { turn: null, queuedPrompt: '', queuedUser: false, queuedBackground: false };
      sessions.set(session, state);
    }
    const data = event.data || {};
    if (event.type === 'turn/start') {
      if (!Number.isInteger(data.turn) || data.turn < 1 || !Number.isFinite(event.time)) return;
      if (state.turn?.id === data.turn) return;
      state.turn = {
        id: data.turn,
        startedAt: event.time,
        prompt: state.queuedPrompt,
        hasUser: state.queuedUser,
        background: state.queuedBackground,
        assistant: '',
        ended: false,
      };
      state.queuedPrompt = '';
      state.queuedUser = false;
      state.queuedBackground = false;
      return;
    }
    if (event.type === 'user/message') {
      const kind = data.source?.kind;
      if (kind !== 'user' && kind !== 'goal' && kind !== 'schedule') return;
      const turn = state.turn && !state.turn.ended ? state.turn : null;
      if (kind === 'user') {
        const prompt = textOf(data.content);
        if (turn) {
          turn.hasUser = true;
          turn.prompt = [turn.prompt, prompt].filter(Boolean).join('\n\n');
        } else {
          state.queuedUser = true;
          state.queuedPrompt = [state.queuedPrompt, prompt].filter(Boolean).join('\n\n');
        }
      } else if (turn) turn.background = true;
      else state.queuedBackground = true;
      return;
    }
    const turn = state.turn;
    if (!turn || turn.ended || data.turn !== turn.id) return;
    if (event.type === 'assistant/message') {
      turn.assistant = textOf(data.message?.content);
      return;
    }
    if (event.type !== 'turn/end') return;
    turn.ended = true;
    if (data.reason?.kind !== 'completed' || !turn.hasUser || turn.background || !Number.isFinite(event.time)) return;
    let cwd = session.header?.cwd || '';
    try {
      cwd = getCwd?.(session) || cwd;
      const goal = getGoal?.(session);
      if (goal && ['active', 'paused'].includes(goal.phase)) return;
    } catch (_error) {
      return;
    }
    const payload = {
      hook_event_name: 'TurnEnd',
      session_id: String(session.id || session.header?.id || ''),
      turn_id: turn.id,
      cwd: String(cwd),
      started_at: turn.startedAt,
      completed_at: event.time,
      user_prompt: turn.prompt,
      last_assistant_message: turn.assistant,
      reason: 'completed',
    };
    if (!payload.session_id || payload.completed_at < payload.started_at) return;
    // Session observers must return immediately; failures never escape into the agent loop.
    const job = Promise.resolve().then(() => disposed ? false : send?.(payload)).catch(() => false);
    pending.add(job);
    void job.finally(() => pending.delete(job));
  }

  return {
    onEvent,
    onDispose(session) { sessions.delete(session); },
    async drain() { await Promise.allSettled([...pending]); },
    async dispose() {
      disposed = true;
      await Promise.allSettled([...pending]);
    },
  };
}

function createDeepseekTransport({ command, args, spawnProcess, env, timeoutMs = 120000 }) {
  const running = new Map();
  let disposed = false;
  return {
    send(payload) {
      if (disposed) return Promise.resolve(false);
      return new Promise((resolve) => {
        let child;
        let timer;
        let settled = false;
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (child) running.delete(child);
          resolve(ok);
        };
        try {
          child = spawnProcess(command, args, {
            stdio: ['pipe', 'ignore', 'ignore'],
            windowsHide: true,
            env,
          });
          running.set(child, finish);
          child.on('error', () => finish(false));
          child.on('close', (code) => finish(code === 0));
          child.stdin.on('error', () => {
            finish(false);
            try { child.kill('SIGKILL'); } catch (_error) { /* Already exited. */ }
          });
          timer = setTimeout(() => {
            try { child.kill('SIGKILL'); } catch (_error) { /* Already exited. */ }
            finish(false);
          }, timeoutMs);
          timer.unref?.();
          child.stdin.end(JSON.stringify(payload));
        } catch (_error) {
          try { child?.kill('SIGKILL'); } catch (_killError) { /* Already exited. */ }
          finish(false);
        }
      });
    },
    dispose() {
      disposed = true;
      for (const [child, finish] of running) {
        try { child.kill('SIGKILL'); } catch (_error) { /* Already exited. */ }
        finish(false);
      }
    },
  };
}

function commandFor(exePath) {
  if (typeof exePath !== 'string' || !exePath.trim()) throw new Error('DeepSeek plugin requires an executable path');
  const executable = path.resolve(exePath);
  const script = /\.(?:c|m)?js$/i.test(executable);
  return {
    command: script ? path.resolve(process.execPath) : executable,
    args: [...(script ? [executable] : []), 'notify', '--source', 'deepseek', '--from-hook'],
  };
}

function buildDeepseekPlugin(exePath) {
  const command = commandFor(exePath);
  return `// ${MARKER}
import { spawn } from 'node:child_process';
const createRuntime = ${createDeepseekRuntime.toString()};
const createTransport = ${createDeepseekTransport.toString()};
export const name = '${PLUGIN_NAME}';
export const inject = ['workingDirectory'];
export function apply(ctx) {
  const transport = createTransport({
    ...${JSON.stringify(command)},
    spawnProcess: spawn,
    env: { ...process.env, AI_CLI_COMPLETE_NOTIFY_DESKTOP_STDOUT: '0' },
  });
  const runtime = createRuntime({
    send: (payload) => transport.send(payload),
    getCwd: (session) => ctx.workingDirectory.get(session),
    getGoal: (session) => {
      const agent = ctx.get('agents')?.get(session.id);
      return agent ? ctx.get('goals')?.get(agent) : undefined;
    },
  });
  ctx.on('session/event', runtime.onEvent);
  ctx.on('session/disposed', runtime.onDispose);
  ctx.effect(() => () => {
    transport.dispose();
    return runtime.dispose();
  });
}
`;
}

function getPluginDir() {
  return path.join(getDataDir(), 'deepseek-plugin');
}

function quotePath(value) {
  return process.platform === 'win32' ? `"${value.replace(/"/g, '\\"')}"` : `'${value.replace(/'/g, "'\\''")}'`;
}

function installationInfo() {
  const pluginDir = getPluginDir();
  const installCommand = `dsh plugin --profile YOUR_PROFILE add ${quotePath(pluginDir)}`;
  const removeCommand = `dsh plugin --profile YOUR_PROFILE remove ${PLUGIN_NAME}`;
  return {
    settingsPath: path.join(pluginDir, 'index.js'),
    pluginDir,
    requiresManualInstall: true,
    installCommand,
    removeCommand,
    instructions: '此功能仅生成本地插件文件，生成后仍需在 Harness 安装。将 YOUR_PROFILE 替换为实际使用的 profile，执行安装命令后重新启动 Harness。本地安装会链接此目录，请保留生成目录直到从 Harness 卸载。Desktop 须先启动一次完成初始化，完全退出后使用 Desktop 内置的 dsh 安装到 desktop profile，再重新打开；不要用 npm 版 dsh 修改 Desktop profile。删除本地文件前，先用实际 Harness profile 执行 remove 命令移除已安装包、解除注册，再删除本地文件。',
  };
}

function isDirectorySafe(pluginDir) {
  try {
    const stat = fs.lstatSync(pluginDir);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch (error) {
    return error.code === 'ENOENT';
  }
}

function fileOwnership(pluginDir, file) {
  const filePath = path.join(pluginDir, file);
  try {
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) return 'foreign';
    const content = fs.readFileSync(filePath, 'utf8');
    if (file === 'package.json') {
      const pkg = JSON.parse(content);
      return pkg.name === PLUGIN_NAME && pkg.aiCliCompleteNotify === PACKAGE_MARKER ? 'owned' : 'foreign';
    }
    return content.startsWith(`${file === 'index.js' ? '//' : '#'} ${MARKER}\n`) ? 'owned' : 'foreign';
  } catch (error) {
    return error.code === 'ENOENT' ? 'missing' : 'foreign';
  }
}

function installDeepseekHook(exePath) {
  const info = installationInfo();
  try {
    const source = buildDeepseekPlugin(exePath);
    if (!isDirectorySafe(info.pluginDir) || FILES.some((file) => fileOwnership(info.pluginDir, file) === 'foreign')) {
      return { ok: false, ...info, error: 'DeepSeek plugin directory contains foreign or invalid files; nothing was overwritten' };
    }
    const pkg = {
      name: PLUGIN_NAME,
      version: '1.0.0',
      type: 'module',
      main: 'index.js',
      files: ['index.js', 'cordis.patch.yml'],
      aiCliCompleteNotify: PACKAGE_MARKER,
      dsh: { bundle: { patch: './cordis.patch.yml' } },
    };
    const contents = {
      'package.json': `${JSON.stringify(pkg, null, 2)}\n`,
      'index.js': source,
      'cordis.patch.yml': `# ${MARKER}\n- insert:\n    - id: ai-cli-complete-notify-deepseek\n      name: ${PLUGIN_NAME}\n`,
    };
    fs.mkdirSync(info.pluginDir, { recursive: true });
    for (const [file, content] of Object.entries(contents)) {
      const ownership = fileOwnership(info.pluginDir, file);
      if (ownership === 'foreign') throw new Error(`Foreign file preserved: ${file}`);
      fs.writeFileSync(path.join(info.pluginDir, file), content, { encoding: 'utf8', flag: ownership === 'missing' ? 'wx' : 'w' });
    }
    return { ok: true, ...info };
  } catch (error) {
    return { ok: false, ...info, error: error.message };
  }
}

function uninstallDeepseekHook() {
  const info = installationInfo();
  try {
    const desktop = require('./deepseek-desktop').getDeepseekBundleRegistrations();
    if (desktop.registered === true) return {
      ok: false, ...info, errorCode: 'deepseek_bundle_registered',
      error: 'Remove this plugin from the DeepSeek Harness Desktop profile before deleting its local files',
    };
    if (desktop.registered === null) return {
      ok: false, ...info, errorCode: 'deepseek_registration_unknown',
      error: 'Desktop registration could not be verified; check its profile before deleting the local plugin',
    };
  } catch (_error) {
    return {
      ok: false, ...info, errorCode: 'deepseek_registration_unknown',
      error: 'Desktop registration could not be verified; check its profile before deleting the local plugin',
    };
  }
  if (!isDirectorySafe(info.pluginDir)) return { ok: false, ...info, error: 'DeepSeek plugin directory is not a regular directory' };
  const foreign = [];
  try {
    for (const file of FILES) {
      const ownership = fileOwnership(info.pluginDir, file);
      if (ownership === 'owned') fs.unlinkSync(path.join(info.pluginDir, file));
      else if (ownership === 'foreign') foreign.push(file);
    }
    if (fs.existsSync(info.pluginDir) && fs.readdirSync(info.pluginDir).length === 0) fs.rmdirSync(info.pluginDir);
    return foreign.length
      ? { ok: false, ...info, error: `Foreign files preserved: ${foreign.join(', ')}` }
      : { ok: true, ...info };
  } catch (error) {
    return { ok: false, ...info, error: error.message };
  }
}

function getDeepseekHookStatus() {
  const info = installationInfo();
  return { ...info, installed: isDirectorySafe(info.pluginDir) && FILES.every((file) => fileOwnership(info.pluginDir, file) === 'owned') };
}

function getDeepseekConfigPreview() {
  const info = installationInfo();
  return `Desktop 建议用「一键挂载」。手动操作请先按 ⌘Q 退出，用内置 dsh 安装后重开。卸载后再删本地目录。\n\n手动安装（替换 YOUR_PROFILE）\n${info.installCommand}\n\n卸载\n${info.removeCommand}`;
}

module.exports = {
  installDeepseekHook,
  uninstallDeepseekHook,
  getDeepseekHookStatus,
  getDeepseekConfigPreview,
  buildDeepseekPlugin,
  createDeepseekRuntime,
  createDeepseekTransport,
};
