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
    timeoutMs: 30000,
    maxTokens: 200,
    prompt: ''
  },
  ui: {
    language: 'zh-CN',
    closeBehavior: 'ask', // ask | tray | exit
    autostart: false,
    silentStart: false,
    watchLogRetentionDays: 7,
    autoFocusOnNotify: false,
    forceMaximizeOnFocus: false,
    focusTarget: 'auto', // auto | vscode | terminal
    confirmAlert: {
      enabled: false
    },
    // 'hooks' = hybrid: Claude/Gemini/OpenCode prefer hooks/plugins, Codex uses watch;
//           both paths may fire and content-based dedupe collapses duplicates.
// 'watch' = watch-only for Claude/Gemini (installed hooks are suppressed);
//           OpenCode still uses its plugin (no watch path); Codex stays on watch.
    notificationMode: 'hooks'
  },
  channels: {
    webhook: {
      enabled: true,
      urls: [],
      urlsEnv: 'WEBHOOK_URLS', // 逗号分隔，可配置多个
      useFeishuCard: false, // 是否使用飞书卡片格式
      useFeishuCardEnv: 'WEBHOOK_USE_FEISHU_CARD', // .env 优先开关
      includeOutputWhenSummary: false, // webhook 在摘要成功时是否附带原始输出
      includeOutputWhenSummaryEnv: 'WEBHOOK_INCLUDE_OUTPUT_WHEN_SUMMARY',
      outputMaxLength: 3000, // 非卡片 webhook 输出内容最大字符数
      outputMaxLengthEnv: 'WEBHOOK_OUTPUT_MAX_LENGTH',
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
      fallbackBeep: true,
      useCustom: false,
      customPath: ''
    },
    desktop: {
      enabled: true,
      balloonMs: 3000
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
    },
    gotify: {
      enabled: false,
      url: '',
      urlEnv: 'GOTIFY_URL',
      appToken: '',
      appTokenEnv: 'GOTIFY_APP_TOKEN',
      priority: {
        complete: 5,
        confirm: 8,
        error: 10
      }
    }
  },
  sources: {
    claude: {
      enabled: true,
      minDurationMinutes: 0,
      onlyInteractive: true,
      channels: {
        webhook: true,
        telegram: false,
        sound: true,
        desktop: true,
        email: false,
        gotify: false
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
        email: false,
        gotify: false
      }
    },
    opencode: {
      enabled: true,
      minDurationMinutes: 0,
      channels: {
        webhook: true,
        telegram: false,
        sound: true,
        desktop: true,
        email: false,
        gotify: false
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
        email: false,
        gotify: false
      }
    }
  }
};

module.exports = {
  DEFAULT_CONFIG
};
