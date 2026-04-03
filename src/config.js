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

function hasExplicitBoolean(config, pathParts) {
  let current = config;
  for (let index = 0; index < pathParts.length - 1; index += 1) {
    const key = pathParts[index];
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, key)) {
      return false;
    }
    current = current[key];
  }

  const lastKey = pathParts[pathParts.length - 1];
  return Boolean(
    current
      && typeof current === 'object'
      && Object.prototype.hasOwnProperty.call(current, lastKey)
      && typeof current[lastKey] === 'boolean'
  );
}

function applyEnvOverrides(config, rawConfig) {
  const notificationEnabled = parseEnvBoolean(process.env.NOTIFICATION_ENABLED);
  if (notificationEnabled !== undefined) {
    if (config.channels.webhook && !hasExplicitBoolean(rawConfig, ['channels', 'webhook', 'enabled'])) {
      config.channels.webhook.enabled = notificationEnabled;
    }
    if (config.channels.telegram && !hasExplicitBoolean(rawConfig, ['channels', 'telegram', 'enabled'])) {
      config.channels.telegram.enabled = notificationEnabled;
    }
    if (config.channels.email && !hasExplicitBoolean(rawConfig, ['channels', 'email', 'enabled'])) {
      config.channels.email.enabled = notificationEnabled;
    }
  }

  const soundEnabled = parseEnvBoolean(process.env.SOUND_ENABLED);
  if (soundEnabled !== undefined && config.channels.sound && !hasExplicitBoolean(rawConfig, ['channels', 'sound', 'enabled'])) {
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
      // Be tolerant of UTF-8 BOM and Windows editors that may write UTF-16.
      const buf = fs.readFileSync(SETTINGS_PATH);
      if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
        const content = buf.slice(2).toString('utf16le').replace(/^\uFEFF/, '');
        return JSON.parse(content);
      }
      if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
        const swapped = Buffer.alloc(Math.max(0, buf.length - 2));
        for (let i = 2; i + 1 < buf.length; i += 2) {
          swapped[i - 2] = buf[i + 1];
          swapped[i - 1] = buf[i];
        }
        const content = swapped.toString('utf16le').replace(/^\uFEFF/, '');
        return JSON.parse(content);
      }

      const content = buf.toString('utf8').replace(/^\uFEFF/, '');
      return JSON.parse(content);
    }

    // 兼容：旧版本可能在项目根目录有 config.json
    const legacyPath = path.join(__dirname, '..', 'config.json');
    if (!fs.existsSync(legacyPath)) return null;
    const content = fs.readFileSync(legacyPath, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function loadConfig() {
  const rawConfig = loadRawConfig();
  return applyEnvOverrides(normalizeConfig(rawConfig), rawConfig);
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
