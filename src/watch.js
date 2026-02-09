const fs = require('fs');
const os = require('os');
const path = require('path');

const { sendNotifications } = require('./engine');

function parseTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return null;
    return num < 1e12 ? num * 1000 : num;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasContentType(message, expectedType) {
  if (!message || typeof message !== 'object') return false;
  if (!Array.isArray(message.content)) return false;
  return message.content.some((item) => item && item.type === expectedType);
}

function extractTextFromAny(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(extractTextFromAny).filter(Boolean).join('\n');
  }
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (typeof value.content === 'string') return value.content;
    if (typeof value.message === 'string') return value.message;
    if (typeof value.value === 'string') return value.value;
    if (typeof value.data === 'string') return value.data;
    if (Array.isArray(value.content)) return extractTextFromAny(value.content);
    if (Array.isArray(value.parts)) return extractTextFromAny(value.parts);
    if (Array.isArray(value.messages)) return extractTextFromAny(value.messages);
  }
  return '';
}

function extractMessageText(message) {
  if (!message) return '';
  if (Array.isArray(message.content)) return extractTextFromAny(message.content);
  if (typeof message.content === 'string') return message.content;
  return extractTextFromAny(message);
}

const DEFAULT_CONFIRM_KEYWORDS = [
  '是否',
  '要不要',
  '能否',
  '可否',
  '可以吗',
  '可以么',
  '请确认',
  '确认一下',
  '是否确认',
  '是否继续',
  '同意',
  '允许',
  '授权',
  '批准',
  'confirm',
  'confirmation',
  'approve',
  'approval',
  'okay to',
  'is it ok',
  'is it okay',
  'shall i',
  'should i',
  'would you like',
  'do you want me',
  'may i',
  'permission',
  'allow',
  'authorize',
  'await your',
  'waiting for your'
];
const DEFAULT_CONFIRM_ACTION_WORDS = [
  '执行',
  '删除',
  '覆盖',
  '写入',
  '提交',
  '安装',
  '运行',
  '修改',
  '变更',
  'apply',
  'run',
  'delete',
  'overwrite',
  'write',
  'install',
  'execute',
  'change',
  'modify'
];
const CONFIRM_DEDUPE_MS = 15000;

function normalizeConfirmText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function truncateText(text, maxLength) {
  const value = String(text || '').trim();
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - 1)) + '...';
}

function buildConfirmTaskInfo(_text) {
  return '确认提醒';
}

function parseConfirmKeywords(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function createConfirmDetector(confirmAlert) {
  const enabled =
    confirmAlert && Object.prototype.hasOwnProperty.call(confirmAlert, 'enabled')
      ? Boolean(confirmAlert.enabled)
      : true;
  if (!enabled) return () => '';

  const custom = parseConfirmKeywords(confirmAlert && confirmAlert.keywords);
  const keywordPool = [...DEFAULT_CONFIRM_KEYWORDS, ...custom].map((k) => String(k).toLowerCase());
  const actionPool = [...DEFAULT_CONFIRM_ACTION_WORDS, ...custom].map((k) => String(k).toLowerCase());

  return (text) => {
    const raw = normalizeConfirmText(text);
    if (!raw) return '';
    const lower = raw.toLowerCase();
    const hasKeyword = keywordPool.some((k) => k && lower.includes(k));
    if (hasKeyword) return raw;

    if (!/[?？]/.test(raw)) return '';
    const hasAction = actionPool.some((k) => k && lower.includes(k));
    return hasAction ? raw : '';
  };
}

function safeJsonParse(line) {
  try {
    const normalized = typeof line === 'string' ? line.replace(/^\uFEFF/, '') : '';
    return JSON.parse(normalized);
  } catch (_error) {
    return null;
  }
}

function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch (_error) {
    return null;
  }
}

function readFileSliceUtf8(filePath, start, length) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(Math.max(0, length));
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, Math.max(0, start));
    return buffer.slice(0, bytesRead).toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function findLatestFile(rootDir, isCandidate) {
  let latest = null;

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!isCandidate(fullPath, entry.name)) continue;

      const stat = safeStat(fullPath);
      if (!stat) continue;
      if (!latest || stat.mtimeMs > latest.mtimeMs) {
        latest = { path: fullPath, mtimeMs: stat.mtimeMs, size: stat.size };
      }
    }
  }

  walk(rootDir);
  return latest;
}

