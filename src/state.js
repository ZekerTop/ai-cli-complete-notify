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
    if (!fs.existsSync(STATE_PATH)) return { tasks: {} };
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { tasks: {} };
    if (!parsed.tasks || typeof parsed.tasks !== 'object') return { tasks: {} };
    return parsed;
  } catch (error) {
    return { tasks: {} };
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

module.exports = {
  STATE_PATH,
  markTaskStart,
  consumeTaskStart,
  makeTaskKey,
  loadState
};
