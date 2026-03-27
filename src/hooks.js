const fs = require('fs');
const path = require('path');
const os = require('os');

const HOOK_MARKER = 'ai-cli-complete-notify';
const HOOK_MARKER_ALT = 'ai-reminder';
const HOOK_FLAG = '--from-hook';
const OPENCODE_PLUGIN_FILE = 'ai-cli-complete-notify.js';
const OPENCODE_PLUGIN_MARKER = `${HOOK_MARKER}:opencode-plugin`;

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
    { type: 'command', command: cmd }
  ];
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

  const desiredHooks = buildGeminiHooks(exePath);
  for (const desired of desiredHooks) {
    const idx = settings.hooks.AfterAgent.findIndex((hook) => isOurGeminiHook(hook));
    if (idx >= 0) {
      settings.hooks.AfterAgent[idx] = desired;
    } else {
      settings.hooks.AfterAgent.push(desired);
    }
  }

  writeJsonFile(settingsPath, settings);
  return { ok: true, settingsPath };
}

function uninstallGeminiHook() {
  const settingsPath = getGeminiSettingsPath();
  const settings = readJsonFile(settingsPath);

  if (!settings.hooks || typeof settings.hooks !== 'object') return { ok: true, settingsPath };

  if (Array.isArray(settings.hooks.AfterAgent)) {
    settings.hooks.AfterAgent = settings.hooks.AfterAgent.filter((hook) => !isOurGeminiHook(hook));
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
  const installed = list.some((hook) => isOurGeminiHook(hook));
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
  const assistantText = eventType === 'session.idle'
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
      : 'OpenCode 完成',
    session_id: sessionId,
    error_message: errorMessage,
    project_name: firstString(context.project && context.project.name),
    assistant_message: assistantText,
    output_content: eventType === 'session.error' ? errorMessage : assistantText,
  };
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
  try {
    Bun.spawn({
      cmd: NOTIFY_CMD,
      cwd: payload.cwd || undefined,
      env: {
        ...process.env,
        DESKTOP_NOTIFY_MODE: process.platform === 'win32' ? 'popup' : String(process.env.DESKTOP_NOTIFY_MODE || ''),
      },
      stdin: new Response(JSON.stringify(payload)).body,
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
      const eventType = getEventType(event);
      if (eventType !== 'session.idle' && eventType !== 'session.error') return;

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

function getHookStatus() {
  return {
    claude: getClaudeHookStatus(),
    gemini: getGeminiHookStatus(),
    opencode: getOpenCodeHookStatus()
  };
}

function installHook(target) {
  const exePath = getExePath();
  if (target === 'claude') return installClaudeHook(exePath);
  if (target === 'gemini') return installGeminiHook(exePath);
  if (target === 'opencode') return installOpenCodeHook(exePath);
  return { ok: false, error: `Unknown target: ${target}` };
}

function uninstallHook(target) {
  if (target === 'claude') return uninstallClaudeHook();
  if (target === 'gemini') return uninstallGeminiHook();
  if (target === 'opencode') return uninstallOpenCodeHook();
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
  return '';
}

module.exports = {
  getExePath,
  getHookStatus,
  installHook,
  uninstallHook,
  getHookConfigPreview
};
