const fs = require('fs');
const path = require('path');
const { getDataDir, getPrimaryEnvPath, getEnvPathCandidates } = require('./paths');

const ENV_PATH_ENV = [
  'AI_CLI_COMPLETE_NOTIFY_ENV_PATH',
  'AICLI_COMPLETE_NOTIFY_ENV_PATH',
  'TASKPULSE_ENV_PATH',
  'AI_REMINDER_ENV_PATH'
];

const FALLBACK_ENV_EXAMPLE = `# ai-cli-complete-notify environment config
# Copy this file to .env and fill in the notification settings you need.

NOTIFICATION_ENABLED=true
SOUND_ENABLED=true

# Webhook URLs for Feishu / DingTalk / WeCom. Separate multiple URLs with commas.
WEBHOOK_URLS=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Gotify (self-hosted push notifications)
# GOTIFY_URL=https://gotify.example.com
# GOTIFY_APP_TOKEN=your_app_token

# Email
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=465
# EMAIL_SECURE=true
# EMAIL_USER=bot@example.com
# EMAIL_PASS=your_smtp_password
# EMAIL_FROM=AI Notify <bot@example.com>
# EMAIL_TO=your@email.com

# AI summary
# SUMMARY_ENABLED=false
# SUMMARY_API_URL=https://api.openai.com
# SUMMARY_API_KEY=
# SUMMARY_MODEL=gpt-4o-mini
`;

const WINDOWS_PATH_EXAMPLE = [
  '# 可选：数据目录/环境文件路径（便于 EXE 版固定存放位置）',
  '# AI_CLI_COMPLETE_NOTIFY_DATA_DIR=C:\\Users\\YourName\\AppData\\Roaming\\ai-cli-complete-notify',
  '# AI_CLI_COMPLETE_NOTIFY_ENV_PATH=C:\\Users\\YourName\\AppData\\Roaming\\ai-cli-complete-notify\\.env'
].join('\n');

const MACOS_PATH_EXAMPLE = [
  '# 可选：数据目录/环境文件路径（macOS 打包版默认使用下面这个目录）',
  '# AI_CLI_COMPLETE_NOTIFY_DATA_DIR=/Users/yourname/.ai-cli-complete-notify',
  '# AI_CLI_COMPLETE_NOTIFY_ENV_PATH=/Users/yourname/.ai-cli-complete-notify/.env'
].join('\n');

function pickFirstEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function exists(filePath) {
  try {
    return Boolean(filePath) && fs.existsSync(filePath);
  } catch (_error) {
    return false;
  }
}

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean))];
}

function isPackagedRuntime() {
  if (process.pkg) return true;
  if (String(process.env.AI_CLI_COMPLETE_NOTIFY_PACKAGED || '') === '1') return true;
  return false;
}

function formatTemplateForRuntime(content) {
  if (process.platform === 'darwin' && isPackagedRuntime()) {
    return content.replace(WINDOWS_PATH_EXAMPLE, MACOS_PATH_EXAMPLE);
  }
  return content;
}

function getTemplateContent() {
  const candidates = [
    path.join(__dirname, '..', '.env.example'),
    path.join(process.cwd(), '.env.example')
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return formatTemplateForRuntime(fs.readFileSync(candidate, 'utf8'));
    } catch (_error) {
      // ignore and try fallback
    }
  }

  return formatTemplateForRuntime(FALLBACK_ENV_EXAMPLE);
}

function getRecommendedEnvPath(explicitPath, envCandidates) {
  if (explicitPath) return explicitPath;
  if (isPackagedRuntime()) return envCandidates[0] || getPrimaryEnvPath();
  return path.join(process.cwd(), '.env');
}

function getEnvSetupStatus(options = {}) {
  const createExample = Boolean(options.createExample);
  const explicit = pickFirstEnv(ENV_PATH_ENV);
  const explicitPath = explicit ? path.resolve(explicit) : '';
  const envCandidates = uniquePaths([
    explicitPath,
    ...getEnvPathCandidates(),
    path.join(__dirname, '..', '.env')
  ]);
  const recommendedEnvPath = getRecommendedEnvPath(explicitPath, envCandidates);
  const examplePath = path.join(path.dirname(recommendedEnvPath), '.env.example');
  const loadedEnvPath = envCandidates.find((candidate) => exists(candidate)) || '';
  const envExists = Boolean(loadedEnvPath);
  let exampleCreated = false;
  let exampleExists = exists(examplePath);
  let error = '';

  if (!envExists && createExample && !exampleExists) {
    try {
      fs.mkdirSync(path.dirname(examplePath), { recursive: true });
      fs.writeFileSync(examplePath, getTemplateContent(), 'utf8');
      exampleCreated = true;
      exampleExists = true;
    } catch (err) {
      error = err && err.message ? err.message : String(err);
    }
  }

  return {
    ok: !error,
    status: envExists ? 'loaded' : 'missing',
    dataDir: getDataDir(),
    envPath: recommendedEnvPath,
    loadedEnvPath,
    envExists,
    examplePath,
    exampleExists,
    exampleCreated,
    error
  };
}

module.exports = {
  formatTemplateForRuntime,
  getEnvSetupStatus
};
