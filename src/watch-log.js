const fs = require('fs');
const path = require('path');

const { getWatchLogsDir, getWatchLogPath } = require('./paths');

function ensureLogDir() {
  const dir = getWatchLogsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function toRetentionDays(value) {
  const days = Number(value);
  if (!Number.isFinite(days) || days < 1) return 7;
  return Math.max(1, Math.floor(days));
}

function formatTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function pruneWatchLogs(retentionDays) {
  const dir = ensureLogDir();
  const keepDays = toRetentionDays(retentionDays);
  const cutoffMs = Date.now() - keepDays * 24 * 60 * 60 * 1000;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry || !entry.isFile() || !/^watch-\d{4}-\d{2}-\d{2}\.log$/i.test(entry.name)) continue;
    const filePath = path.join(dir, entry.name);
    try {
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < cutoffMs) {
        fs.unlinkSync(filePath);
      }
    } catch (_error) {
      // ignore individual prune failures
    }
  }
}

function createWatchLogWriter(retentionDays) {
  let currentPath = '';
  let stream = null;

  function refreshStream(date = new Date()) {
    const nextPath = getWatchLogPath(date);
    if (nextPath === currentPath && stream) return;

    if (stream) {
      stream.end();
      stream = null;
    }

    ensureLogDir();
    currentPath = nextPath;
    stream = fs.createWriteStream(currentPath, { flags: 'a' });
  }

  function writeLine(line, date = new Date()) {
    try {
      refreshStream(date);
      if (!stream) return;
      const text = String(line == null ? '' : line);
      const lines = text.split(/\r?\n/).filter((item) => item.trim() !== '');
      if (lines.length === 0) return;
      for (const item of lines) {
        stream.write(`[${formatTimestamp(date)}] ${item}\n`);
      }
    } catch (_error) {
      // ignore log persistence failures so watch stays alive
    }
  }

  pruneWatchLogs(retentionDays);
  refreshStream();

  return {
    writeLine,
    close() {
      if (!stream) return;
      stream.end();
      stream = null;
    },
    getCurrentPath() {
      refreshStream();
      return currentPath;
    }
  };
}

module.exports = {
  createWatchLogWriter
};
