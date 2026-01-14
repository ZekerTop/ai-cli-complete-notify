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
  getEnvPathCandidates
};