class JsonlFollower {
  constructor({ seedBytes }) {
    this.seedBytes = Number.isFinite(seedBytes) ? seedBytes : 256 * 1024;
    this.filePath = null;
    this.position = 0;
    this.partial = '';
  }

  attach(filePath, onObject) {
    const stat = safeStat(filePath);
    if (!stat) return;

    this.filePath = filePath;
    this.position = stat.size;
    this.partial = '';

    const start = Math.max(0, stat.size - this.seedBytes);
    const seedText = readFileSliceUtf8(filePath, start, stat.size - start);
    let lines = seedText.split(/\r?\n/);
    if (start > 0) lines = lines.slice(1);
    for (const line of lines) {
      if (!line) continue;
      const obj = safeJsonParse(line);
      if (obj) onObject(obj, { seed: true });
    }
  }

  poll(onObject) {
    if (!this.filePath) return;

    const stat = safeStat(this.filePath);
    if (!stat) return;

    if (stat.size < this.position) {
      this.position = 0;
      this.partial = '';
    }

    if (stat.size === this.position) return;

    const chunk = readFileSliceUtf8(this.filePath, this.position, stat.size - this.position);
    this.position = stat.size;

    const text = this.partial + chunk;
    const parts = text.split(/\r?\n/);
    this.partial = parts.pop() || '';
    for (const line of parts) {
      if (!line) continue;
      const obj = safeJsonParse(line);
      if (obj) onObject(obj, { seed: false });
    }
  }
}

function makeLogger(log) {
  if (typeof log === 'function') return log;
  return () => {};
}

function summarizeResult(result) {
  if (!result || typeof result !== 'object') return 'unknown';
  if (result.skipped) return `skipped: ${result.reason || ''}`.trim();
  const ok = Array.isArray(result.results) ? result.results.filter((r) => r && r.ok).length : 0;
  const total = Array.isArray(result.results) ? result.results.length : 0;
  return `sent: ${ok}/${total}`;
}

async function maybeNotifyConfirm({ source, text, cwd, logger, state, confirmDetector }) {
  if (typeof confirmDetector !== 'function') return;
  if (state && state.confirmNotifiedForTurn) return;
  const prompt = confirmDetector(text);
  if (!prompt) return;
  const normalized = normalizeConfirmText(prompt);
  if (!normalized) return;

  const key = normalized.slice(0, 200);
  const now = Date.now();
  if (state.lastConfirmKey === key && now - (state.lastConfirmAt || 0) < CONFIRM_DEDUPE_MS) return;
  state.lastConfirmKey = key;
  state.lastConfirmAt = now;
  if (state) state.confirmNotifiedForTurn = true;

  const taskInfo = buildConfirmTaskInfo(normalized);
  const result = await sendNotifications({
    source,
    taskInfo,
    durationMs: null,
    cwd,
    force: true,
    notifyKind: 'confirm',
    skipSummary: true,
    summaryContext: { assistantMessage: normalized }
  });
  logger(`[watch][confirm:${source}] ${summarizeResult(result)}`);
}

