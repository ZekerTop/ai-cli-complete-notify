const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const HOOK_MARKER = 'ai-cli-complete-notify';
const HOOK_MARKER_ALT = 'ai-reminder';
const HOOK_FLAG = '--from-hook';
const OPENCODE_PLUGIN_FILE = 'ai-cli-complete-notify.js';
const OPENCODE_PLUGIN_MARKER = `${HOOK_MARKER}:opencode-plugin`;
const HERDR_PLUGIN_REPO = '8liang/herdr-ai-notify';
const HERDR_PLUGIN_ID = '8liang.herdr-ai-notify';
const HERDR_CONFIG_ENV_FILE = 'config.env';

function getExePath() {
  try {
    const isPackaged = typeof process.pkg !== 'undefined'
      || (process.execPath && !process.execPath.includes('node') && !process.execPath.includes('electron'));
    if (isPackaged) return process.execPath;
  } catch (_error) {
    // ignore
  }

  const candidate = path.resolve(path.join(__dirname, '..', 'ai-reminder.js'));
  if (fs.existsSync(candidate)) return candidate;

  return process.argv[1] || process.execPath;
}

function shellQuote(value) {
  if (process.platform === 'win32') {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildNotifyCommand(exePath, source) {
  const quoted = shellQuote(exePath);
  const needsNode = exePath.endsWith('.js');
  const prefix = needsNode ? `node ${quoted}` : quoted;
  return `${prefix} notify --source ${source} --from-hook --force`;
}

function buildNotifyArgv(exePath, source) {
  const prefix = exePath.endsWith('.js') ? ['node', exePath] : [exePath];
  return [...prefix, 'notify', '--source', source, '--from-hook', '--force'];
}

function getClaudeSettingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function getGeminiSettingsPath() {
  return path.join(os.homedir(), '.gemini', 'settings.json');
}

function getOpenCodeConfigDir() {
  const override = String(process.env.OPENCODE_CONFIG_DIR || '').trim();
  if (override) return path.resolve(override);
  return path.join(os.homedir(), '.config', 'opencode');
}

function getOpenCodePluginPath() {
  return path.join(getOpenCodeConfigDir(), 'plugins', OPENCODE_PLUGIN_FILE);
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
}

function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function isOurHookCommand(command) {
  return typeof command === 'string'
    && command.includes(HOOK_FLAG)
    && (command.includes(HOOK_MARKER) || command.includes(HOOK_MARKER_ALT));
}

function normalizeHookCommand(hook) {
  if (!hook || typeof hook !== 'object') return null;
  if (typeof hook.command !== 'string') return null;
  return {
    type: hook.type || 'command',
    command: hook.command
  };
}

function convertLegacyClaudeHooks(legacyHooks) {
  const grouped = {};
  for (const hook of legacyHooks) {
    if (!hook || typeof hook !== 'object' || typeof hook.event !== 'string') continue;
    const normalized = normalizeHookCommand(hook);
    if (!normalized) continue;
    if (!Array.isArray(grouped[hook.event])) {
      grouped[hook.event] = [];
    }
    grouped[hook.event].push({ hooks: [normalized] });
  }
  return grouped;
}

function ensureClaudeHooksObject(settings) {
  if (!settings.hooks || typeof settings.hooks !== 'object') {
    settings.hooks = {};
    return settings.hooks;
  }

  if (Array.isArray(settings.hooks)) {
    settings.hooks = convertLegacyClaudeHooks(settings.hooks);
  }

  return settings.hooks;
}

function extractHookCommands(block) {
  if (!block || typeof block !== 'object' || !Array.isArray(block.hooks)) return [];
  return block.hooks.filter((hook) => hook && typeof hook.command === 'string');
}

function isOurClaudeHook(hook) {
  if (!hook || typeof hook !== 'object') return false;
  if (typeof hook.command !== 'string') return false;
  return isOurHookCommand(hook.command);
}

function buildClaudeHooks(exePath) {
  const cmd = buildNotifyCommand(exePath, 'claude');
  return {
    Stop: [
      {
        hooks: [
          { type: 'command', command: cmd }
        ]
      }
    ]
  };
}

function installClaudeHook(exePath) {
  const settingsPath = getClaudeSettingsPath();
  const settings = readJsonFile(settingsPath);
  const hooks = ensureClaudeHooksObject(settings);
  const desiredHooks = buildClaudeHooks(exePath);

  for (const [eventName, blocks] of Object.entries(hooks)) {
    if (!Array.isArray(blocks)) continue;
    const nextBlocks = blocks
      .map((block) => {
        if (!block || typeof block !== 'object' || !Array.isArray(block.hooks)) return block;
        const remainingHooks = block.hooks.filter((hook) => !isOurHookCommand(hook && hook.command));
        if (remainingHooks.length === 0) return null;
        return { ...block, hooks: remainingHooks };
      })
      .filter(Boolean);

    if (nextBlocks.length > 0) {
      hooks[eventName] = nextBlocks;
    } else {
      delete hooks[eventName];
    }
  }

  for (const eventName of Object.keys(desiredHooks)) {
    const existingBlocks = Array.isArray(hooks[eventName]) ? hooks[eventName] : [];
    hooks[eventName] = [...existingBlocks, ...desiredHooks[eventName]];
  }

  writeJsonFile(settingsPath, settings);
  return { ok: true, settingsPath };
}

function uninstallClaudeHook() {
  const settingsPath = getClaudeSettingsPath();
  const settings = readJsonFile(settingsPath);

  if (Array.isArray(settings.hooks)) {
    settings.hooks = settings.hooks.filter((hook) => !isOurClaudeHook(hook));
    if (settings.hooks.length === 0) {
      delete settings.hooks;
    }
    writeJsonFile(settingsPath, settings);
    return { ok: true, settingsPath };
  }

  if (!settings.hooks || typeof settings.hooks !== 'object') return { ok: true, settingsPath };

  for (const [eventName, blocks] of Object.entries(settings.hooks)) {
    if (!Array.isArray(blocks)) continue;
    const nextBlocks = blocks
      .map((block) => {
        if (!block || typeof block !== 'object' || !Array.isArray(block.hooks)) return block;
        const remainingHooks = block.hooks.filter((hook) => !isOurHookCommand(hook && hook.command));
        if (remainingHooks.length === 0) return null;
        return { ...block, hooks: remainingHooks };
      })
      .filter(Boolean);

    if (nextBlocks.length > 0) {
      settings.hooks[eventName] = nextBlocks;
    } else {
      delete settings.hooks[eventName];
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeJsonFile(settingsPath, settings);
  return { ok: true, settingsPath };
}

function getClaudeHookStatus() {
  const settingsPath = getClaudeSettingsPath();
  const settings = readJsonFile(settingsPath);
  let installed = false;

  if (Array.isArray(settings.hooks)) {
    installed = settings.hooks.some((hook) => isOurClaudeHook(hook));
  } else if (settings.hooks && typeof settings.hooks === 'object') {
    installed = Object.values(settings.hooks).some((blocks) =>
      Array.isArray(blocks) && blocks.some((block) =>
        extractHookCommands(block).some((hook) => isOurHookCommand(hook.command))
      )
    );
  }

  return { installed, settingsPath };
}

function isOurGeminiHook(hook) {
  if (!hook || typeof hook !== 'object') return false;
  if (typeof hook.command !== 'string') return false;
  return isOurHookCommand(hook.command);
}

function buildGeminiHooks(exePath) {
  const cmd = buildNotifyCommand(exePath, 'gemini');
  return [
    {
      hooks: [
        { type: 'command', command: cmd }
      ]
    }
  ];
}

function removeOurGeminiHooks(definitions) {
  return definitions
    .map((definition) => {
      if (isOurGeminiHook(definition)) return null;
      if (!definition || typeof definition !== 'object' || !Array.isArray(definition.hooks)) {
        return definition;
      }

      const hasOurHook = definition.hooks.some((hook) => isOurGeminiHook(hook));
      if (!hasOurHook) return definition;

      const remainingHooks = definition.hooks.filter((hook) => !isOurGeminiHook(hook));
      if (remainingHooks.length === 0) return null;
      return { ...definition, hooks: remainingHooks };
    })
    .filter(Boolean);
}

function installGeminiHook(exePath) {
  const settingsPath = getGeminiSettingsPath();
  const settings = readJsonFile(settingsPath);

  if (!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }

  if (!Array.isArray(settings.hooks.AfterAgent)) {
    settings.hooks.AfterAgent = [];
  }

  const existingHooks = removeOurGeminiHooks(settings.hooks.AfterAgent);
  settings.hooks.AfterAgent = [...existingHooks, ...buildGeminiHooks(exePath)];

  writeJsonFile(settingsPath, settings);
  return { ok: true, settingsPath };
}

function uninstallGeminiHook() {
  const settingsPath = getGeminiSettingsPath();
  const settings = readJsonFile(settingsPath);

  if (!settings.hooks || typeof settings.hooks !== 'object') return { ok: true, settingsPath };

  if (Array.isArray(settings.hooks.AfterAgent)) {
    settings.hooks.AfterAgent = removeOurGeminiHooks(settings.hooks.AfterAgent);
    if (settings.hooks.AfterAgent.length === 0) {
      delete settings.hooks.AfterAgent;
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeJsonFile(settingsPath, settings);
  return { ok: true, settingsPath };
}

function getGeminiHookStatus() {
  const settingsPath = getGeminiSettingsPath();
  const settings = readJsonFile(settingsPath);
  const hooks = settings.hooks && typeof settings.hooks === 'object' ? settings.hooks : {};
  const list = Array.isArray(hooks.AfterAgent) ? hooks.AfterAgent : [];
  const installed = list.some((definition) =>
    extractHookCommands(definition).some((hook) => isOurGeminiHook(hook))
  );
  return { installed, settingsPath };
}

function buildOpenCodePlugin(exePath) {
  const notifyArgv = buildNotifyArgv(exePath, 'opencode');
  return `// ${OPENCODE_PLUGIN_MARKER}
const NOTIFY_CMD = ${JSON.stringify(notifyArgv, null, 2)};
const DEDUPE_MS = 1500;

let lastEventKey = '';
let lastEventAt = 0;

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function getEventType(event) {
  return firstString(event && event.type);
}

function getSessionId(event) {
  const props = event && typeof event.properties === 'object' ? event.properties : {};
  return firstString(
    event && event.sessionID,
    event && event.sessionId,
    props.sessionID,
    props.sessionId,
    props.id,
  );
}

function getErrorMessage(event) {
  const props = event && typeof event.properties === 'object' ? event.properties : {};
  const directError = event && typeof event.error === 'object' ? event.error : {};
  const propError = props && typeof props.error === 'object' ? props.error : {};
  return firstString(
    directError && directError.message,
    propError && propError.message,
    props.message,
    event && event.message,
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\\r\\n/g, '\\n').trim() : '';
}

function appendText(parts, value) {
  const text = normalizeText(value);
  if (text) parts.push(text);
}

function isVisibleTextPart(part) {
  if (!part || typeof part !== 'object') return false;
  const type = firstString(part.type, part.kind).toLowerCase();
  if (!type) return true;
  if (type !== 'text') return false;
  return part.ignored !== true;
}

function appendMessageParts(parts, messageParts) {
  if (!Array.isArray(messageParts)) return;
  for (const part of messageParts) {
    if (!isVisibleTextPart(part)) continue;
    appendText(parts, part.text);
    appendText(parts, part.content);
    appendText(parts, part.value);
  }
}

function extractMessageText(entry) {
  const parts = [];
  const entryParts = Array.isArray(entry && entry.parts) ? entry.parts : null;
  appendMessageParts(parts, entryParts);

  const message = entry && typeof entry.message === 'object' ? entry.message : null;
  const messageParts = message && Array.isArray(message.parts) ? message.parts : null;
  if (message) {
    appendMessageParts(parts, messageParts);
  }

  const hasStructuredParts = Boolean(entryParts || messageParts);
  if (!hasStructuredParts) {
    if (message) {
      appendText(parts, message.text);
      appendText(parts, message.content);
    }
    appendText(parts, entry && entry.text);
    appendText(parts, entry && entry.content);
    appendText(parts, typeof (entry && entry.message) === 'string' ? entry.message : '');
  }

  return parts.join('\\n\\n').trim();
}

function isAssistantMessage(entry) {
  const info = entry && typeof entry.info === 'object' ? entry.info : {};
  const role = firstString(info.role, entry && entry.role).toLowerCase();
  const kind = firstString(info.type, entry && entry.type).toLowerCase();
  return role === 'assistant' || kind === 'assistant';
}

function toMessageList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result && result.data)) return result.data;
  if (Array.isArray(result && result.messages)) return result.messages;
  if (result && Array.isArray(result.data && result.data.messages)) return result.data.messages;
  return [];
}

async function fetchLatestAssistantText(client, sessionId) {
  if (!client || !client.session || typeof client.session.messages !== 'function' || !sessionId) {
    return '';
  }

  for (const waitMs of [0, 150, 500]) {
    if (waitMs > 0) {
      await delay(waitMs);
    }

    try {
      const result = await client.session.messages({ path: { id: sessionId } });
      const messages = toMessageList(result);
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const entry = messages[index];
        if (!isAssistantMessage(entry)) continue;
        const text = extractMessageText(entry);
        if (text) return text;
      }
    } catch (_error) {
      // ignore
    }
  }

  return '';
}

async function buildPayload(event, context, client) {
  const eventType = getEventType(event);
  const errorMessage = getErrorMessage(event);
  const sessionId = getSessionId(event);
  const assistantText = eventType === 'session.idle' || isSessionIdleStatus(event)
    ? await fetchLatestAssistantText(client, sessionId)
    : '';
  return {
    hook_source: 'opencode-plugin',
    hook_event_name: eventType,
    cwd: firstString(
      event && event.cwd,
      event && event.directory,
      context.worktree,
      context.directory,
    ),
    task_info: eventType === 'session.error'
      ? (errorMessage ? \`OpenCode 失败: \${errorMessage}\` : 'OpenCode 失败')
      : truncateAssistantText(assistantText, 40) || 'OpenCode 完成',
    session_id: sessionId,
    error_message: errorMessage,
    project_name: firstString(context.project && context.project.name),
    assistant_message: assistantText,
    output_content: eventType === 'session.error' ? errorMessage : assistantText,
  };
}

function isSessionIdleStatus(event) {
  if (getEventType(event) !== 'session.status') return false;
  const props = event && typeof event.properties === 'object' ? event.properties : {};
  const status = props.status;
  return status && typeof status === 'object' && status.type === 'idle';
}

function truncateAssistantText(text, maxWords) {
  const value = normalizeText(text);
  if (!value) return '';
  const words = value.split(/\\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return \`\${words.slice(0, maxWords).join(' ')}...\`;
}

function isCompletionEvent(event) {
  const type = getEventType(event);
  if (type === 'session.idle') return true;
  if (type === 'session.error') return true;
  return isSessionIdleStatus(event);
}

function shouldSkip(payload) {
  const key = [payload.hook_event_name, payload.session_id, payload.error_message].join('::');
  const now = Date.now();
  if (key && key === lastEventKey && now - lastEventAt < DEDUPE_MS) {
    return true;
  }
  lastEventKey = key;
  lastEventAt = now;
  return false;
}

async function dispatchPayload(payload) {
  const payloadJson = JSON.stringify(payload);
  try {
    Bun.spawn({
      cmd: NOTIFY_CMD,
      cwd: payload.cwd || undefined,
      env: {
        ...process.env,
        DESKTOP_NOTIFY_MODE: process.platform === 'win32' ? 'popup' : String(process.env.DESKTOP_NOTIFY_MODE || ''),
      },
      stdin: new TextEncoder().encode(payloadJson),
      stdout: 'ignore',
      stderr: 'ignore',
    });
  } catch (_error) {
    // ignore
  }
}

export const AiCliCompleteNotifyPlugin = async ({ client, project, directory, worktree }) => {
  return {
    event: async ({ event }) => {
      if (!isCompletionEvent(event)) return;

      const payload = await buildPayload(event, { project, directory, worktree }, client);
      if (shouldSkip(payload)) return;
      await dispatchPayload(payload);
    },
  };
};
`;
}

function isOurOpenCodePlugin() {
  const pluginPath = getOpenCodePluginPath();
  try {
    if (!fs.existsSync(pluginPath)) return false;
    const content = fs.readFileSync(pluginPath, 'utf8');
    return content.includes(OPENCODE_PLUGIN_MARKER);
  } catch (_error) {
    return false;
  }
}

function installOpenCodeHook(exePath) {
  const pluginPath = getOpenCodePluginPath();
  const pluginDir = path.dirname(pluginPath);
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
  }
  fs.writeFileSync(pluginPath, buildOpenCodePlugin(exePath), 'utf8');
  return { ok: true, settingsPath: pluginPath };
}

function uninstallOpenCodeHook() {
  const pluginPath = getOpenCodePluginPath();
  try {
    if (fs.existsSync(pluginPath)) {
      const content = fs.readFileSync(pluginPath, 'utf8');
      if (content.includes(OPENCODE_PLUGIN_MARKER)) {
        fs.unlinkSync(pluginPath);
      }
    }
  } catch (_error) {
    return { ok: false, error: 'Failed to remove OpenCode plugin', settingsPath: pluginPath };
  }
  return { ok: true, settingsPath: pluginPath };
}

function getOpenCodeHookStatus() {
  const settingsPath = getOpenCodePluginPath();
  return {
    installed: isOurOpenCodePlugin(),
    settingsPath
  };
}

// ---------------------------------------------------------------------------
// Herdr plugin mode
// ---------------------------------------------------------------------------

function getHerdrBin() {
  const override = String(process.env.HERDR_BIN_PATH || '').trim();
  if (override) return override;

  if (process.platform === 'win32') {
    // herdr.exe may be available via PATH on Windows
    return 'herdr.exe';
  }
  if (process.platform === 'darwin') {
    // Finder-launched apps do not inherit the terminal's PATH.
    const directories = [
      ...(process.env.PATH || '').split(path.delimiter).filter(Boolean),
      path.join(os.homedir(), '.local', 'bin'),
      '/opt/homebrew/bin',
      '/usr/local/bin',
    ];
    for (const directory of directories) {
      const candidate = path.join(directory, 'herdr');
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch (_error) {
        // Try the next install location.
      }
    }
  }
  return 'herdr';
}

function runHerdrCommand(args, options = {}) {
  const bin = getHerdrBin();
  try {
    const result = spawnSync(bin, args, {
      encoding: 'utf8',
      env: { ...process.env },
      timeout: options.timeout || 60000,
      windowsHide: true,
    });
    if (result.error) {
      return {
        ok: false,
        error: result.error && result.error.message
          ? `Failed to run \`${bin}\`: ${result.error.message}`
          : `Failed to run \`${bin}\``,
        status: result.status,
        errorCode: result.error.code === 'ETIMEDOUT' ? 'timeout' : result.error.code === 'ENOENT' ? 'not_found' : 'command_failed',
        stdout: String(result.stdout || ''),
        stderr: String(result.stderr || ''),
      };
    }
    let errorCode = 'command_failed';
    try {
      const response = JSON.parse(result.stdout || result.stderr || '{}');
      if (response.error?.code === 'server_not_running') errorCode = 'server_not_running';
    } catch (_error) { /* Plain-text CLI output has no structured error code. */ }
    return {
      errorCode: result.status === 0 ? null : errorCode,
      ok: result.status === 0,
      status: result.status,
      stdout: String(result.stdout || ''),
      stderr: String(result.stderr || ''),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to run \`${bin}\`: ${error && error.message ? error.message : String(error)}`,
      stdout: '',
      stderr: '',
    };
  }
}

function getHerdrPluginDir() {
  const base = process.env.HERDR_CONFIG_DIR
    ? path.join(String(process.env.HERDR_CONFIG_DIR).trim(), 'plugins', 'config')
    : path.join(os.homedir(), '.config', 'herdr', 'plugins', 'config');
  return path.join(base, HERDR_PLUGIN_ID);
}

function buildHerdrConfigEnv(bridgePath, previous = '') {
  if (/[\r\n\0]/.test(bridgePath)) throw new Error('Invalid bridge path');
  // Herdr sources this file with Bash, including on Windows.
  const assignment = `AI_REMINDER_PATH='${bridgePath.replace(/'/g, "'\\''")}'`;
  const pattern = /^[ \t]*(?:export[ \t]+)?AI_REMINDER_PATH[ \t]*=.*$/gm;
  if (pattern.test(previous)) return previous.replace(pattern, () => assignment);
  return previous + (previous && !previous.endsWith('\n') ? '\n' : '') + assignment + '\n';
}

function buildHerdrBridge(exePath) {
  const quote = (value) => `'${value.replace(/'/g, "'\\''")}'`;
  const command = exePath.endsWith('.js')
    ? `${quote(process.execPath)} ${quote(exePath)}` : quote(exePath);
  return '#!/bin/sh\nset -eu\nunset AI_CLI_COMPLETE_NOTIFY_DESKTOP_STDOUT\n'
    + (process.env.AI_CLI_COMPLETE_NOTIFY_PACKAGED === '1' ? 'export AI_CLI_COMPLETE_NOTIFY_PACKAGED=1\n' : '')
    + `exec ${command} "$@"\n`;
}

function parseHerdrPluginList(raw) {
  // `herdr plugin list --json` returns {"id":"cli:plugin","result":{"plugins":[...]}}
  try {
    const parsed = JSON.parse(raw);
    const payload = parsed && parsed.result && typeof parsed.result === 'object'
      ? parsed.result
      : parsed;
    if (!Array.isArray(payload && payload.plugins)) throw new Error('Invalid Herdr plugin list');
    const plugins = payload.plugins;
    return plugins.find((plugin) => plugin && plugin.plugin_id === HERDR_PLUGIN_ID) || null;
  } catch (_error) {
    throw new Error('Invalid Herdr plugin list');
  }
}

function getHerdrHookStatus() {
  const bin = getHerdrBin();
  const run = runHerdrCommand(['plugin', 'list', '--json'], { timeout: 5000 });
  let installed = false;
  let enabled = false;
  let plugin = null;

  if (run.ok) {
    try {
      plugin = parseHerdrPluginList(run.stdout);
    } catch (error) {
      run.ok = false;
      run.error = error.message;
    }
    if (plugin) {
      installed = true;
      enabled = Boolean(plugin.enabled);
    }
  }

  let configured = false;
  let settingsPath = path.join(getHerdrPluginDir(), HERDR_CONFIG_ENV_FILE);
  if (installed) {
    const configDir = runHerdrCommand(['plugin', 'config-dir', HERDR_PLUGIN_ID], { timeout: 5000 });
    const resolved = String(configDir.stdout || '').replace(/\r?\n$/, '');
    if (configDir.ok && path.isAbsolute(resolved)) {
      settingsPath = path.join(resolved, HERDR_CONFIG_ENV_FILE);
      try {
        const bridgePath = path.join(resolved, 'ai-cli-complete-notify-bridge');
        const env = fs.readFileSync(settingsPath, 'utf8');
        configured = env === buildHerdrConfigEnv(bridgePath, env)
          && fs.readFileSync(bridgePath, 'utf8') === buildHerdrBridge(getExePath());
      } catch (_error) {
        configured = false;
      }
    }
  }

  return {
    installed,
    enabled,
    configured,
    herdrBin: bin,
    dependencies: Object.fromEntries(['bash', 'python3'].map((name) => {
      const check = spawnSync(name, ['--version'], { timeout: 5000, encoding: 'utf8', windowsHide: true });
      return [name, check.status === 0];
    })),
    available: run.ok,
    error: run.ok ? null : (run.error || `Herdr status failed (${run.status})`),
    settingsPath,
    plugin,
  };
}

function installHerdrHook(exePath) {
  const bin = getHerdrBin();

  // Reconnecting an installed plugin must not depend on a fresh GitHub download.
  const before = runHerdrCommand(['plugin', 'list', '--json'], { timeout: 5000 });
  let existing = null;
  try {
    if (before.ok) existing = parseHerdrPluginList(before.stdout);
  } catch (_error) { /* Unknown status still allows an explicit installation attempt. */ }
  const installResult = existing
    ? { ok: true }
    : runHerdrCommand(['plugin', 'install', HERDR_PLUGIN_REPO, '--yes']);
  if (!installResult.ok) {
    const detail = installResult.stderr || installResult.stdout || installResult.error || '';
    return {
      ok: false,
      error: `herdr plugin install failed: ${String(detail).trim()}`,
      herdrBin: bin,
      step: 'install',
      errorCode: installResult.errorCode,
    };
  }

  // 2. Resolve the plugin config directory and write config.env with the
  //    detected ai-reminder path so notify.sh knows where to find us.
  const configDirResult = runHerdrCommand(['plugin', 'config-dir', HERDR_PLUGIN_ID]);
  const resolved = String(configDirResult.stdout || '').replace(/\r?\n$/, '');
  if (!configDirResult.ok || !path.isAbsolute(resolved)) {
    return { ok: false, error: 'Herdr did not return an absolute config directory', step: 'config' };
  }
  const configPath = path.join(resolved, HERDR_CONFIG_ENV_FILE);
  const bridgePath = path.join(resolved, 'ai-cli-complete-notify-bridge');
  try {
    fs.mkdirSync(resolved, { recursive: true });
    const previous = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
    const next = buildHerdrConfigEnv(bridgePath, previous);
    fs.writeFileSync(bridgePath, buildHerdrBridge(exePath), { mode: 0o700 });
    fs.chmodSync(bridgePath, 0o700);
    fs.writeFileSync(configPath, next, { mode: 0o600 });
  } catch (error) {
    return {
      ok: false,
      error: `Failed to write herdr plugin config: ${error && error.message ? error.message : String(error)}`,
      herdrBin: bin,
      step: 'config',
    };
  }

  // Plugin delivery is separate from sources.herdr.enabled; configuration never changes that switch.
  const listResult = runHerdrCommand(['plugin', 'list', '--json'], { timeout: 5000 });
  let alreadyEnabled = false;
  try {
    alreadyEnabled = listResult.ok && parseHerdrPluginList(listResult.stdout)?.enabled === true;
  } catch (_error) { /* Fall back to explicit activation if status cannot be read. */ }
  const enableResult = alreadyEnabled
    ? { ok: true }
    : runHerdrCommand(['plugin', 'enable', HERDR_PLUGIN_ID]);
  if (!enableResult.ok) {
    const detail = enableResult.stderr || enableResult.stdout || enableResult.error || '';
    return {
      ok: false,
      error: `herdr plugin enable failed: ${String(detail).trim()}`,
      herdrBin: bin,
      settingsPath: configPath,
      step: 'enable',
      errorCode: enableResult.errorCode,
    };
  }

  return {
    ok: true,
    herdrBin: bin,
    settingsPath: configPath,
    pluginId: HERDR_PLUGIN_ID,
    pluginRepo: HERDR_PLUGIN_REPO,
  };
}

function uninstallHerdrHook() {
  const bin = getHerdrBin();
  const uninstallResult = runHerdrCommand(['plugin', 'uninstall', HERDR_PLUGIN_REPO]);
  if (!uninstallResult.ok) {
    const detail = uninstallResult.stderr || uninstallResult.stdout || uninstallResult.error || '';
    return {
      ok: false,
      error: `herdr plugin uninstall failed: ${String(detail).trim()}`,
      herdrBin: bin,
    };
  }

  return {
    ok: true,
    herdrBin: bin,
    pluginId: HERDR_PLUGIN_ID,
    pluginRepo: HERDR_PLUGIN_REPO,
  };
}

function getHerdrConfigPreview(exePath) {
  const bin = getHerdrBin();
  const configPath = path.join(getHerdrPluginDir(), HERDR_CONFIG_ENV_FILE);
  const lines = [];
  lines.push(`# Herdr plugin integration preview`);
  lines.push(`# plugin repo : ${HERDR_PLUGIN_REPO}`);
  lines.push(`# plugin id   : ${HERDR_PLUGIN_ID}`);
  lines.push(`# herdr binary: ${bin}`);
  lines.push(`# config path : ${configPath}`);
  lines.push('');
  lines.push('# Commands that will be run on install:');
  lines.push(`#   ${bin} plugin install ${HERDR_PLUGIN_REPO} --yes`);
  lines.push(`#   ${bin} plugin config-dir ${HERDR_PLUGIN_ID}`);
  lines.push(`#   ${bin} plugin enable ${HERDR_PLUGIN_ID}`);
  lines.push('');
  lines.push('# config.env that will be written:');
  lines.push(buildHerdrConfigEnv(path.join(getHerdrPluginDir(), 'ai-cli-complete-notify-bridge')));
  lines.push('# Bridge uses the current runtime; Herdr notifications must be enabled separately.');
  lines.push(buildHerdrBridge(exePath));
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// ZCode hook mode (user-level ~/.zcode/cli/config.json)
// ---------------------------------------------------------------------------

function getZcodeConfigDir() {
  const override = String(process.env.ZCODE_CONFIG_DIR || '').trim();
  if (override) return path.resolve(override);
  return path.join(os.homedir(), '.zcode', 'cli');
}

function getZcodeConfigPath() {
  return path.join(getZcodeConfigDir(), 'config.json');
}

function buildZcodeProcessHook(exePath) {
  const args = ['notify', '--source', 'zcode', '--from-hook'];
  // ZCode runs process hooks as a raw argv vector without a shell, which is
  // the reliable shape on Windows. Resolve node explicitly so PATH is not a factor.
  if (exePath.endsWith('.js')) {
    return { type: 'process', command: process.execPath, args: [exePath, ...args] };
  }
  return { type: 'process', command: exePath, args };
}

function isOurZcodeHook(hook) {
  if (!hook || typeof hook !== 'object') return false;
  if (typeof hook.command === 'string'
    && isOurHookCommand(hook.command)
    && hook.command.includes('--source zcode')) return true;
  if (hook.type !== 'process' || !Array.isArray(hook.args)) return false;
  const sourceIndex = hook.args.indexOf('--source');
  return hook.args.includes(HOOK_FLAG) && sourceIndex !== -1 && hook.args[sourceIndex + 1] === 'zcode';
}

function removeOurZcodeStopEntries(entries) {
  return entries
    .map((block) => {
      if (!block || typeof block !== 'object' || !Array.isArray(block.hooks)) return block;
      const remainingHooks = block.hooks.filter((hook) => !isOurZcodeHook(hook));
      if (remainingHooks.length === block.hooks.length) return block;
      if (remainingHooks.length === 0) return null;
      return { ...block, hooks: remainingHooks };
    })
    .filter(Boolean);
}

function readZcodeConfig(configPath) {
  // Unlike the Claude/Gemini installers, a failed parse must never clobber the
  // user's entire ZCode CLI configuration with a fresh object.
  try {
    if (!fs.existsSync(configPath)) return { ok: true, config: {} };
    const raw = fs.readFileSync(configPath, 'utf8').trim();
    if (!raw) return { ok: true, config: {} };
    const config = JSON.parse(raw);
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return { ok: false, error: `ZCode config is not a JSON object: ${configPath}` };
    }
    return { ok: true, config };
  } catch (_error) {
    return { ok: false, error: `ZCode config is not valid JSON: ${configPath}` };
  }
}

function installZcodeHook(exePath) {
  const configPath = getZcodeConfigPath();
  const parsed = readZcodeConfig(configPath);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const config = parsed.config;

  if (!config.hooks || typeof config.hooks !== 'object' || Array.isArray(config.hooks)) {
    config.hooks = {};
  }
  // ZCode runs configuration-file hooks only when the runner is explicitly
  // enabled, so a hook entry alone would never fire.
  config.hooks.enabled = true;

  if (!config.hooks.events || typeof config.hooks.events !== 'object' || Array.isArray(config.hooks.events)) {
    config.hooks.events = {};
  }

  for (const event of ['UserPromptSubmit', 'Stop']) {
    const existingEntries = Array.isArray(config.hooks.events[event])
      ? removeOurZcodeStopEntries(config.hooks.events[event]) : [];
    config.hooks.events[event] = [...existingEntries, { hooks: [buildZcodeProcessHook(exePath)] }];
  }

  writeJsonFile(configPath, config);
  return { ok: true, settingsPath: configPath };
}

function uninstallZcodeHook() {
  const configPath = getZcodeConfigPath();
  const config = readJsonFile(configPath);
  const hooks = config.hooks && typeof config.hooks === 'object' && !Array.isArray(config.hooks)
    ? config.hooks
    : null;
  if (hooks?.events && typeof hooks.events === 'object' && !Array.isArray(hooks.events)) {
    for (const event of ['UserPromptSubmit', 'Stop']) {
      if (!Array.isArray(hooks.events[event])) continue;
      const remaining = removeOurZcodeStopEntries(hooks.events[event]);
      if (remaining.length) hooks.events[event] = remaining;
      else delete hooks.events[event];
    }
    if (Object.keys(hooks.events).length === 0) delete hooks.events;
    writeJsonFile(configPath, config);
  }

  return { ok: true, settingsPath: configPath };
}

function getZcodeHookStatus() {
  const settingsPath = getZcodeConfigPath();
  const config = readJsonFile(settingsPath);
  const hooks = config.hooks && typeof config.hooks === 'object' && !Array.isArray(config.hooks)
    ? config.hooks
    : {};
  const events = hooks.events && typeof hooks.events === 'object' && !Array.isArray(hooks.events)
    ? hooks.events
    : {};
  const installed = ['UserPromptSubmit', 'Stop'].every((event) =>
    Array.isArray(events[event]) && events[event].some((block) =>
      Array.isArray(block?.hooks) && block.hooks.some(isOurZcodeHook))
  );

  return { installed, hooksEnabled: hooks.enabled === true, settingsPath };
}

function getZcodeConfigPreview(exePath) {
  return JSON.stringify({
    hooks: {
      enabled: true,
      events: {
        UserPromptSubmit: [{ hooks: [buildZcodeProcessHook(exePath)] }],
        Stop: [{ hooks: [buildZcodeProcessHook(exePath)] }]
      }
    }
  }, null, 2);
}

function getHookStatus(target) {
  if (target === 'herdr') return { herdr: getHerdrHookStatus() };
  return {
    claude: getClaudeHookStatus(),
    gemini: getGeminiHookStatus(),
    opencode: getOpenCodeHookStatus(),
    zcode: getZcodeHookStatus(),
    herdr: { supported: true }
  };
}

function installHook(target) {
  const exePath = getExePath();
  if (target === 'claude') return installClaudeHook(exePath);
  if (target === 'gemini') return installGeminiHook(exePath);
  if (target === 'opencode') return installOpenCodeHook(exePath);
  if (target === 'herdr') return installHerdrHook(exePath);
  if (target === 'zcode') return installZcodeHook(exePath);
  return { ok: false, error: `Unknown target: ${target}` };
}

function uninstallHook(target) {
  if (target === 'claude') return uninstallClaudeHook();
  if (target === 'gemini') return uninstallGeminiHook();
  if (target === 'opencode') return uninstallOpenCodeHook();
  if (target === 'herdr') return uninstallHerdrHook();
  if (target === 'zcode') return uninstallZcodeHook();
  return { ok: false, error: `Unknown target: ${target}` };
}

function getHookConfigPreview(target) {
  const exePath = getExePath();
  if (target === 'claude') {
    const hooks = buildClaudeHooks(exePath);
    return JSON.stringify({ hooks }, null, 2);
  }
  if (target === 'gemini') {
    const hooks = { AfterAgent: buildGeminiHooks(exePath) };
    return JSON.stringify({ hooks }, null, 2);
  }
  if (target === 'opencode') {
    return buildOpenCodePlugin(exePath);
  }
  if (target === 'herdr') {
    return getHerdrConfigPreview(exePath);
  }
  if (target === 'zcode') {
    return getZcodeConfigPreview(exePath);
  }
  return '';
}

module.exports = {
  getExePath,
  getHookStatus,
  installHook,
  uninstallHook,
  getHookConfigPreview
};
