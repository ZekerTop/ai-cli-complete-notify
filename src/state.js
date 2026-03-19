const fs = require('fs');
const path = require('path');
const { getStatePath, getDataDir } = require('./paths');

const DATA_DIR = getDataDir();
const STATE_PATH = getStatePath();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadState() {
  try {
    ensureDataDir();
    if (!fs.existsSync(STATE_PATH)) return { tasks: {}, recentNotifications: [] };
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { tasks: {}, recentNotifications: [] };
    if (!parsed.tasks || typeof parsed.tasks !== 'object') parsed.tasks = {};
    if (!Array.isArray(parsed.recentNotifications)) parsed.recentNotifications = [];
    return parsed;
  } catch (error) {
    return { tasks: {}, recentNotifications: [] };
  }
}

function saveState(state) {
  ensureDataDir();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function makeTaskKey({ source, cwd }) {
  return `${source}::${cwd}`;
}

function markTaskStart({ source, cwd, task }) {
  const state = loadState();
  const key = makeTaskKey({ source, cwd });
  state.tasks[key] = {
    source,
    cwd,
    task: task || '',
    startedAt: Date.now()
  };
  saveState(state);
  return state.tasks[key];
}

function consumeTaskStart({ source, cwd }) {
  const state = loadState();
  const key = makeTaskKey({ source, cwd });
  const entry = state.tasks[key] || null;
  if (entry) {
    delete state.tasks[key];
    saveState(state);
  }
  return entry;
}

function normalizeFingerprintPart(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function pruneRecentNotifications(entries, now, windowMs) {
  const cutoff = now - Math.max(1000, Number(windowMs) || 0);
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry && typeof entry === 'object' && Number.isFinite(entry.timestamp) && entry.timestamp >= cutoff)
    .slice(-200);
}

function makeNotificationFingerprint({ source, cwd, text }) {
  const sourcePart = normalizeFingerprintPart(source || 'claude');
  const cwdPart = normalizeFingerprintPart(cwd || '');
  const textPart = normalizeFingerprintPart(text || '').slice(0, 240);
  return `${sourcePart}::${cwdPart}::${textPart}`;
}

function checkAndRememberNotification({ source, cwd, text, dedupeMs }) {
  const trimmedText = String(text || '').trim();
  if (!trimmedText) return false;

  const now = Date.now();
  const windowMs = Math.max(30 * 1000, Number(dedupeMs) || 0);
  const fingerprint = makeNotificationFingerprint({ source, cwd, text: trimmedText });
  const state = loadState();
  const recent = pruneRecentNotifications(state.recentNotifications, now, windowMs);
  const duplicated = recent.some((entry) => entry && entry.fingerprint === fingerprint);

  if (!duplicated) {
    recent.push({ fingerprint, timestamp: now });
  }

  state.recentNotifications = recent;
  saveState(state);
  return duplicated;
}

module.exports = {
  STATE_PATH,
  markTaskStart,
  consumeTaskStart,
  makeTaskKey,
  loadState,
  checkAndRememberNotification
};