function startClaudeWatch({ intervalMs, quietPeriodMs, log, claudeQuietMs, confirmDetector }) {
  const logger = makeLogger(log);
  const root = path.join(os.homedir(), '.claude', 'projects');
  const follower = new JsonlFollower({ seedBytes: 256 * 1024 });

  const state = {
    currentFile: null,
    tickRunning: false,
    lastUserTextAt: null,
    lastAssistantAt: null,
    lastNotifiedAt: null,
    notifiedForTurn: false,
    confirmNotifiedForTurn: false,
    lastCwd: null,
    pendingTimer: null,
    lastAssistantContent: null,
    lastAssistantHadToolUse: false,
    lastUserText: '',
    lastAssistantText: '',
    lastConfirmKey: '',
    lastConfirmAt: 0
  };

  const quietMs = Math.max(500, claudeQuietMs || quietPeriodMs || 60000);

  async function maybeNotify(ts) {
    if (state.lastAssistantAt == null || state.lastUserTextAt == null) return;
    if (state.lastNotifiedAt === state.lastAssistantAt) return;
    if (state.notifiedForTurn) return;
    if (state.confirmNotifiedForTurn) return;
    if (ts != null && ts !== state.lastAssistantAt) return;

    state.lastNotifiedAt = state.lastAssistantAt;
    state.notifiedForTurn = true;
    const durationMs =
      state.lastAssistantAt >= state.lastUserTextAt ? state.lastAssistantAt - state.lastUserTextAt : null;
    const cwd = state.lastCwd || process.cwd();
    const result = await sendNotifications({
      source: 'claude',
      taskInfo: 'Claude 完成',
      durationMs,
      cwd,
      outputContent: state.lastAssistantContent || state.lastAssistantText,
      summaryContext: {
        userMessage: state.lastUserText,
        assistantMessage: state.lastAssistantText
      }
    });
    state.confirmNotifiedForTurn = true;
    logger(`[watch][claude] ${summarizeResult(result)}`);
  }

  function scheduleSeedNotifyIfNeeded() {
    if (state.lastAssistantAt == null || state.lastUserTextAt == null) return;
    if (state.lastAssistantAt < state.lastUserTextAt) return;
    if (state.notifiedForTurn || state.confirmNotifiedForTurn) return;

    const now = Date.now();
    const windowMs = Math.max(quietMs * 2, 15000);
    if (now - state.lastAssistantAt > windowMs) return;

    const adaptiveQuietMs = state.lastAssistantHadToolUse ? quietMs : Math.min(15000, quietMs);
    if (state.pendingTimer) clearTimeout(state.pendingTimer);
    state.pendingTimer = setTimeout(() => {
      void maybeNotify(state.lastAssistantAt);
    }, adaptiveQuietMs);
  }

  async function processObject(obj, { seed }) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.isSidechain === true) return;

    const ts = parseTimestamp(obj.timestamp);
    if (typeof obj.cwd === 'string') state.lastCwd = obj.cwd;

    if (obj.type === 'user') {
      const userText = extractMessageText(obj.message);
      state.lastUserText = userText;
      state.lastAssistantText = '';
      state.lastAssistantContent = null;
      state.lastAssistantHadToolUse = false;
      state.lastConfirmKey = '';
      state.confirmNotifiedForTurn = false;
      if (typeof obj.cwd === 'string') state.lastCwd = obj.cwd;
      if (seed) {
        if (ts != null) state.lastUserTextAt = ts;
        state.notifiedForTurn = false;
        return;
      }
      state.lastUserTextAt = ts;
      state.notifiedForTurn = false;
      return;
    }

    if (obj.type === 'assistant') {
      const assistantText = extractMessageText(obj.message);
      if (assistantText) state.lastAssistantText = assistantText;
      const hasToolUse = hasContentType(obj.message, 'tool_use');
      state.lastAssistantHadToolUse = hasToolUse;

      let content = '';

      if (obj.message && Array.isArray(obj.message.content)) {
        const textParts = obj.message.content
          .filter(item => item && item.type === 'text')
          .map(item => item.text || '')
          .filter(Boolean);
        content = textParts.join('\n\n');
      } else if (obj.message && typeof obj.message.content === 'string') {
        content = obj.message.content;
      } else if (obj.message && obj.message.text && typeof obj.message.text === 'string') {
        content = obj.message.text;
      }

      if (content && content.trim()) {
        state.lastAssistantContent = content;
      }

      if (ts != null || !seed) {
        state.lastAssistantAt = ts || Date.now();
      }

      if (seed) return;

      await maybeNotifyConfirm({
        source: 'claude',
        text: assistantText || content,
        cwd: state.lastCwd || process.cwd(),
        logger,
        state,
        confirmDetector
      });

      if (state.lastUserTextAt == null) {
        state.lastUserTextAt = ts || Date.now();
        state.notifiedForTurn = false;
      }

      if (state.confirmNotifiedForTurn) {
        if (state.pendingTimer) clearTimeout(state.pendingTimer);
        state.pendingTimer = null;
      } else {
        if (state.pendingTimer) clearTimeout(state.pendingTimer);

        const adaptiveQuietMs = hasToolUse ? quietMs : Math.min(15000, quietMs);

        state.pendingTimer = setTimeout(() => {
          void maybeNotify(state.lastAssistantAt);
        }, adaptiveQuietMs);
      }
    }
  }

  async function tick() {
    if (state.tickRunning) return;
    state.tickRunning = true;
    try {
      if (!fs.existsSync(root)) return;
      const latest = findLatestFile(root, (_full, name) => name.toLowerCase().endsWith('.jsonl'));
      if (!latest) return;
      if (latest.path !== state.currentFile) {
        state.currentFile = latest.path;
        state.lastUserTextAt = null;
        state.lastAssistantAt = null;
        state.lastNotifiedAt = null;
        state.notifiedForTurn = false;
        state.lastConfirmKey = '';
        state.confirmNotifiedForTurn = false;
        state.lastUserText = '';
        state.lastAssistantText = '';
        state.lastAssistantContent = null;
        state.lastAssistantHadToolUse = false;
        if (state.pendingTimer) clearTimeout(state.pendingTimer);
        state.pendingTimer = null;
        follower.attach(latest.path, (obj, meta) => {
          void processObject(obj, meta);
        });
        logger(`[watch][claude] following ${latest.path}`);
        scheduleSeedNotifyIfNeeded();
      }
      follower.poll((obj, meta) => {
        void processObject(obj, meta);
      });
    } finally {
      state.tickRunning = false;
    }
  }

  tick();
  const timer = setInterval(tick, Math.max(500, intervalMs || 1000));
  return () => clearInterval(timer);
}

