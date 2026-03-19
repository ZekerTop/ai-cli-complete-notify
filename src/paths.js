const os = require('os');
const path = require('path');

const PRODUCT_NAME = 'ai-cli-complete-notify';
const DATA_DIR_ENV = [
  'AI_CLI_COMPLETE_NOTIFY_DATA_DIR',
  'AICLI_COMPLETE_NOTIFY_DATA_DIR',
  'TASKPULSE_DATA_DIR',
  'AI_REMINDER_DATA_DIR'
];

function pickFirstEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function getDataDir() {
  const override = pickFirstEnv(DATA_DIR_ENV);
  if (override) return path.resolve(override);

  const appData = process.env.APPDATA;
  if (appData) return path.join(appData, PRODUCT_NAME);

  return path.join(os.homedir(), `.${PRODUCT_NAME.toLowerCase()}`);
}

function getSettingsPath() {
  return path.join(getDataDir(), 'settings.json');
}

function getStatePath() {
  return path.join(getDataDir(), 'state.json');
}

function getWatchLogsDir() {
  return path.join(getDataDir(), 'watch-logs');
}

function formatWatchLogDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWatchLogPath(date = new Date()) {
  return path.join(getWatchLogsDir(), `watch-${formatWatchLogDate(date)}.log`);
}

function getLatestWatchLogPath() {
  const logDir = getWatchLogsDir();
  let fs;
  try {
    fs = require('fs');
  } catch (_error) {
    return '';
  }

  try {
    if (!fs.existsSync(logDir)) return '';
    const files = fs
      .readdirSync(logDir, { withFileTypes: true })
      .filter((entry) => entry && entry.isFile() && /^watch-\d{4}-\d{2}-\d{2}\.log$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));
    if (files.length === 0) return '';
    return path.join(logDir, files[0]);
  } catch (_error) {
    return '';
  }
}

function getEnvPathCandidates() {
  const candidates = [];

  try {
    // Prefer next to the executable (dist 目录第一层)
    candidates.push(path.join(path.dirname(process.execPath), '.env'));
  } catch (error) {
    // ignore
  }

  // 然后尝试当前工作目录（便于 dev）
  candidates.push(path.join(process.cwd(), '.env'));

  // 最后尝试数据目录
  candidates.push(path.join(getDataDir(), '.env'));

  return candidates;
}

module.exports = {
  PRODUCT_NAME,
  getDataDir,
  getSettingsPath,
  getStatePath,
  getWatchLogsDir,
  getWatchLogPath,
  getLatestWatchLogPath,
  getEnvPathCandidates
};
