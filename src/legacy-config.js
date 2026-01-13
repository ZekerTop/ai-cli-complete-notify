const { DEFAULT_CONFIG } = require('./default-config');

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function migrateLegacyConfig(legacyConfig) {
  const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

  if (legacyConfig && legacyConfig.app && typeof legacyConfig.app === 'object') {
    if (typeof legacyConfig.app.name === 'string') config.app.name = legacyConfig.app.name;
    if (typeof legacyConfig.app.version === 'string') config.app.version = legacyConfig.app.version;
    if (typeof legacyConfig.app.description === 'string') config.app.description = legacyConfig.app.description;
  }

  const notification = legacyConfig && legacyConfig.notification && typeof legacyConfig.notification === 'object'
    ? legacyConfig.notification
    : null;

  if (!notification) return config;

  const feishuEnabled = coerceBoolean(notification.feishu && notification.feishu.enabled);
  const telegramEnabled = coerceBoolean(notification.telegram && notification.telegram.enabled);
  const soundEnabled = coerceBoolean(notification.sound && notification.sound.enabled);

  // Map old Feishu flag to the new generic webhook channel
  if (feishuEnabled !== undefined) config.sources.claude.channels.webhook = feishuEnabled;
  if (telegramEnabled !== undefined) config.sources.claude.channels.telegram = telegramEnabled;
  if (soundEnabled !== undefined) config.sources.claude.channels.sound = soundEnabled;

  // Migrate legacy Feishu webhook URL into generic webhook URLs (env vars still take precedence)
  if (notification.feishu && typeof notification.feishu.webhook_url === 'string' && notification.feishu.webhook_url.trim()) {
    const url = notification.feishu.webhook_url.trim();
    if (!Array.isArray(config.channels.webhook.urls) || config.channels.webhook.urls.length === 0) {
      config.channels.webhook.urls = [url];
    }
  }

  return config;
}

module.exports = {
  migrateLegacyConfig
};