function startCodexWatch({ intervalMs, log, confirmDetector }) {
  const logger = makeLogger(log);
  const root = path.join(os.homedir(), '.codex', 'sessions');
  const follower = new JsonlFollower({ seedBytes: 256 * 1024 });
  const completionGraceMs = 1500;
  const strictFinalAnswerOnly = String(process.env.CODEX_STRICT_FINAL_ANSWER || '1').trim() !== '0';
  const codexCompletionOnly = String(process.env.CODEX_COMPLETION_ONLY || '1').trim() !== '0';
  const emptyPhaseQuietMs = Math.max(30000, Number(process.env.CODEX_EMPTY_PHASE_QUIET_MS || 120000));
  const switchIdleMs = 120000;
  const sessionMetaCwdCache = new Map();

  function normalizePathForCompare(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      return path.resolve(value).replace(/[\\/]+/g, '/').toLowerCase();
    } catch (_error) {
      return String(value).replace(/[\\/]+/g, '/').toLowerCase();
    }
  }

  function isPathRelated(a, b) {
    if (!a || !b) return false;
    return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
  }

  function readSessionMetaCwd(filePath) {
    if (!filePath) return '';
    if (sessionMetaCwdCache.has(filePath)) return sessionMetaCwdCache.get(filePath);

    let cwd = '';
    try {
      const stat = safeStat(filePath);
      if (stat && stat.size > 0) {
        const size = Math.min(64 * 1024, stat.size);
        const text = readFileSliceUtf8(filePath, 0, size);
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (!line) continue;
          const obj = safeJsonParse(line);
          if (!obj || obj.type !== 'session_meta') continue;
          const payload = obj.payload;
          if (payload && typeof payload.cwd === 'string') {
            cwd = normalizePathForCompare(payload.cwd);
          }
          break;
        }
      }
    } catch (_error) {
      cwd = '';
    }

    sessionMetaCwdCache.set(filePath, cwd);
    return cwd;
  }

  function findPreferredSessionFile(preferredCwd) {
    let latestAny = null;
    let latestPreferred = null;
    const preferred = normalizePathForCompare(preferredCwd);

    function walk(dir) {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (_error) {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }
        if (!entry.isFile()) continue;
        if (!entry.name.toLowerCase().endsWith('.jsonl')) continue;

        const stat = safeStat(fullPath);
        if (!stat) continue;

        if (!latestAny || stat.mtimeMs > latestAny.mtimeMs) {
          latestAny = { path: fullPath, mtimeMs: stat.mtimeMs, size: stat.size };
        }

        if (!preferred) continue;
        const sessionCwd = readSessionMetaCwd(fullPath);
        if (!sessionCwd || !isPathRelated(sessionCwd, preferred)) continue;
        if (!latestPreferred || stat.mtimeMs > latestPreferred.mtimeMs) {
          latestPreferred = { path: fullPath, mtimeMs: stat.mtimeMs, size: stat.size };
        }
      }
    }

    walk(root);
    return latestPreferred || latestAny;
  }

  function isCodexWorkResponseType(type) {
    return [
      'reasoning',
      'function_call',
      'function_call_output',
      'custom_tool_call',
      'custom_tool_call_output',
      'web_search_call',
      'tool_use'
    ].includes(type);
  }

  const state = {
    currentFile: null,
    tickRunning: false,
    lastEventAt: 0,
    attachedAt: 0,
    lastUserAt: null,
    lastAssistantAt: null,
    lastNotifiedAssistantAt: null,
    lastCwd: null,
    lastAgentContent: null,
    lastUserText: '',
    lastAssistantText: '',
    lastConfirmKey: '',
    lastConfirmAt: 0,
    confirmNotifiedForTurn: false,
    pendingCompletion: null
  };

  function clearPendingCompletion() {
    const pending = state.pendingCompletion;
    if (!pending) return;
    if (pending.timer) {
      clearTimeout(pending.timer);
    }
    state.pendingCompletion = null;
  }

  function stagePendingCompletion(ts, options = {}) {
    clearPendingCompletion();
    const assistantAt = ts != null ? ts : Date.now();
    state.lastAssistantAt = assistantAt;
    const tokenRequired = options && Object.prototype.hasOwnProperty.call(options, 'tokenRequired')
      ? Boolean(options.tokenRequired)
      : true;
    const quietMs = options && Number.isFinite(Number(options.quietMs)) ? Number(options.quietMs) : 0;
    state.pendingCompletion = {
      assistantAt,
      tokenRequired,
      tokenSeen: false,
      tokenAt: null,
      timer: null
    };

    if (quietMs > 0) {
      state.pendingCompletion.timer = setTimeout(() => {
        void flushPendingCompletion('quiet_fallback', { allowWithoutToken: true });
      }, quietMs);
    }
  }

  function markPendingTokenSeen(ts) {
    const pending = state.pendingCompletion;
    if (!pending) return;
    if (!pending.tokenRequired) return;
    pending.tokenSeen = true;
    pending.tokenAt = ts != null ? ts : Date.now();
    if (pending.timer) clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      void flushPendingCompletion('token_grace');
    }, completionGraceMs);
  }

  async function flushPendingCompletion(reason, options = {}) {
    const pending = state.pendingCompletion;
    const allowWithoutToken = Boolean(options && options.allowWithoutToken);
    if (!pending) return false;
    if (pending.tokenRequired && !pending.tokenSeen && !allowWithoutToken) return false;

    clearPendingCompletion();

    if (state.confirmNotifiedForTurn) {
      logger(`[watch][codex] skipped completion (${reason}: confirm alert sent)`);
      return false;
    }

    const assistantAt = pending.assistantAt;
    if (assistantAt != null && state.lastNotifiedAssistantAt === assistantAt) {
      return false;
    }

    const durationMs =
      assistantAt != null && state.lastUserAt != null && assistantAt >= state.lastUserAt
        ? assistantAt - state.lastUserAt
        : null;
    const cwd = state.lastCwd || process.cwd();
    const result = await sendNotifications({
      source: 'codex',
      taskInfo: 'Codex 完成',
      durationMs,
      cwd,
      outputContent: state.lastAgentContent || state.lastAssistantText,
      summaryContext: {
        userMessage: state.lastUserText,
        assistantMessage: state.lastAssistantText
      }
    });

    state.lastNotifiedAssistantAt = assistantAt;
    state.confirmNotifiedForTurn = true;
    logger(`[watch][codex] ${summarizeResult(result)} (${reason})`);
    return true;
  }

  async function processObject(obj, { seed }) {
    if (!obj || typeof obj !== 'object') return;
    const ts = parseTimestamp(obj.timestamp);

    if (!seed) {
      state.lastEventAt = Date.now();
    }

    if (obj.type === 'turn_context') {
      clearPendingCompletion();
      if (obj.payload && typeof obj.payload.cwd === 'string') {
        state.lastCwd = obj.payload.cwd;
      }
      return;
    }

    if (obj.type === 'response_item' && obj.payload && obj.payload.type === 'message' && obj.payload.role === 'user') {
      if (!seed) {
        await flushPendingCompletion('before_user_message', { allowWithoutToken: true });
      }
      clearPendingCompletion();
      state.lastUserAt = ts;
      state.lastUserText = extractTextFromAny(obj.payload);
      state.lastConfirmKey = '';
      state.confirmNotifiedForTurn = false;
      return;
    }

    if (obj.type === 'response_item' && obj.payload && isCodexWorkResponseType(obj.payload.type)) {
      clearPendingCompletion();
      return;
    }

    if (obj.type === 'response_item' && obj.payload && obj.payload.type === 'message' && obj.payload.role === 'assistant') {
      if (seed) return;

      clearPendingCompletion();

      const phase = typeof obj.payload.phase === 'string' ? obj.payload.phase : '';

      const assistantText = extractTextFromAny(obj.payload);
      if (assistantText) {
        state.lastAssistantText = assistantText;
        state.lastAgentContent = assistantText;
      }

      if (!codexCompletionOnly) {
        await maybeNotifyConfirm({
          source: 'codex',
          text: assistantText,
          cwd: state.lastCwd || process.cwd(),
          logger,
          state,
          confirmDetector
        });
      }

      if (state.confirmNotifiedForTurn) {
        return;
      }

      if (phase === 'commentary') {
        return;
      }

      if (!phase && strictFinalAnswerOnly) {
        stagePendingCompletion(ts, { tokenRequired: false, quietMs: emptyPhaseQuietMs });
        return;
      }

      if (phase && phase !== 'final_answer') {
        return;
      }

      stagePendingCompletion(ts, { tokenRequired: true });
      return;
    }

    if (obj.type === 'event_msg' && obj.payload && typeof obj.payload.type === 'string') {
      const kind = obj.payload.type;
      if (kind === 'user_message') {
        if (!seed) {
          await flushPendingCompletion('before_user_event', { allowWithoutToken: true });
        }
        clearPendingCompletion();
        state.lastUserAt = ts;
        state.lastUserText = extractTextFromAny(obj.payload);
        state.lastConfirmKey = '';
        state.confirmNotifiedForTurn = false;
        return;
      }

      if (kind === 'token_count') {
        if (!seed) {
          markPendingTokenSeen(ts);
        }
        return;
      }

      if (kind === 'agent_reasoning') {
        clearPendingCompletion();
        return;
      }

      if (kind === 'agent_message') {
        if (seed) return;
        const assistantText = extractTextFromAny(obj.payload);
        if (assistantText) state.lastAssistantText = assistantText;

        let content = null;
        if (obj.payload && typeof obj.payload.content === 'string') {
          content = obj.payload.content;
        } else if (obj.payload && obj.payload.message && typeof obj.payload.message === 'string') {
          content = obj.payload.message;
        } else if (obj.payload && obj.payload.text && typeof obj.payload.text === 'string') {
          content = obj.payload.text;
        } else if (obj.payload && obj.payload.data && typeof obj.payload.data === 'string') {
          content = obj.payload.data;
        } else if (obj.message && typeof obj.message === 'string') {
          content = obj.message;
        }

        if (content && content.trim()) {
          state.lastAgentContent = content;
        }

        if (!codexCompletionOnly) {
          await maybeNotifyConfirm({
            source: 'codex',
            text: assistantText || content,
            cwd: state.lastCwd || process.cwd(),
            logger,
            state,
            confirmDetector
          });
        }
      }
    }
  }

  async function tick() {
    if (state.tickRunning) return;
    state.tickRunning = true;
    try {
      if (!fs.existsSync(root)) return;
      const preferredCwd = state.lastCwd || process.cwd();
      const latest = findPreferredSessionFile(preferredCwd);
      if (!latest) return;

      const now = Date.now();
      const attachedAt = state.attachedAt || 0;
      const lastEventAt = state.lastEventAt || 0;
      const idleSince = Math.max(attachedAt, lastEventAt);
      const idleMs = idleSince > 0 ? now - idleSince : Number.POSITIVE_INFINITY;
      const shouldSwitch = !state.currentFile || latest.path === state.currentFile || idleMs >= switchIdleMs;

      if (latest.path !== state.currentFile && !shouldSwitch) {
        follower.poll((obj, meta) => {
          void processObject(obj, meta);
        });
        return;
      }

      if (latest.path !== state.currentFile) {
        state.currentFile = latest.path;
        state.attachedAt = now;
        state.lastEventAt = now;
        state.lastConfirmKey = '';
        state.confirmNotifiedForTurn = false;
        clearPendingCompletion();
        follower.attach(latest.path, (obj, meta) => {
          void processObject(obj, meta);
        });
        logger(`[watch][codex] following ${latest.path}`);
      }
      follower.poll((obj, meta) => {
        void processObject(obj, meta);
      });
    } finally {
      state.tickRunning = false;
    }
  }

  tick();
  const timer = setInterval(tick, Math.max(500, intervalMs || 1000));
  return () => {
    clearInterval(timer);
    clearPendingCompletion();
  };
}

