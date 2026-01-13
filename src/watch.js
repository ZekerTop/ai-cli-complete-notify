const fs = require('fs');
const os = require('os');
const path = require('path');

const { sendNotifications } = require('./engine');

function parseTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasContentType(message, expectedType) {
  if (!message || typeof message !== 'object') return false;
  if (!Array.isArray(message.content)) return false;
  return message.content.some((item) => item && item.type === expectedType);
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

function startClaudeWatch({ intervalMs, quietPeriodMs, log }) {
  const logger = makeLogger(log);
  const root = path.join(os.homedir(), '.claude', 'projects');
  const follower = new JsonlFollower({ seedBytes: 256 * 1024 });

  const state = {
    currentFile: null,
    tickRunning: false,
    lastUserTextAt: null,
    lastAssistantAt: null,
    lastNotifiedAt: null,
    lastCwd: null,
    pendingTimer: null
  };

  const quietMs = Math.max(500, quietPeriodMs || 3000);

  async function maybeNotify(ts) {
    if (state.lastAssistantAt == null || state.lastUserTextAt == null) return;
    if (state.lastNotifiedAt === state.lastAssistantAt) return;
    if (ts != null && ts !== state.lastAssistantAt) return;

    state.lastNotifiedAt = state.lastAssistantAt;
    const durationMs =
      state.lastAssistantAt >= state.lastUserTextAt ? state.lastAssistantAt - state.lastUserTextAt : null;
    const cwd = state.lastCwd || process.cwd();
    const result = await sendNotifications({
      source: 'claude',
      taskInfo: 'Claude 完成',
      durationMs,
      cwd
    });
    logger(`[watch][claude] ${summarizeResult(result)}`);
  }

  async function processObject(obj, { seed }) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.isSidechain === true) return;

    const ts = parseTimestamp(obj.timestamp);
    if (typeof obj.cwd === 'string') state.lastCwd = obj.cwd;

    if (obj.type === 'user' && hasContentType(obj.message, 'text')) {
      state.lastUserTextAt = ts;
      if (typeof obj.cwd === 'string') state.lastCwd = obj.cwd;
      return;
    }

    if (obj.type === 'assistant' && hasContentType(obj.message, 'text')) {
      if (seed) return;

      state.lastAssistantAt = ts || Date.now();
      if (state.pendingTimer) clearTimeout(state.pendingTimer);
      state.pendingTimer = setTimeout(() => {
        void maybeNotify(state.lastAssistantAt);
      }, quietMs);
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
        follower.attach(latest.path, (obj, meta) => {
          void processObject(obj, meta);
        });
        logger(`[watch][claude] following ${latest.path}`);
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

function startCodexWatch({ intervalMs, log }) {
  const logger = makeLogger(log);
  const root = path.join(os.homedir(), '.codex', 'sessions');
  const follower = new JsonlFollower({ seedBytes: 256 * 1024 });

  const state = {
    currentFile: null,
    tickRunning: false,
    lastUserAt: null,
    lastCwd: null
  };

  async function processObject(obj, { seed }) {
    if (!obj || typeof obj !== 'object') return;
    const ts = parseTimestamp(obj.timestamp);

    if (obj.type === 'turn_context' && obj.payload && typeof obj.payload.cwd === 'string') {
      state.lastCwd = obj.payload.cwd;
      return;
    }

    if (obj.type === 'response_item' && obj.payload && obj.payload.type === 'message' && obj.payload.role === 'user') {
      state.lastUserAt = ts;
      return;
    }

    if (obj.type === 'event_msg' && obj.payload && typeof obj.payload.type === 'string') {
      const kind = obj.payload.type;
      if (kind === 'user_message') {
        state.lastUserAt = ts;
        return;
      }

      if (kind === 'agent_message') {
        if (seed) return;

        const durationMs = ts != null && state.lastUserAt != null && ts >= state.lastUserAt ? ts - state.lastUserAt : null;
        const cwd = state.lastCwd || process.cwd();
        const result = await sendNotifications({
          source: 'codex',
          taskInfo: 'Codex 完成',
          durationMs,
          cwd
        });
        logger(`[watch][codex] ${summarizeResult(result)}`);
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
  return () => clearInterval(timer);
}

function startGeminiWatch({ intervalMs, quietPeriodMs, log }) {
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
    pendingTimer: null
  };

  async function notifyIfReady(reason) {
    const endAt = state.lastGeminiAt;
    const startAt = state.lastUserAt;
    if (endAt == null || startAt == null) return;
    if (state.lastNotifiedGeminiAt === endAt) return;

    state.lastNotifiedGeminiAt = endAt;
    const durationMs = endAt >= startAt ? endAt - startAt : null;
    const result = await sendNotifications({
      source: 'gemini',
      taskInfo: 'Gemini 完成',
      durationMs,
      cwd: process.cwd(),
      projectNameOverride: 'Gemini'
    });
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

    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (!m || typeof m !== 'object') continue;
        const ts = parseTimestamp(m.timestamp);
        if (m.type === 'user') state.lastUserAt = ts;
        if (m.type === 'gemini') state.lastGeminiAt = ts;
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
          state.lastGeminiAt = null;
          state.lastNotifiedGeminiAt = null;
          continue;
        }

        if (m.type === 'gemini') {
          state.lastGeminiAt = ts;
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

function startWatch({ sources, intervalMs, geminiQuietMs, log }) {
  const normalizedSources = normalizeSources(sources);
  const stops = [];

  if (normalizedSources.includes('claude')) {
    stops.push(startClaudeWatch({ intervalMs, quietPeriodMs: geminiQuietMs, log }));
  }
  if (normalizedSources.includes('codex')) {
    stops.push(startCodexWatch({ intervalMs, log }));
  }
  if (normalizedSources.includes('gemini')) {
    stops.push(startGeminiWatch({ intervalMs, quietPeriodMs: geminiQuietMs, log }));
  }

  return () => {
    for (const stop of stops) stop();
  };
}

module.exports = {
  startWatch
};
