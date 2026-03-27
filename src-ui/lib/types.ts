export interface AppConfig {
  version: number;
  app: { host: string; port: number };
  format: { includeSourcePrefixInTitle: boolean };
  summary: {
    enabled: boolean;
    provider: string;
    apiUrl: string;
    apiKey: string;
    model: string;
    timeoutMs: number;
    maxTokens: number;
    prompt: string;
  };
  ui: {
    language: string;
    closeBehavior: 'ask' | 'tray' | 'exit';
    autostart: boolean;
    silentStart: boolean;
    watchLogRetentionDays: number;
    autoFocusOnNotify: boolean;
    forceMaximizeOnFocus: boolean;
    focusTarget: 'auto' | 'vscode' | 'terminal';
    confirmAlert: { enabled: boolean };
    notificationMode: 'watch' | 'hooks';
  };
  channels: {
    webhook: {
      enabled: boolean;
      urls: string[];
      urlsEnv: string;
      useFeishuCard: boolean;
      useFeishuCardEnv: string;
      cardTemplatePath: string;
    };
    telegram: {
      enabled: boolean;
      botToken: string;
      chatId: string;
      botTokenEnv: string;
      chatIdEnv: string;
      proxyUrl: string;
      proxyEnvCandidates: string[];
    };
    sound: {
      enabled: boolean;
      tts: boolean;
      fallbackBeep: boolean;
      useCustom: boolean;
      customPath: string;
    };
    desktop: {
      enabled: boolean;
      balloonMs: number;
    };
    email: {
      enabled: boolean;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
      to: string;
      hostEnv: string;
      portEnv: string;
      secureEnv: string;
      userEnv: string;
      passEnv: string;
      fromEnv: string;
      toEnv: string;
    };
  };
  sources: Record<
    string,
    {
      enabled: boolean;
      minDurationMinutes: number;
      channels: Record<string, boolean>;
    }
  >;
}

export interface HookStatus {
  claude: { installed: boolean; settingsPath: string };
  gemini: { installed: boolean; settingsPath: string };
  opencode: { installed: boolean; settingsPath: string };
}

export interface WatchPayload {
  sources: string;
  intervalMs: number;
  geminiQuietMs: number;
  claudeQuietMs: number;
}

export type ChannelKey = 'webhook' | 'telegram' | 'desktop' | 'sound' | 'email';
export type SourceKey = 'claude' | 'codex' | 'opencode' | 'gemini';

export const CHANNELS: { key: ChannelKey; titleKey: string; descKey: string }[] = [
  { key: 'webhook', titleKey: 'channel.webhook', descKey: 'channel.webhook.desc' },
  { key: 'telegram', titleKey: 'channel.telegram', descKey: 'channel.telegram.desc' },
  { key: 'desktop', titleKey: 'channel.desktop', descKey: 'channel.desktop.desc' },
  { key: 'sound', titleKey: 'channel.sound', descKey: 'channel.sound.desc' },
  { key: 'email', titleKey: 'channel.email', descKey: 'channel.email.desc' },
];

export const SOURCES: { key: SourceKey; titleKey: string; descKey: string }[] = [
  { key: 'claude', titleKey: 'source.claude', descKey: 'source.claude.desc' },
  { key: 'codex', titleKey: 'source.codex', descKey: 'source.codex.desc' },
  { key: 'opencode', titleKey: 'source.opencode', descKey: 'source.opencode.desc' },
  { key: 'gemini', titleKey: 'source.gemini', descKey: 'source.gemini.desc' },
];