function startGeminiWatch({ intervalMs, quietPeriodMs, log, confirmDetector }) {
  const logger = makeLogger(log);
  const root = path.join(os.homedir(), '.gemini', 'tmp');

  const state = {
    currentFile: null,
    currentMtimeMs: 0,
    lastCount: 0,
    lastUserAt: null,
    lastGeminiAt: null,
    lastNotifiedGeminiAt: null,
    tickRunning: false,
    pendingTimer: null,
    lastGeminiContent: null, // 鎹曡幏gemini鐨勮緭鍑哄唴瀹?    lastUserText: '',
    lastGeminiText: '',
    lastConfirmKey: '',
    lastConfirmAt: 0,
    confirmNotifiedForTurn: false
  };

  async function notifyIfReady(reason) {
    const endAt = state.lastGeminiAt;
    const startAt = state.lastUserAt;
    if (endAt == null || startAt == null) return;
    if (state.lastNotifiedGeminiAt === endAt) return;
    if (state.confirmNotifiedForTurn) {
      state.lastNotifiedGeminiAt = endAt;
      logger('[watch][gemini] skipped completion (confirm alert sent)');
      return;
    }

    state.lastNotifiedGeminiAt = endAt;
    const durationMs = endAt >= startAt ? endAt - startAt : null;
    const result = await sendNotifications({
      source: 'gemini',
      taskInfo: 'Gemini 完成',
      durationMs,
      cwd: process.cwd(),
      projectNameOverride: 'Gemini',
      outputContent: state.lastGeminiContent || state.lastGeminiText,
      summaryContext: {
        userMessage: state.lastUserText,
        assistantMessage: state.lastGeminiText
      }
    });
    state.confirmNotifiedForTurn = true;
    logger(`[watch][gemini] ${reason} ${summarizeResult(result)}`.trim());
  }

  function scheduleDebouncedNotify() {
    if (state.pendingTimer) clearTimeout(state.pendingTimer);
    const targetGeminiAt = state.lastGeminiAt;
    state.pendingTimer = setTimeout(() => {
      state.pendingTimer = null;
      if (state.lastGeminiAt !== targetGeminiAt) return;
      void notifyIfReady('debounced');
    }, Math.max(500, quietPeriodMs || 3000));
  }

  function switchFile(filePath, mtimeMs, messages) {
    if (state.pendingTimer) clearTimeout(state.pendingTimer);
    state.pendingTimer = null;

    state.currentFile = filePath;
    state.currentMtimeMs = mtimeMs;
    state.lastCount = Array.isArray(messages) ? messages.length : 0;

    state.lastUserAt = null;
    state.lastGeminiAt = null;
    state.lastUserText = '';
    state.lastGeminiText = '';
    state.lastConfirmKey = '';
    state.confirmNotifiedForTurn = false;

    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (!m || typeof m !== 'object') continue;
        const ts = parseTimestamp(m.timestamp);
        if (m.type === 'user') {
          state.lastUserAt = ts;
          state.lastUserText = extractTextFromAny(m);
        }
        if (m.type === 'gemini') {
          state.lastGeminiAt = ts;
          const geminiText = extractTextFromAny(m);
          if (geminiText) state.lastGeminiText = geminiText;
        }
      }
    }

    state.lastNotifiedGeminiAt = state.lastGeminiAt;
    logger(`[watch][gemini] following ${filePath}`);
  }

  async function tick() {
    if (state.tickRunning) return;
    state.tickRunning = true;
    try {
      if (!fs.existsSync(root)) return;
      const latest = findLatestFile(root, (fullPath, name) => {
        if (!name.toLowerCase().endsWith('.json')) return false;
        if (!name.toLowerCase().startsWith('session-')) return false;
        return fullPath.toLowerCase().includes(`${path.sep}chats${path.sep}`);
      });
      if (!latest) return;

      const stat = safeStat(latest.path);
      if (!stat) return;

      if (latest.path !== state.currentFile) {
        try {
          const parsed = JSON.parse(fs.readFileSync(latest.path, 'utf8').replace(/^\uFEFF/, ''));
          switchFile(latest.path, stat.mtimeMs, parsed && parsed.messages);
        } catch (_error) {
          return;
        }
        return;
      }

      if (stat.mtimeMs <= state.currentMtimeMs) return;

      let parsed;
      try {
        parsed = JSON.parse(fs.readFileSync(latest.path, 'utf8').replace(/^\uFEFF/, ''));
      } catch (_error) {
        return;
      }

      const messages = parsed && Array.isArray(parsed.messages) ? parsed.messages : [];
      if (messages.length <= state.lastCount) {
        state.currentMtimeMs = stat.mtimeMs;
        state.lastCount = messages.length;
        return;
      }

      const newMessages = messages.slice(state.lastCount);
      for (const m of newMessages) {
        if (!m || typeof m !== 'object') continue;
        const ts = parseTimestamp(m.timestamp);
        if (m.type === 'user') {
          if (state.pendingTimer) clearTimeout(state.pendingTimer);
          state.pendingTimer = null;
          state.lastUserAt = ts;
          state.lastUserText = extractTextFromAny(m);
          state.lastGeminiAt = null;
          state.lastNotifiedGeminiAt = null;
          state.lastGeminiText = '';
          state.lastConfirmKey = '';
          state.confirmNotifiedForTurn = false;
          continue;
        }

        if (m.type === 'gemini') {
          state.lastGeminiAt = ts;

          // 鎹曡幏gemini娑堟伅鐨勫唴瀹?- 澧炲己鐗?          let content = '';

          if (m.content && Array.isArray(m.content)) {
            // 鏍煎紡1锛歝ontent鏄瓧绗︿覆鏁扮粍
            const textParts = m.content
              .filter(item => item && typeof item === 'string')
              .filter(Boolean);
            content = textParts.join('\n\n');
          } else if (m.content && typeof m.content === 'string') {
            // 鏍煎紡2锛歝ontent鐩存帴鏄瓧绗︿覆
            content = m.content;
          } else if (m.parts && Array.isArray(m.parts)) {
            // 鏍煎紡3锛氫娇鐢╬arts瀛楁
            const textParts = m.parts
              .filter(part => part && part.text && typeof part.text === 'string')
              .map(part => part.text)
              .filter(Boolean);
            content = textParts.join('\n\n');
          } else if (m.text && typeof m.text === 'string') {
            // 鏍煎紡4锛氱洿鎺ヤ娇鐢╰ext瀛楁
            content = m.text;
          }

          if (content && content.trim()) {
            state.lastGeminiContent = content;
          }

          const geminiText = extractTextFromAny(m);
          if (geminiText) state.lastGeminiText = geminiText;

          await maybeNotifyConfirm({
            source: 'gemini',
            text: geminiText || content,
            cwd: process.cwd(),
            logger,
            state,
            confirmDetector
          });

          if (state.confirmNotifiedForTurn) {
            if (state.pendingTimer) clearTimeout(state.pendingTimer);
            state.pendingTimer = null;
            continue;
          }

          scheduleDebouncedNotify();
        }
      }

      state.currentMtimeMs = stat.mtimeMs;
      state.lastCount = messages.length;
    } finally {
      state.tickRunning = false;
    }
  }

  tick();
  const timer = setInterval(tick, Math.max(500, intervalMs || 1500));
  return () => {
    clearInterval(timer);
    if (state.pendingTimer) clearTimeout(state.pendingTimer);
  };
}

function normalizeSources(input) {
  if (!input) return ['claude', 'codex', 'gemini'];
  const raw = Array.isArray(input) ? input.join(',') : String(input);
  const parts = raw
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.includes('all')) return ['claude', 'codex', 'gemini'];
  return [...new Set(parts)];
}

function startWatch({ sources, intervalMs, geminiQuietMs, claudeQuietMs, log, confirmAlert }) {
  const normalizedSources = normalizeSources(sources);
  const stops = [];
  const confirmDetector = createConfirmDetector(confirmAlert || {});

  if (normalizedSources.includes('claude')) {
    stops.push(startClaudeWatch({ intervalMs, quietPeriodMs: geminiQuietMs, claudeQuietMs, log, confirmDetector }));
  }
  if (normalizedSources.includes('codex')) {
    stops.push(startCodexWatch({ intervalMs, log, confirmDetector }));
  }
  if (normalizedSources.includes('gemini')) {
    stops.push(startGeminiWatch({ intervalMs, quietPeriodMs: geminiQuietMs, log, confirmDetector }));
  }

  return () => {
    for (const stop of stops) stop();
  };
}

module.exports = {
  startWatch
};


