const DEFAULT_CONFIG = {
  version: 2,
  app: {
    host: '127.0.0.1',
    port: 3210
  },
  format: {
    includeSourcePrefixInTitle: true
  },
  summary: {
    enabled: false,
    provider: 'openai',
    apiUrl: '',
    apiKey: '',
    model: '',
    timeoutMs: 15000,
    maxTokens: 200,
    prompt: ''
  },
  ui: {
    language: 'zh-CN',
    closeBehavior: 'ask', // ask | tray | exit
    autostart: false,
    watchLogRetentionDays: 7
  },
  channels: {
    webhook: {
      enabled: true,
      urls: [],
      urlsEnv: 'WEBHOOK_URLS', // 逗号分隔，可配置多个
      useFeishuCard: false, // 是否使用飞书卡片格式
      cardTemplatePath: '' // 自定义卡片模板路径(可选)
    },
    telegram: {
      enabled: true,
      botToken: '',
      chatId: '',
      botTokenEnv: 'TELEGRAM_BOT_TOKEN',
      chatIdEnv: 'TELEGRAM_CHAT_ID',
      proxyUrl: '',
      proxyEnvCandidates: ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy']
    },
    sound: {
      enabled: true,
      tts: true,
      fallbackBeep: true
    },
    desktop: {
      enabled: true,
      balloonMs: 6000
    },
    email: {
      enabled: false,
      host: '',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      from: '',
      to: '',
      hostEnv: 'EMAIL_HOST',
      portEnv: 'EMAIL_PORT',
      secureEnv: 'EMAIL_SECURE',
      userEnv: 'EMAIL_USER',
      passEnv: 'EMAIL_PASS',
      fromEnv: 'EMAIL_FROM',
      toEnv: 'EMAIL_TO'
    }
  },
  sources: {
    claude: {
      enabled: true,
      minDurationMinutes: 0,
      channels: {
        webhook: true,
        telegram: false,
        sound: true,
        desktop: true,
        email: false
      }
    },
    codex: {
      enabled: true,
      minDurationMinutes: 0,
      channels: {
        webhook: true,
        telegram: false,
        sound: true,
        desktop: true,
        email: false
      }
    },
    gemini: {
      enabled: true,
      minDurationMinutes: 0,
      channels: {
        webhook: true,
        telegram: false,
        sound: true,
        desktop: true,
        email: false
      }
    }
  }
};

module.exports = {
  DEFAULT_CONFIG
};
