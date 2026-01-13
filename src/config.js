const fs = require('fs');
const path = require('path');
const { DEFAULT_CONFIG } = require('./default-config');
const { migrateLegacyConfig } = require('./legacy-config');
const { getSettingsPath, getDataDir } = require('./paths');

const SETTINGS_PATH = getSettingsPath();

function ensureDataDir() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseEnvBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

function applyEnvOverrides(config) {
  const notificationEnabled = parseEnvBoolean(process.env.NOTIFICATION_ENABLED);
  if (notificationEnabled !== undefined) {
    if (config.channels.webhook) config.channels.webhook.enabled = notificationEnabled;
    config.channels.telegram.enabled = notificationEnabled;
    if (config.channels.email) config.channels.email.enabled = notificationEnabled;
  }

  const soundEnabled = parseEnvBoolean(process.env.SOUND_ENABLED);
  if (soundEnabled !== undefined) {
    config.channels.sound.enabled = soundEnabled;
  }

  return config;
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const output = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      output[key] = deepMerge(base[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function normalizeConfig(rawConfig) {
  if (rawConfig && rawConfig.version === 2) {
    const merged = deepMerge(DEFAULT_CONFIG, rawConfig);

    // 兼容旧版配置中单独的飞书开关，将其迁移到通用 webhook
    if (rawConfig.channels && rawConfig.channels.feishu) {
      const feishuCfg = rawConfig.channels.feishu;
      if (merged.channels.webhook) {
        if (typeof feishuCfg.enabled === 'boolean' && rawConfig.channels.webhook === undefined) {
          merged.channels.webhook.enabled = feishuCfg.enabled;
        }
        if (feishuCfg.webhookUrl && (!merged.channels.webhook.urls || merged.channels.webhook.urls.length === 0)) {
          merged.channels.webhook.urls = [String(feishuCfg.webhookUrl).trim()];
        }
      }
    }

    if (rawConfig.sources && typeof rawConfig.sources === 'object') {
      for (const [name, sourceCfg] of Object.entries(rawConfig.sources)) {
        if (sourceCfg && sourceCfg.channels && Object.prototype.hasOwnProperty.call(sourceCfg.channels, 'feishu')) {
          if (!merged.sources[name]) merged.sources[name] = { enabled: true, minDurationMinutes: 0, channels: {} };
          merged.sources[name].channels.webhook = sourceCfg.channels.feishu;
        }
      }
    }

    return merged;
  }
  return migrateLegacyConfig(rawConfig || {});
}

function loadRawConfig() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const content = fs.readFileSync(SETTINGS_PATH, 'utf8');
      return JSON.parse(content);
    }

    // 兼容：旧版本可能在项目根目录有 config.json
    const legacyPath = path.join(__dirname, '..', 'config.json');
    if (!fs.existsSync(legacyPath)) return null;
    const content = fs.readFileSync(legacyPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function loadConfig() {
  return applyEnvOverrides(normalizeConfig(loadRawConfig()));
}

function saveConfig(config) {
  const normalized = normalizeConfig(config);
  ensureDataDir();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

function getConfigPath() {
  return SETTINGS_PATH;
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfigPath,
  normalizeConfig
};
