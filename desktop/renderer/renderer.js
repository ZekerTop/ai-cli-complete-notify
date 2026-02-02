const CHANNELS = [
  { key: 'webhook', titleKey: 'channel.webhook', descKey: 'channel.webhook.desc' },
  { key: 'telegram', titleKey: 'channel.telegram', descKey: 'channel.telegram.desc' },
  { key: 'desktop', titleKey: 'channel.desktop', descKey: 'channel.desktop.desc' },
  { key: 'sound', titleKey: 'channel.sound', descKey: 'channel.sound.desc' },
  { key: 'email', titleKey: 'channel.email', descKey: 'channel.email.desc' }
];

const SOURCES = [
  { key: 'claude', titleKey: 'source.claude', descKey: 'source.claude.desc' },
  { key: 'codex', titleKey: 'source.codex', descKey: 'source.codex.desc' },
  { key: 'gemini', titleKey: 'source.gemini', descKey: 'source.gemini.desc' }
];

const SUPPORTED_LANGUAGES = ['zh-CN', 'en'];

const I18N = {
  'zh-CN': {
    'brand.subtitle': "\u591a\u79cd AI CLI \u4efb\u52a1\u5b8c\u6210\u63d0\u9192",
    'nav.channels': "\u901a\u9053",
    'nav.sources': "\u6765\u6e90",
    'nav.watch': "\u76d1\u542c",
    'nav.test': "\u6d4b\u8bd5",
    'nav.summary': "AI \u6458\u8981",
    'nav.advanced': "\u9ad8\u7ea7",
    'ui.language': "\u8bed\u8a00",
    'ui.watchToggle': "\u76d1\u542c",
    'ui.stepUp': "\u589e\u52a0",
    'ui.stepDown': "\u51cf\u5c11",
    'btn.projectLink': "\u9879\u76ee\u5730\u5740",
    'btn.openDataDir': "\u6253\u5f00\u6570\u636e\u76ee\u5f55",
    'btn.openSettings': "\u6253\u5f00 settings.json",
    'btn.openWatchLog': "\u6253\u5f00\u65e5\u5fd7",
    'hint.openDataDir': "\u6570\u636e\u76ee\u5f55\u7528\u4e8e\u4fdd\u5b58 settings.json\u3001state.json \u548c .env\uff08\u53ef\u9009\uff09",
    'btn.save': "\u4fdd\u5b58",
    'btn.reload': "\u5237\u65b0\u754c\u9762/\u914d\u7f6e",
    'btn.watchStart': "\u5f00\u59cb\u76d1\u542c",
    'btn.watchStop': "\u505c\u6b62",
    'btn.send': "\u53d1\u9001",
    'section.channels.title': "\u5168\u5c40\u901a\u9053",
    'section.channels.sub': "\u5168\u5c40\u5f00\u5173 + \u6bcf\u6765\u6e90\u5f00\u5173\u540c\u65f6\u751f\u6548",
    'section.sources.title': "\u6765\u6e90\u914d\u7f6e",
    'section.sources.sub': "\u6309\u6765\u6e90\u72ec\u7acb\u63a7\u5236\uff1a\u542f\u7528\u3001\u9608\u503c\u3001\u5404\u901a\u9053\u5f00\u5173",
    'section.watch.title': "\u4ea4\u4e92\u5f0f\u76d1\u542c\uff08watch\uff09",
    'section.watch.sub': "\u9002\u7528\u4e8e\u4ea4\u4e92\u5f0f\u4e0d\u9000\u51fa / VSCode \u63d2\u4ef6\uff1a\u81ea\u52a8\u76d1\u542c\u65e5\u5fd7\uff0c\u5728\u6bcf\u6b21\u56de\u590d\u5b8c\u6210\u540e\u63d0\u9192",
    'section.test.title': "\u6d4b\u8bd5\u63d0\u9192",
    'section.test.sub': "\u7528\u4e8e\u9a8c\u8bc1\u901a\u9053\u662f\u5426\u53ef\u7528\uff08\u5f3a\u5236\u53d1\u9001\uff0c\u4e0d\u53d7\u9608\u503c\u5f71\u54cd\uff09",
    'section.summary.title': "AI \u6458\u8981",
    'section.summary.sub': "\u7528\u4e8e\u751f\u6210\u901a\u77e5\u4e2d\u7684\u7b80\u77ed\u6458\u8981\uff0c\u672a\u5728\u8d85\u65f6\u5185\u8fd4\u56de\u5219\u4f7f\u7528\u539f\u59cb\u4efb\u52a1\u63cf\u8ff0\u3002",
    'section.advanced.title': "\u9ad8\u7ea7",
    'section.advanced.sub': "\u683c\u5f0f\u5316\u4e0e\u5c55\u793a\u76f8\u5173\u914d\u7f6e",
    'watch.polling': "\u8f6e\u8be2(ms)",
    'watch.claudeDebounce': "Claude \u53bb\u6296(ms)",
    'watch.debounce': "Gemini \u53bb\u6296(ms)",
    'watch.logRetention': "\u65e5\u5fd7\u4fdd\u7559(\u5929)",
    'watch.logRetentionHint': "\u53ea\u4fdd\u7559\u6700\u8fd1 N \u5929\u7684\u672c\u5730\u76d1\u542c\u65e5\u5fd7",
    'watch.hint': "\u5efa\u8bae\u628a\u76d1\u542c\u5e38\u9a7b\u5f00\u542f\uff08\u6bd4\u5982\u5f00\u673a\u81ea\u542f/\u653e\u5728\u540e\u53f0\u7ec8\u7aef\uff09\uff0c\u8fd9\u6837\u65e0\u8bba\u4f60\u5728\u7ec8\u7aef\u8fd8\u662f VSCode \u91cc\u7528 Claude/Codex/Gemini\uff0c\u90fd\u80fd\u81ea\u52a8\u63d0\u9192\u3002",
    'watch.logs': "\u76d1\u542c\u65e5\u5fd7",
    'watch.status.running': "\u8fd0\u884c\u4e2d",
    'watch.status.stopped': "\u672a\u8fd0\u884c",
    'watch.logNotReady': "\u5c1a\u672a\u5b9a\u4f4d\u5230\u65e5\u5fd7\u6587\u4ef6",
    'watch.logOpenFailed': "\u6253\u5f00\u65e5\u5fd7\u6587\u4ef6\u5931\u8d25",
    'test.source': "\u6765\u6e90",
    'test.duration': "\u8017\u65f6(\u5206\u949f)",
    'test.message': "\u5185\u5bb9",
    'test.defaultTask': "\u6d4b\u8bd5\u63d0\u9192\uff08\u5f3a\u5236\u53d1\u9001\uff09",
    'test.fallbackTask': "\u6d4b\u8bd5\u63d0\u9192",
    'summary.enabled': "\u542f\u7528 AI \u6458\u8981",
    'summary.provider': "\u6a21\u578b\u5e73\u53f0",
    'summary.provider.openai': "OpenAI",
    'summary.provider.anthropic': "Anthropic",
    'summary.provider.google': "Google / Gemini",
    'summary.provider.qwen': "\u901a\u4e49\u5343\u95ee",
    'summary.provider.deepseek': "DeepSeek",
    'summary.apiUrl': "API URL",
    'summary.apiUrlExample': "\u793a\u4f8b",
    'summary.apiKey': "API Key",
    'summary.apiKeyToggle.show': "\u663e\u793a API Key",
    'summary.apiKeyToggle.hide': "\u9690\u85cf API Key",
    'summary.test': "\u6458\u8981\u6d4b\u8bd5",
    'summary.testBtn': "\u5f00\u59cb\u6d4b\u8bd5",
    'summary.test.running': "\u6d4b\u8bd5\u4e2d...",
    'summary.test.success': "\u6d4b\u8bd5\u6210\u529f",
    'summary.test.fail': "\u6d4b\u8bd5\u5931\u8d25",
    'summary.test.missingApiUrl': "\u8bf7\u586b\u5199 API URL",
    'summary.test.missingApiKey': "\u8bf7\u586b\u5199 API Key",
    'summary.test.missingModel': "\u8bf7\u586b\u5199\u6a21\u578b",
    'summary.test.emptySummary': "\u672a\u8fd4\u56de\u6458\u8981\uff0c\u8bf7\u68c0\u67e5 API URL/Key/\u6a21\u578b",
    'summary.test.httpError': "HTTP \u8bf7\u6c42\u5931\u8d25",
    'summary.test.timeout': "\u8bf7\u6c42\u8d85\u65f6",
    'summary.test.networkError': "\u7f51\u7edc\u9519\u8bef",
    'summary.test.invalidJson': "\u54cd\u5e94\u4e0d\u662f\u5408\u6cd5 JSON",
    'summary.test.emptyContent': "\u6458\u8981\u4e0a\u4e0b\u6587\u4e3a\u7a7a",
    'summary.test.disabled': "\u6458\u8981\u672a\u542f\u7528",
    'summary.test.invalidRequest': "\u8bf7\u6c42\u53c2\u6570\u65e0\u6548",
    'summary.test.unexpected': "\u672a\u77e5\u9519\u8bef",
    'summary.test.unsupported': "\u5f53\u524d\u7248\u672c\u6682\u4e0d\u652f\u6301\u6458\u8981\u6d4b\u8bd5",
    'summary.model': "\u6a21\u578b",
    'summary.timeout': "\u8d85\u65f6(ms)",
    'summary.timeoutHint': "\u8d85\u8fc7\u65f6\u9650\u4f1a\u81ea\u52a8\u56de\u9000\u5230\u9ed8\u8ba4\u4efb\u52a1\u63cf\u8ff0",
    'summary.hint': "\u586b\u5199 API \u4fe1\u606f\u540e\u5373\u53ef\u751f\u6548\uff0c\u672a\u8fd4\u56de\u6458\u8981\u65f6\u4f1a\u81ea\u52a8\u56de\u9000\u3002",
    'advanced.titlePrefix': "\u6807\u9898\u5305\u542b\u6765\u6e90\u524d\u7f00\uff08\u4f8b\u5982 [Codex]\uff09",
    'advanced.useFeishuCard': "Webhook \u4f7f\u7528\u98de\u4e66\u5361\u7247\u683c\u5f0f",
    'advanced.closeBehavior': "\u5173\u95ed\u6309\u94ae\u884c\u4e3a",
    'advanced.closeHint': "\u9009\u62e9\u201c\u9690\u85cf\u5230\u6258\u76d8\u201d\u540e\uff0c\u70b9\u51fb\u53f3\u4e0a\u89d2\u5173\u95ed\u4e0d\u4f1a\u9000\u51fa\uff0c\u4f1a\u5728\u53f3\u4e0b\u89d2\u6258\u76d8\u4fdd\u7559\u56fe\u6807\uff0c\u70b9\u51fb\u5373\u53ef\u91cd\u65b0\u6253\u5f00\u3002",
    'advanced.autostart': "\u5f00\u673a\u81ea\u542f\u52a8\uff08\u767b\u5f55\u540e\u81ea\u52a8\u5728\u540e\u53f0\u8fd0\u884c\uff09",
    'advanced.autostartHint': "Windows / macOS \u652f\u6301\u5f00\u673a\u81ea\u542f\u52a8\uff1bLinux \u9700\u81ea\u884c\u914d\u7f6e\u3002",
    'close.message': "\u5173\u95ed\u5e94\u7528\uff1f",
    'close.detail': "\u53ef\u9009\u62e9\u9690\u85cf\u5230\u6258\u76d8\u7ee7\u7eed\u8fd0\u884c\uff0c\u6216\u76f4\u63a5\u9000\u51fa\u5e76\u505c\u6b62\u76d1\u542c\u3002",
    'close.hide': "\u9690\u85cf\u5230\u6258\u76d8",
    'close.quit': "\u9000\u51fa",
    'close.cancel': "\u53d6\u6d88",
    'close.remember': "\u8bb0\u4f4f\u6211\u7684\u9009\u62e9\uff08\u53ef\u5728\u201c\u9ad8\u7ea7\u201d\u91cc\u4fee\u6539\uff09",
    'close.ask': "\u6bcf\u6b21\u8be2\u95ee",
    'close.tray': "\u9690\u85cf\u5230\u6258\u76d8",
    'close.exit': "\u76f4\u63a5\u9000\u51fa",
    'channel.webhook': "Webhook",
    'channel.webhook.desc': "\u901a\u7528 Webhook\uff08\u9ed8\u8ba4\u98de\u4e66\u683c\u5f0f\uff0c\u53ef\u586b\u591a\u4e2a URL\uff09",
    'channel.telegram': "Telegram",
    'channel.telegram.desc': "Bot \u6d88\u606f\u63a8\u9001\uff08\u53ef\u9009\u4ee3\u7406\uff09",
    'channel.desktop': "\u684c\u9762\u901a\u77e5",
    'channel.desktop.desc': "Windows \u6c14\u6ce1\u63d0\u793a",
    'channel.sound': "\u58f0\u97f3",
    'channel.sound.desc': "\u8bed\u97f3\u64ad\u62a5 / \u8702\u9e23",
    'channel.email': "\u90ae\u4ef6",
    'channel.email.desc': "SMTP \u90ae\u4ef6\u63d0\u9192\uff08\u914d\u7f6e\u5728 .env\uff09",
    'source.claude': "Claude",
    'source.claude.desc': "Claude Code CLI / \u63d2\u4ef6",
    'source.codex': "Codex",
    'source.codex.desc': "Codex CLI / \u63d2\u4ef6",
    'source.gemini': "Gemini",
    'source.gemini.desc': "Gemini CLI / \u63d2\u4ef6",
    'sources.threshold': "\u8d85\u8fc7(\u5206\u949f)\u624d\u63d0\u9192",
    'sources.thresholdHint': "\u5f53\u8017\u65f6\u8d85\u8fc7\u6b64\u503c\u624d\u4f1a\u63d0\u9192\uff1b\u4fee\u6539\u540e\u8bb0\u5f97\u70b9\u51fb\u201c\u4fdd\u5b58\u201d\u3002",
    'hint.saving': "",
    'hint.saved': "",
    'hint.loaded': "",
    'log.testing': "\u53d1\u9001\u6d4b\u8bd5\u63d0\u9192\u4e2d...",
    'nav.sound': "\u63d0\u793a\u97f3",
    'btn.soundTest': "\u64ad\u653e\u6d4b\u8bd5",
    'btn.soundOpenPath': "\u6253\u5f00\u6587\u4ef6",
    'section.sound.title': "\u63d0\u793a\u97f3",
    'section.sound.sub': "\u8bed\u97f3\u64ad\u62a5\u4e0e\u63d0\u793a\u97f3\u8bbe\u7f6e\uff08\u652f\u6301\u81ea\u5b9a\u4e49 .wav\uff09",
    'watch.confirmEnabled': "\u786e\u8ba4\u63d0\u9192",
    'watch.confirmKeywords': "\u786e\u8ba4\u5173\u952e\u8bcd\uff08\u53ef\u9009\uff09",
    'watch.confirmKeywordsPlaceholder': "\u662f\u5426,\u786e\u8ba4,allow,approve",
    'watch.confirmKeywordsHint': "\u7528\u4e8e\u8bc6\u522b AI \u662f\u5426\u5728\u5411\u4f60\u8bf7\u6c42\u786e\u8ba4/\u6388\u6743/\u7ee7\u7eed\u6267\u884c\u3002\u7559\u7a7a\u4f7f\u7528\u5185\u7f6e\u5173\u952e\u8bcd\u5e93\uff1b\u53ef\u7528\u9017\u53f7\u5206\u9694\u81ea\u5b9a\u4e49\u3002",
    'advanced.autoFocus': "\u70b9\u51fb\u901a\u77e5\u5207\u56de\u5de5\u4f5c\u754c\u9762",
    'advanced.forceMaximize': "\u5207\u56de\u65f6\u5f3a\u5236\u6700\u5927\u5316\uff08WSL / \u7ec8\u7aef\u4e5f\u751f\u6548\uff09",
    'advanced.forceMaximizeHint': "\u4efb\u52a1\u6267\u884c\u4e2d\u6700\u5c0f\u5316\u540e\uff0c\u70b9\u51fb\u901a\u77e5\u4f1a\u6062\u590d\u4e3a\u6700\u5927\u5316\u7a97\u53e3\u3002",
    'advanced.focusTarget': "\u5207\u56de\u76ee\u6807",
    'advanced.focusHint': "\u70b9\u51fb\u684c\u9762\u901a\u77e5\u540e\u5c1d\u8bd5\u5207\u56de\uff08\u66f4\u53ef\u9760\uff09\u3002\u7cfb\u7edf\u7126\u70b9\u9650\u5236\u53ef\u80fd\u4ecd\u963b\u6b62\u62a2\u5360\u524d\u53f0\uff1bVSCode \u63d2\u4ef6\u573a\u666f\u5efa\u8bae\u9009 VSCode \u76ee\u6807\u3002",
    'advanced.autostartStatusOn': "\u7cfb\u7edf\u81ea\u542f\u52a8\uff1a\u5df2\u5f00\u542f",
    'advanced.autostartStatusOff': "\u7cfb\u7edf\u81ea\u542f\u52a8\uff1a\u672a\u5f00\u542f",
    'advanced.autostartStatusUnsupported': "\u7cfb\u7edf\u81ea\u542f\u52a8\uff1a\u5f53\u524d\u7cfb\u7edf\u4e0d\u652f\u6301",
    'advanced.autostartStatusUnknown': "\u7cfb\u7edf\u81ea\u542f\u52a8\uff1a\u672a\u77e5",
    'advanced.soundTts': "\u8bed\u97f3\u64ad\u62a5\uff08TTS\uff09",
    'advanced.soundTtsHint': "\u5173\u95ed\u540e\u4ec5\u64ad\u653e\u63d0\u793a\u97f3\u3002",
    'advanced.soundCustom': "\u4f7f\u7528\u81ea\u5b9a\u4e49\u63d0\u793a\u97f3",
    'advanced.soundCustomPath': "\u63d0\u793a\u97f3\u6587\u4ef6\u8def\u5f84",
    'advanced.soundCustomPlaceholder': "C:\\path\\to\\sound.wav \u6216 /mnt/c/...",
    'advanced.soundCustomHint': "\u652f\u6301 .wav\uff0c\u53ef\u9009\u62e9\u4efb\u610f\u4f4d\u7f6e\u7684\u6587\u4ef6 (WSL \u8bf7\u4f7f\u7528 Windows \u8def\u5f84\u6216 /mnt/c/ \u8def\u5f84)\u3002",
    'focus.auto': "\u81ea\u52a8\u5224\u65ad",
    'focus.vscode': "VSCode",
    'focus.terminal': "\u547d\u4ee4\u884c/\u7ec8\u7aef",
    'api_key': "api_key",
    'div': "div",
    'input': "input",
    'key': "key",
    'label': "label",
    'span': "span"
  },
  en: {
    'brand.subtitle': "AI CLI completion notifications",
    'nav.channels': "Channels",
    'nav.sources': "Sources",
    'nav.watch': "Watch",
    'nav.test': "Test",
    'nav.summary': "Summary",
    'nav.advanced': "Advanced",
    'ui.language': "Language",
    'ui.watchToggle': "Watch",
    'ui.stepUp': "Increase",
    'ui.stepDown': "Decrease",
    'btn.projectLink': "Project repo",
    'btn.openDataDir': "Open data folder",
    'btn.openSettings': "Open settings.json",
    'btn.openWatchLog': "Open log file",
    'hint.openDataDir': "Stores settings.json, state.json, and optional .env",
    'btn.save': "Save",
    'btn.reload': "Reload UI / config",
    'btn.watchStart': "Start watching",
    'btn.watchStop': "Stop",
    'btn.send': "Send",
    'section.channels.title': "Channels",
    'section.channels.sub': "Global toggle + per-source toggles apply",
    'section.sources.title': "Sources",
    'section.sources.sub': "Per-source: enable, threshold, channel toggles",
    'section.watch.title': "Interactive watch",
    'section.watch.sub': "For interactive mode / VSCode extensions: watch local logs and notify after each reply",
    'section.test.title': "Test notification",
    'section.test.sub': "Validate channels (forced send; ignores thresholds)",
    'section.summary.title': "AI Summary",
    'section.summary.sub': "Used to generate a short summary; if it times out, the original task is used.",
    'section.advanced.title': "Advanced",
    'section.advanced.sub': "Formatting and UI preferences",
    'watch.polling': "Polling (ms)",
    'watch.claudeDebounce': "Claude debounce (ms)",
    'watch.debounce': "Gemini debounce (ms)",
    'watch.logRetention': "Log retention (days)",
    'watch.logRetentionHint': "Keep only the last N days of local watch logs",
    'watch.hint': "Keep watch running in the background so notifications work for both terminal and VSCode.",
    'watch.logs': "Watch logs",
    'watch.status.running': "Running",
    'watch.status.stopped': "Stopped",
    'watch.logNotReady': "No log file yet",
    'watch.logOpenFailed': "Failed to open log file",
    'test.source': "Source",
    'test.duration': "Duration (min)",
    'test.message': "Message",
    'test.defaultTask': "Test notification (forced)",
    'test.fallbackTask': "Test notification",
    'summary.enabled': "Enable AI summary",
    'summary.provider': "Model platform",
    'summary.provider.openai': "OpenAI",
    'summary.provider.anthropic': "Anthropic",
    'summary.provider.google': "Google / Gemini",
    'summary.provider.qwen': "Qwen",
    'summary.provider.deepseek': "DeepSeek",
    'summary.apiUrl': "API URL",
    'summary.apiUrlExample': "Example",
    'summary.apiKey': "API Key",
    'summary.apiKeyToggle.show': "Show API key",
    'summary.apiKeyToggle.hide': "Hide API key",
    'summary.test': "Summary test",
    'summary.testBtn': "Run test",
    'summary.test.running': "Testing...",
    'summary.test.success': "Success",
    'summary.test.fail': "Failed",
    'summary.test.missingApiUrl': "Please enter the API URL",
    'summary.test.missingApiKey': "Please enter the API key",
    'summary.test.missingModel': "Please enter the model",
    'summary.test.emptySummary': "No summary returned. Check API URL/key/model.",
    'summary.test.httpError': "HTTP request failed",
    'summary.test.timeout': "Request timed out",
    'summary.test.networkError': "Network error",
    'summary.test.invalidJson': "Response is not valid JSON",
    'summary.test.emptyContent': "Summary context is empty",
    'summary.test.disabled': "Summary is disabled",
    'summary.test.invalidRequest': "Request parameters are invalid",
    'summary.test.unexpected': "Unexpected error",
    'summary.test.unsupported': "Summary test is unavailable in this build.",
    'summary.model': "Model",
    'summary.timeout': "Timeout (ms)",
    'summary.timeoutHint': "Falls back to the default task description if it times out",
    'summary.hint': "Fill in the API settings to enable summaries. It falls back automatically on timeout.",
    'advanced.titlePrefix': "Include source prefix in title (e.g., [Codex])",
    'advanced.useFeishuCard': "Use Feishu card format for Webhook",
    'advanced.closeBehavior': "Close button behavior",
    'advanced.closeHint': "If set to \u201cMinimize to tray\u201d, closing the window keeps the app running in the system tray.",
    'advanced.autostart': "Launch at login (run in background after login)",
    'advanced.autostartHint': "Supported on Windows/macOS; Linux requires manual setup.",
    'close.message': "Close the app?",
    'close.detail': "Minimize to tray to keep running, or quit to stop watchers.",
    'close.hide': "Minimize to tray",
    'close.quit': "Quit",
    'close.cancel': "Cancel",
    'close.remember': "Remember my choice (change later in Advanced)",
    'close.ask': "Ask every time",
    'close.tray': "Minimize to tray",
    'close.exit': "Quit app",
    'channel.webhook': "Webhook",
    'channel.webhook.desc': "Generic webhook (Feishu post format; supports multiple URLs)",
    'channel.telegram': "Telegram",
    'channel.telegram.desc': "Bot messages (optional proxy)",
    'channel.desktop': "Desktop",
    'channel.desktop.desc': "Windows toast/balloon",
    'channel.sound': "Sound",
    'channel.sound.desc': "TTS / beep fallback",
    'channel.email': "Email",
    'channel.email.desc': "SMTP email alerts (configure via .env)",
    'source.claude': "Claude",
    'source.claude.desc': "Claude Code CLI / extension",
    'source.codex': "Codex",
    'source.codex.desc': "Codex CLI / extension",
    'source.gemini': "Gemini",
    'source.gemini.desc': "Gemini CLI / extension",
    'sources.threshold': "Notify if over (min)",
    'sources.thresholdHint': "Only notify if duration exceeds this value. Click \u201cSave\u201d after changing.",
    'hint.saving': "",
    'hint.saved': "",
    'hint.loaded': "",
    'log.testing': "Sending test notification...",
    'nav.sound': "Sound",
    'btn.soundTest': "Play test",
    'btn.soundOpenPath': "Open file",
    'section.sound.title': "Sound",
    'section.sound.sub': "TTS and custom sound settings (WAV supported)",
    'watch.confirmEnabled': "Confirm prompt alert",
    'watch.confirmKeywords': "Confirm keywords (optional)",
    'watch.confirmKeywordsPlaceholder': "confirm,approve,allow,proceed",
    'watch.confirmKeywordsHint': "Used to detect confirmation/approval prompts. Leave empty to use defaults; comma-separated custom keywords.",
    'advanced.autoFocus': "Click notification to return",
    'advanced.forceMaximize': "Force maximize on return (WSL / terminal too)",
    'advanced.forceMaximizeHint': "If minimized during the task, clicking the notification restores maximized.",
    'advanced.focusTarget': "Return target",
    'advanced.focusHint': "Click the notification to return (more reliable). OS focus rules may still block; for VSCode extensions choose the VSCode target.",
    'advanced.autostartStatusOn': "System autostart: enabled",
    'advanced.autostartStatusOff': "System autostart: disabled",
    'advanced.autostartStatusUnsupported': "System autostart: unsupported",
    'advanced.autostartStatusUnknown': "System autostart: unknown",
    'advanced.soundTts': "Voice TTS",
    'advanced.soundTtsHint': "Disable to play simple sound only.",
    'advanced.soundCustom': "Use custom sound",
    'advanced.soundCustomPath': "Sound file path",
    'advanced.soundCustomPlaceholder': "C:\\path\\to\\sound.wav or /mnt/c/...",
    'advanced.soundCustomHint': "WAV supported. You can browse any file. In WSL use Windows path or /mnt/c/.",
    'focus.auto': "Auto",
    'focus.vscode': "VSCode",
    'focus.terminal': "Terminal",
    'api_key': "api_key",
    'div': "div",
    'input': "input",
    'key': "key",
    'label': "label",
    'span': "span"
  }
};
let currentLanguage = 'zh-CN';
let autostartStatusPayload = null;

function normalizeLanguage(value) {
  if (typeof value !== 'string') return 'zh-CN';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  if (normalized === 'zh' || normalized.startsWith('zh')) return 'zh-CN';
  return SUPPORTED_LANGUAGES.includes(value) ? value : 'zh-CN';
}

function t(key) {
  const langPack = I18N[currentLanguage] || I18N['zh-CN'];
  return langPack[key] || I18N.en[key] || I18N['zh-CN'][key] || String(key);
}

function $(id) {
  return document.getElementById(id);
}

function setHint(text) {
  $('hint').textContent = text || '';
}

function setLog(text) {
  $('log').textContent = text || '';
}

function setWatchLog(text) {
  $('watchLog').textContent = text || '';
}

function setSoundTestStatus(text, tone) {
  const el = $('soundTestStatus');
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('success', 'error');
  if (tone) el.classList.add(tone);
}

function formatLogTimestamp(ts) {
  const date = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function appendWatchLog(line) {
  const rawLine = String(line || '');
  const stamped = `[${formatLogTimestamp(Date.now())}] ${rawLine}`;
  const next = ($('watchLog').textContent || '') + stamped + '\n';
  $('watchLog').textContent = next.length > 12000 ? next.slice(-12000) : next;
  $('watchLog').scrollTop = $('watchLog').scrollHeight;
}

function updateDefaultInputValue(id, perLangDefaults) {
  const el = $(id);
  if (!el) return;
  const current = String(el.value || '');
  const known = Object.values(perLangDefaults);
  if (!known.includes(current)) return;
  el.value = perLangDefaults[currentLanguage] || perLangDefaults.en || current;
}

function renderAutostartStatus(payload) {
  autostartStatusPayload = payload || autostartStatusPayload;
  const el = $('autostartStatus');
  if (!el) return;
  const info = autostartStatusPayload || {};
  const platform = String(info.platform || '');
  const system = info.system || null;
  if (!platform) {
    el.textContent = t('advanced.autostartStatusUnknown');
    return;
  }
  const isSupported = platform === 'win32' || platform === 'darwin';
  if (!isSupported) {
    el.textContent = t('advanced.autostartStatusUnsupported');
    return;
  }
  if (system && typeof system.openAtLogin === 'boolean') {
    el.textContent = system.openAtLogin ? t('advanced.autostartStatusOn') : t('advanced.autostartStatusOff');
    return;
  }
  el.textContent = t('advanced.autostartStatusUnknown');
}

function applyLanguageToDom(config, opts = {}) {
  const onGlobalChange = typeof opts.onGlobalChange === 'function' ? opts.onGlobalChange : null;
  const onSourceChange = typeof opts.onSourceChange === 'function' ? opts.onSourceChange : null;

  currentLanguage = normalizeLanguage(currentLanguage);
  document.documentElement.lang = currentLanguage === 'en' ? 'en' : 'zh-CN';

  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    if (!key) continue;
    el.textContent = t(key);
  }
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    const key = el.getAttribute('data-i18n-title');
    if (!key) continue;
    const text = t(key);
    el.setAttribute('title', text);
    el.setAttribute('aria-label', text);
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) continue;
    const text = t(key);
    el.setAttribute('placeholder', text);
  }

  updateDefaultInputValue('testTask', {
    'zh-CN': I18N['zh-CN']['test.defaultTask'],
    en: I18N.en['test.defaultTask']
  });

  const summaryProvider = config && config.summary ? normalizeSummaryProvider(config.summary.provider) : 'openai';
  applySummaryProviderPlaceholders(summaryProvider);
  syncSummaryApiKeyToggle();

  if (config) {
    renderGlobalChannels(config, onGlobalChange);
    renderSources(config, onSourceChange);
  }
  renderAutostartStatus(autostartStatusPayload);
  renderSoundPathDisplay();
  setSoundTestStatus('');
}

function normalizeSoundPath(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const m = value.match(/^\/mnt\/([a-zA-Z])\/(.*)/);
  if (m) {
    const drive = m[1].toUpperCase();
    const rest = m[2].replace(/\//g, "\\");
    return `${drive}\\${rest}`;
  }
  return value;
}

function getParentDir(raw) {
  const value = String(raw || "").trim().replace(/[\/]+$/, "");
  if (!value) return "";
  const idx = Math.max(value.lastIndexOf("\\"), value.lastIndexOf("/"));
  if (idx <= 0) return value;
  return value.slice(0, idx);
}

function renderSoundPathDisplay(raw) {
  const el = $("soundResolvedPath");
  if (!el) return;
  let source = raw;
  if (source == null) {
    const input = $("soundCustomPath");
    source = input ? input.value : "";
  }
  const resolved = normalizeSoundPath(source);
  if (currentLanguage === "en") {
    el.textContent = `Current path: ${resolved || "Not set"}`;
  } else {
    el.textContent = `当前路径：${resolved || "未设置"}`;
  }
}



function setupNav() {
  const navLinks = Array.from(document.querySelectorAll('.navItem'));
  const contentRoot = document.querySelector('.content');

  if (navLinks.length === 0) return () => {};

  function setActiveByHash(hash) {
    const targetHash = hash && hash.startsWith('#') ? hash : navLinks[0].getAttribute('href') || '';
    for (const link of navLinks) {
      link.classList.toggle('isActive', link.getAttribute('href') === targetHash);
    }
  }

  for (const link of navLinks) {
    link.addEventListener('click', () => setActiveByHash(link.getAttribute('href')));
  }

  window.addEventListener('hashchange', () => setActiveByHash(window.location.hash));
  setActiveByHash(window.location.hash);

  const sections = navLinks
    .map((l) => document.querySelector(l.getAttribute('href') || ''))
    .filter(Boolean);

  if (!contentRoot || sections.length === 0 || typeof IntersectionObserver !== 'function') {
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length === 0) return;
      visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const top = visible[0].target;
      if (top && top.id) setActiveByHash('#' + top.id);
    },
    { root: contentRoot, threshold: [0.18, 0.26, 0.35, 0.45, 0.6] }
  );

  for (const section of sections) observer.observe(section);
  return () => observer.disconnect();
}

function createSwitch(checked, onChange) {
  const label = document.createElement('label');
  label.className = 'switch';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = Boolean(checked);
  input.addEventListener('change', () => onChange(input.checked));

  const slider = document.createElement('span');
  slider.className = 'slider';

  label.appendChild(input);
  label.appendChild(slider);
  return { root: label, input };
}

function renderGlobalChannels(config, onChange) {
  const root = $('globalChannels');
  root.innerHTML = '';

  for (const ch of CHANNELS) {
    const tile = document.createElement('div');
    tile.className = 'tile';

    const left = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'tileTitle';
    title.textContent = t(ch.titleKey);

    const desc = document.createElement('div');
    desc.className = 'tileDesc';
    desc.textContent = t(ch.descKey);

    left.appendChild(title);
    left.appendChild(desc);

    const toggle = createSwitch(config.channels?.[ch.key]?.enabled, (v) => {
      config.channels[ch.key].enabled = v;
      if (onChange) onChange();
    });

    tile.appendChild(left);
    tile.appendChild(toggle.root);
    root.appendChild(tile);
  }
}

function renderSources(config, onChange) {
  const root = $('sources');
  root.innerHTML = '';

  for (const src of SOURCES) {
    const card = document.createElement('div');
    card.className = 'sourceCard';

    const head = document.createElement('div');
    head.className = 'sourceHead';

    const left = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'sourceTitle';
    title.textContent = t(src.titleKey);
    const meta = document.createElement('div');
    meta.className = 'sourceMeta';
    meta.textContent = t(src.descKey);
    left.appendChild(title);
    left.appendChild(meta);

    const controls = document.createElement('div');
    controls.className = 'sourceControls';

    const thresholdLabel = document.createElement('label');
    thresholdLabel.className = 'labelWithHint';
    thresholdLabel.textContent = t('sources.threshold');
    const thresholdHint = document.createElement('span');
    thresholdHint.className = 'hintIcon';
    thresholdHint.textContent = '?';
    thresholdHint.title = t('sources.thresholdHint');
    thresholdHint.setAttribute('aria-label', t('sources.thresholdHint'));
    thresholdLabel.appendChild(thresholdHint);

    const threshold = document.createElement('input');
    threshold.type = 'number';
    threshold.min = '0';
    threshold.step = '1';
    threshold.style.width = '110px';
    threshold.value = String(config.sources?.[src.key]?.minDurationMinutes ?? 0);
    threshold.addEventListener('change', () => {
      const n = Number(threshold.value);
      config.sources[src.key].minDurationMinutes = Number.isFinite(n) && n >= 0 ? n : 0;
      if (onChange) onChange();
    });

    const enabledToggle = createSwitch(config.sources?.[src.key]?.enabled, (v) => {
      config.sources[src.key].enabled = v;
      disabledWrap.classList.toggle('isDisabled', !v);
      if (onChange) onChange();
    });

    controls.appendChild(thresholdLabel);
    controls.appendChild(threshold);
    controls.appendChild(enabledToggle.root);

    head.appendChild(left);
    head.appendChild(controls);
    card.appendChild(head);

    const disabledWrap = document.createElement('div');
    disabledWrap.className = 'channelGrid';
    disabledWrap.classList.toggle('isDisabled', !config.sources?.[src.key]?.enabled);

    for (const ch of CHANNELS) {
      const item = document.createElement('div');
      item.className = 'channelItem';

      const name = document.createElement('span');
      name.textContent = t(ch.titleKey);

      const toggle = createSwitch(config.sources?.[src.key]?.channels?.[ch.key], (v) => {
        config.sources[src.key].channels[ch.key] = v;
        if (onChange) onChange();
      });

      item.appendChild(name);
      item.appendChild(toggle.root);
      disabledWrap.appendChild(item);
    }

    card.appendChild(disabledWrap);
    root.appendChild(card);
  }
}

const SUMMARY_PROVIDER_DEFAULTS = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  anthropic: {
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-haiku-20240307'
  },
  google: {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    model: 'gemini-1.5-flash'
  },
  qwen: {
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo'
  },
  deepseek: {
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat'
  }
};
const SUMMARY_LEGACY_DEFAULTS = {
  apiUrls: [
    'https://open.bigmodel.cn/api/paas/v4/chat/completions'
  ],
  models: [
    'glm-4-flash-250414'
  ]
};
const SUMMARY_TEST_ERROR_KEYS = {
  disabled: 'summary.test.disabled',
  missing_api_url: 'summary.test.missingApiUrl',
  missing_api_key: 'summary.test.missingApiKey',
  missing_model: 'summary.test.missingModel',
  empty_summary: 'summary.test.emptySummary',
  empty_content: 'summary.test.emptyContent',
  invalid_request: 'summary.test.invalidRequest',
  http_error: 'summary.test.httpError',
  timeout: 'summary.test.timeout',
  network_error: 'summary.test.networkError',
  invalid_json: 'summary.test.invalidJson',
  unexpected_error: 'summary.test.unexpected'
};

function normalizeSummaryProvider(value) {
  if (!value) return 'openai';
  const raw = String(value).trim().toLowerCase();
  if (raw === 'gemini') return 'google';
  if (raw === 'google' || raw === 'openai' || raw === 'anthropic' || raw === 'qwen' || raw === 'deepseek') {
    return raw;
  }
  return 'openai';
}

function getSummaryProviderDefaults(provider) {
  const key = normalizeSummaryProvider(provider);
  return SUMMARY_PROVIDER_DEFAULTS[key] || SUMMARY_PROVIDER_DEFAULTS.openai;
}

function normalizeUrlString(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isSummaryDefaultUrl(value) {
  if (!value) return true;
  const raw = normalizeUrlString(value);
  if (!raw) return true;
  if (SUMMARY_LEGACY_DEFAULTS.apiUrls.map(normalizeUrlString).includes(raw)) return true;
  return Object.values(SUMMARY_PROVIDER_DEFAULTS).some((item) => normalizeUrlString(item.apiUrl) === raw);
}

function isSummaryDefaultModel(value) {
  if (!value) return true;
  const raw = String(value).trim();
  if (!raw) return true;
  if (SUMMARY_LEGACY_DEFAULTS.models.includes(raw)) return true;
  return Object.values(SUMMARY_PROVIDER_DEFAULTS).some((item) => item.model === raw);
}

function hasApiKeyInUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return Boolean(parsed.searchParams.get('key') || parsed.searchParams.get('api_key'));
  } catch (_error) {
    return false;
  }
}

function applySummaryProviderPlaceholders(provider) {
  const defaults = getSummaryProviderDefaults(provider);
  if ($('summaryApiUrl')) $('summaryApiUrl').placeholder = defaults.apiUrl;
  if ($('summaryModel')) $('summaryModel').placeholder = defaults.model;
  if ($('summaryApiUrlExample')) {
    $('summaryApiUrlExample').textContent = `${t('summary.apiUrlExample')}: ${defaults.apiUrl}`;
  }
}

function normalizeSummaryTestDetail(detail) {
  if (!detail) return '';
  const trimmed = String(detail).replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.length > 180 ? trimmed.slice(0, 177) + '...' : trimmed;
}

function setSummaryTestResult(statusKey, detail) {
  const el = $('summaryTestResult');
  if (!el) return;
  if (!statusKey) {
    el.textContent = '';
    return;
  }
  const base = t(statusKey);
  const cleaned = normalizeSummaryTestDetail(detail);
  if (!cleaned) {
    el.textContent = base;
    return;
  }
  const sep = currentLanguage === 'en' ? ': ' : '\uFF1A';
  el.textContent = `${base}${sep}${cleaned}`;
}

function clearSummaryTestResult() {
  const el = $('summaryTestResult');
  if (el) el.textContent = '';
}

function formatSummaryTestFailure(result) {
  if (!result || typeof result !== 'object') return '';
  const pieces = [];
  const errorKey = result.error ? SUMMARY_TEST_ERROR_KEYS[String(result.error)] : '';
  if (errorKey) pieces.push(t(errorKey));
  if (typeof result.status === 'number' && result.status > 0) pieces.push(`HTTP ${result.status}`);
  if (result.detail) pieces.push(String(result.detail));
  const sep = currentLanguage === 'en' ? ' - ' : ' - ';
  return pieces.filter(Boolean).join(sep);
}

function setSummaryApiKeyVisibility(visible) {
  const input = $('summaryApiKey');
  const toggle = $('summaryApiKeyToggle');
  if (!input || !toggle) return;
  input.type = visible ? 'text' : 'password';
  toggle.classList.toggle('isActive', visible);
  const key = visible ? 'summary.apiKeyToggle.hide' : 'summary.apiKeyToggle.show';
  const label = t(key);
  toggle.setAttribute('title', label);
  toggle.setAttribute('aria-label', label);
}

function syncSummaryApiKeyToggle() {
  const input = $('summaryApiKey');
  if (!input) return;
  setSummaryApiKeyVisibility(input.type === 'text');
}

function updateSummaryProviderDefaults(summary, nextProvider) {
  const nextDefaults = getSummaryProviderDefaults(nextProvider);
  summary.provider = nextProvider;
  if (isSummaryDefaultUrl(summary.apiUrl)) summary.apiUrl = nextDefaults.apiUrl;
  if (isSummaryDefaultModel(summary.model)) summary.model = nextDefaults.model;
}

function ensureSummaryConfig(config) {
  if (!config.summary || typeof config.summary !== 'object') config.summary = {};
  if (!config.summary.provider) config.summary.provider = 'openai';
  if (config.summary.timeoutMs == null || config.summary.timeoutMs === 1200) {
    config.summary.timeoutMs = 15000;
  }
  return config.summary;
}

function applySummaryValues(config) {
  if (!$('summaryEnabled')) return;
  const summary = ensureSummaryConfig(config);
  summary.provider = normalizeSummaryProvider(summary.provider);
  $('summaryEnabled').checked = Boolean(summary.enabled);
  if ($('summaryProvider')) $('summaryProvider').value = summary.provider;
  $('summaryApiUrl').value = summary.apiUrl || '';
  $('summaryApiKey').value = summary.apiKey || '';
  $('summaryModel').value = summary.model || '';
  $('summaryTimeoutMs').value = String(summary.timeoutMs ?? 15000);
  applySummaryProviderPlaceholders(summary.provider);
}

function setSummaryVisibility(enabled) {
  const fields = $('summaryFields');
  if (!fields) return;
  fields.classList.toggle('isCollapsed', !enabled);
}

function bindNumberSteppers() {
  const fields = Array.from(document.querySelectorAll('.numberField'));
  if (fields.length === 0) return;

  const triggerEvents = (input) => {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const step = (input, direction) => {
    if (!input || input.disabled) return;
    try {
      if (direction === 'up') input.stepUp();
      else input.stepDown();
      triggerEvents(input);
    } catch (_error) {
      // ignore
    }
  };

  for (const field of fields) {
    const input = field.querySelector('input[type="number"]');
    const up = field.querySelector('[data-step="up"]');
    const down = field.querySelector('[data-step="down"]');
    if (!input || !up || !down) continue;

    up.addEventListener('click', (event) => {
      event.preventDefault();
      step(input, 'up');
    });
    down.addEventListener('click', (event) => {
      event.preventDefault();
      step(input, 'down');
    });
  }
}

function applyWatchLogRetention(config) {
  const input = $('watchLogRetentionDays');
  if (!input) return;
  const days = Number(config?.ui?.watchLogRetentionDays);
  input.value = String(Number.isFinite(days) && days >= 1 ? days : 7);
}

function ensureConfirmAlertConfig(config) {
  if (!config.ui || typeof config.ui !== 'object') config.ui = {};
  if (!config.ui.confirmAlert || typeof config.ui.confirmAlert !== 'object') config.ui.confirmAlert = {};
  if (typeof config.ui.confirmAlert.enabled !== 'boolean') config.ui.confirmAlert.enabled = false;
  if (typeof config.ui.confirmAlert.keywords !== 'string') config.ui.confirmAlert.keywords = '';
  return config.ui.confirmAlert;
}

function applyConfirmAlertValues(config) {
  const toggle = $('watchConfirmEnabled');
  const input = $('watchConfirmKeywords');
  const row = $('watchConfirmKeywordsRow');
  if (!toggle && !input) return;
  const confirmAlert = ensureConfirmAlertConfig(config || {});
  if (toggle) toggle.checked = Boolean(confirmAlert.enabled);
  if (input) input.value = confirmAlert.keywords || '';
  if (row) row.classList.toggle('isHidden', !confirmAlert.enabled);
}

function applyWebhookCardToggle(config) {
  const input = $('useFeishuCard');
  if (!input) return;
  input.checked = Boolean(config?.channels?.webhook?.useFeishuCard);
}

function bindClosePrompt() {
  const modal = $('closeModal');
  if (!modal) return () => {};

  let activeId = null;

  const setOpen = (open) => {
    modal.classList.toggle('isOpen', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      const remember = $('closeRemember');
      if (remember) remember.checked = false;
      const hideBtn = $('closeHideBtn');
      if (hideBtn) hideBtn.focus();
    }
  };

  const respond = (action) => {
    if (!activeId) {
      setOpen(false);
      return;
    }
    const payload = {
      id: activeId,
      action,
      remember: Boolean($('closeRemember')?.checked)
    };
    activeId = null;
    if (window.completeNotify && typeof window.completeNotify.respondClosePrompt === 'function') {
      window.completeNotify.respondClosePrompt(payload);
    }
    setOpen(false);
  };

  const onRequest = (payload) => {
    const id = payload && payload.id ? String(payload.id) : '';
    if (!id) return;
    activeId = id;
    setOpen(true);
  };

  const onMaskClick = (event) => {
    if (event.target === modal) respond('cancel');
  };

  const onKeydown = (event) => {
    if (event.key === 'Escape' && modal.classList.contains('isOpen')) {
      respond('cancel');
    }
  };

  const hideBtn = $('closeHideBtn');
  const quitBtn = $('closeQuitBtn');
  const cancelBtn = $('closeCancelBtn');

  const onHideClick = () => respond('tray');
  const onQuitClick = () => respond('exit');
  const onCancelClick = () => respond('cancel');

  if (hideBtn) hideBtn.addEventListener('click', onHideClick);
  if (quitBtn) quitBtn.addEventListener('click', onQuitClick);
  if (cancelBtn) cancelBtn.addEventListener('click', onCancelClick);
  modal.addEventListener('click', onMaskClick);
  window.addEventListener('keydown', onKeydown);

  const unsubscribe = window.completeNotify && typeof window.completeNotify.onClosePrompt === 'function'
    ? window.completeNotify.onClosePrompt(onRequest)
    : () => {};

  return () => {
    if (hideBtn) hideBtn.removeEventListener('click', onHideClick);
    if (quitBtn) quitBtn.removeEventListener('click', onQuitClick);
    if (cancelBtn) cancelBtn.removeEventListener('click', onCancelClick);
    modal.removeEventListener('click', onMaskClick);
    window.removeEventListener('keydown', onKeydown);
    if (typeof unsubscribe === 'function') unsubscribe();
  };
}

async function main() {
  const cleanupNav = setupNav();
  const cleanupClosePrompt = bindClosePrompt();
  bindNumberSteppers();
  const meta = await window.completeNotify.getMeta();
  $('productName').textContent = meta.productName;

  $('openDataDir').addEventListener('click', () => window.completeNotify.openPath(meta.dataDir));
  $('openConfigPath').addEventListener('click', () => window.completeNotify.openPath(meta.configPath));
  if ($('openWatchLogBtn')) {
    $('openWatchLogBtn').addEventListener('click', async () => {
      try {
        if (typeof window.completeNotify.openWatchLog !== 'function') {
          setHint(t('watch.logOpenFailed'));
          return;
        }
        const result = await window.completeNotify.openWatchLog();
        if (!result || !result.ok) {
          setHint(t('watch.logOpenFailed'));
          return;
        }
        setHint('');
      } catch (_error) {
        setHint(t('watch.logOpenFailed'));
      }
    });
  }
  if (meta.version && $('productVersion')) $('productVersion').textContent = `v${meta.version}`;
  if ($('githubBtn')) {
    $('githubBtn').addEventListener('click', () => {
      try {
        window.completeNotify.openExternal('https://github.com/ZekerTop/ai-cli-complete-notify');
      } catch (_error) {
        // ignore
      }
    });
  }

  const config = await window.completeNotify.getConfig();
  let autoSaveTimer = null;
  const triggerAutoSave = () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      try {
        await window.completeNotify.saveConfig(config);
        setHint('');
      } catch (error) {
        setHint(String(error?.message || error));
      }
    }, 250);
  };

  config.ui = config.ui || {};
  currentLanguage = normalizeLanguage(config.ui.language || 'zh-CN');
  config.ui.language = currentLanguage;
  $('languageSelect').value = currentLanguage;
  $('languageSelect').addEventListener('change', async () => {
    const next = normalizeLanguage(String($('languageSelect').value || 'zh-CN'));
    if (next === currentLanguage) return;
    currentLanguage = next;
    config.ui.language = next;
    try {
      await window.completeNotify.setUiLanguage(next);
    } catch (_error) {
      // ignore
    }
    triggerAutoSave();
    applyLanguageToDom(config, { onGlobalChange: triggerAutoSave, onSourceChange: triggerAutoSave });
    await refreshWatchStatus();
  });

  const useFeishuCardEl = $('useFeishuCard');
  if (useFeishuCardEl) {
    useFeishuCardEl.checked = Boolean(config.channels?.webhook?.useFeishuCard);
    useFeishuCardEl.addEventListener('change', () => {
      config.channels = config.channels || {};
      config.channels.webhook = config.channels.webhook || {};
      config.channels.webhook.useFeishuCard = useFeishuCardEl.checked;
      triggerAutoSave();
    });
  }

  const closeBehavior = ['ask', 'tray', 'exit'].includes(String(config.ui.closeBehavior)) ? String(config.ui.closeBehavior) : 'ask';
  $('closeBehavior').value = closeBehavior;
  $('closeBehavior').addEventListener('change', async () => {
    const next = String($('closeBehavior').value || 'ask');
    config.ui.closeBehavior = ['ask', 'tray', 'exit'].includes(next) ? next : 'ask';
    try {
      if (typeof window.completeNotify.setCloseBehavior === 'function') {
        await window.completeNotify.setCloseBehavior(config.ui.closeBehavior);
      }
      triggerAutoSave();
    } catch (_error) {
      // ignore
    }
  });

  const focusToggle = $('autoFocusOnNotify');
  const focusTargetRow = $('focusTargetRow');
  const focusTargetEl = $('focusTarget');
  const focusHint = $('focusHint');
  const forceMaximizeRow = $('forceMaximizeRow');
  const forceMaximizeToggle = $('forceMaximizeOnFocus');
  const focusTargets = ['auto', 'vscode', 'terminal'];
  const syncFocusUi = () => {
    const enabled = Boolean(focusToggle && focusToggle.checked);
    if (focusTargetRow) focusTargetRow.classList.toggle('isHidden', !enabled);
    if (focusHint) focusHint.classList.toggle('isHidden', !enabled);
    if (forceMaximizeRow) forceMaximizeRow.classList.toggle('isHidden', !enabled);
  };
  if (focusToggle) {
    focusToggle.checked = Boolean(config.ui.autoFocusOnNotify);
    focusToggle.addEventListener('change', () => {
      config.ui.autoFocusOnNotify = Boolean(focusToggle.checked);
      syncFocusUi();
      triggerAutoSave();
    });
  }
  if (forceMaximizeToggle) {
    if (typeof config.ui.forceMaximizeOnFocus !== 'boolean') {
      config.ui.forceMaximizeOnFocus = false;
    }
    forceMaximizeToggle.checked = Boolean(config.ui.forceMaximizeOnFocus);
    forceMaximizeToggle.addEventListener('change', () => {
      config.ui.forceMaximizeOnFocus = Boolean(forceMaximizeToggle.checked);
      triggerAutoSave();
    });
  }
  if (focusTargetEl) {
    const initialTarget = focusTargets.includes(String(config.ui.focusTarget))
      ? String(config.ui.focusTarget)
      : 'auto';
    config.ui.focusTarget = initialTarget;
    focusTargetEl.value = initialTarget;
    focusTargetEl.addEventListener('change', () => {
      const next = String(focusTargetEl.value || 'auto');
      config.ui.focusTarget = focusTargets.includes(next) ? next : 'auto';
      triggerAutoSave();
    });
  }
  syncFocusUi();

  // Autostart
  if ($('autostart')) {
    try {
      const state = await window.completeNotify.getAutostart();
      if (state && typeof state.autostart === 'boolean') {
        config.ui.autostart = state.autostart;
      }
      renderAutostartStatus(state);
    } catch (_error) {
      // ignore
      renderAutostartStatus({ platform: '' });
    }
    $('autostart').checked = Boolean(config.ui.autostart);
    $('autostart').addEventListener('change', async () => {
      $('autostart').disabled = true;
      const enabled = Boolean($('autostart').checked);
      try {
        const result = await window.completeNotify.setAutostart(enabled);
        if (result && result.ok) {
          config.ui.autostart = enabled;
          triggerAutoSave();
          renderAutostartStatus(result);
        } else if (result && result.error) {
          setHint(String(result.error));
          renderAutostartStatus(result);
        }
      } catch (error) {
        setHint(String(error?.message || error));
        renderAutostartStatus({ platform: '' });
      } finally {
        $('autostart').disabled = false;
      }
    });
  }

  const soundCfg = config.channels?.sound || {};
  if (!config.channels) config.channels = {};
  if (!config.channels.sound) config.channels.sound = soundCfg;

  const soundTtsToggle = $("soundTtsEnabled");
  const soundCustomToggle = $("soundCustomEnabled");
  const soundCustomRow = $("soundCustomRow");
  const soundCustomHint = $("soundCustomHint");
  const soundCustomPath = $("soundCustomPath");
  const soundResolvedPath = $("soundResolvedPath");
  const soundOpenPathBtn = $("soundOpenPathBtn");
  const soundTestBtn = $("soundTestBtn");

  const getSoundPathInput = () => {
    if (soundCustomPath) return String(soundCustomPath.value || "").trim();
    return String(soundCfg.customPath || "").trim();
  };

  const syncSoundUi = () => {
    const customEnabled = Boolean(soundCustomToggle && soundCustomToggle.checked);
    if (soundCustomRow) soundCustomRow.classList.toggle("isHidden", !customEnabled);
    if (soundCustomHint) soundCustomHint.classList.toggle("isHidden", !customEnabled);
    renderSoundPathDisplay(getSoundPathInput());
    if (soundResolvedPath && !soundResolvedPath.textContent) {
      renderSoundPathDisplay(getSoundPathInput());
    }
  };

  if (soundTtsToggle) {
    if (typeof soundCfg.tts !== "boolean") soundCfg.tts = true;
    soundTtsToggle.checked = Boolean(soundCfg.tts);
    soundTtsToggle.addEventListener("change", () => {
      soundCfg.tts = Boolean(soundTtsToggle.checked);
      triggerAutoSave();
    });
  }

  if (soundCustomToggle) {
    if (typeof soundCfg.useCustom !== "boolean") soundCfg.useCustom = false;
    soundCustomToggle.checked = Boolean(soundCfg.useCustom);
    soundCustomToggle.addEventListener("change", () => {
      soundCfg.useCustom = Boolean(soundCustomToggle.checked);
      syncSoundUi();
      triggerAutoSave();
    });
  }

  if (soundCustomPath) {
    soundCustomPath.value = String(soundCfg.customPath || "");
    soundCustomPath.addEventListener("input", () => {
      renderSoundPathDisplay(getSoundPathInput());
    });
    soundCustomPath.addEventListener("change", () => {
      soundCfg.customPath = String(soundCustomPath.value || "").trim();
      triggerAutoSave();
      renderSoundPathDisplay(getSoundPathInput());
    });
  }

  if (soundOpenPathBtn) {
    soundOpenPathBtn.addEventListener("click", async () => {
      if (!window.completeNotify || typeof window.completeNotify.openSoundFile !== "function") {
        setHint(currentLanguage === "en" ? "File picker is unavailable" : "无法打开文件选择器");
        return;
      }
      try {
        const result = await window.completeNotify.openSoundFile();
        if (!result || !result.ok || !result.path) {
          if (result && result.canceled) return;
          setHint(currentLanguage === "en" ? "No file selected" : "未选择文件");
          return;
        }
        if (soundCustomPath) {
          soundCustomPath.value = String(result.path || "");
          soundCfg.customPath = String(result.path || "");
          if (soundCustomToggle) {
            soundCustomToggle.checked = true;
            soundCfg.useCustom = true;
            syncSoundUi();
          }
          triggerAutoSave();
          renderSoundPathDisplay(getSoundPathInput());
        }
        setHint("");
      } catch (error) {
        setHint(currentLanguage === "en" ? "Open file failed" : "打开文件失败");
      }
    });
  }



  if (soundTestBtn) {
    soundTestBtn.addEventListener("click", async () => {
      soundTestBtn.disabled = true;
      const title = currentLanguage === "en" ? "Sound test" : "提示音测试";
      setSoundTestStatus(currentLanguage === "en" ? "Playing sound..." : "正在播放提示音...");
      try {
        const result = await window.completeNotify.testSound({
          title,
          sound: {
            enabled: true,
            tts: Boolean(soundTtsToggle && soundTtsToggle.checked),
            useCustom: Boolean(soundCustomToggle && soundCustomToggle.checked),
            customPath: getSoundPathInput(),
            fallbackBeep: Boolean(soundCfg.fallbackBeep)
          }
        });
        if (result && result.ok) {
          setSoundTestStatus(currentLanguage === "en" ? "Sound played" : "提示音已播放", "success");
        } else {
          const errText = result && result.error ? String(result.error) : "";
          const zh = "提示音播放失败" + (errText ? "（" + errText + "）" : "");
          const en = "Sound failed" + (errText ? " (" + errText + ")" : "");
          setSoundTestStatus(currentLanguage === "en" ? en : zh, "error");
        }
      } catch (error) {
        const errText = error && error.message ? error.message : String(error);
        const zh = "提示音播放失败：" + errText;
        const en = "Sound failed (" + errText + ")";
        setSoundTestStatus(currentLanguage === "en" ? en : zh, "error");
      } finally {
        soundTestBtn.disabled = false;
      }
    });
  }



  syncSoundUi();

  let summaryBound = false;
  const bindSummaryControls = () => {
    if (summaryBound || !$('summaryEnabled')) return;
    summaryBound = true;

    $('summaryEnabled').addEventListener('change', () => {
      const summary = ensureSummaryConfig(config);
      summary.enabled = Boolean($('summaryEnabled').checked);
      setSummaryVisibility(summary.enabled);
      triggerAutoSave();
      clearSummaryTestResult();
    });
    if ($('summaryProvider')) {
      $('summaryProvider').addEventListener('change', () => {
        const summary = ensureSummaryConfig(config);
        const nextProvider = normalizeSummaryProvider($('summaryProvider').value);
        if (nextProvider === normalizeSummaryProvider(summary.provider)) return;
        updateSummaryProviderDefaults(summary, nextProvider);
        applySummaryValues(config);
        triggerAutoSave();
        clearSummaryTestResult();
      });
    }
    $('summaryApiUrl').addEventListener('input', () => {
      const summary = ensureSummaryConfig(config);
      summary.apiUrl = String($('summaryApiUrl').value || '').trim();
      triggerAutoSave();
      clearSummaryTestResult();
    });
    $('summaryApiKey').addEventListener('input', () => {
      const summary = ensureSummaryConfig(config);
      summary.apiKey = String($('summaryApiKey').value || '').trim();
      triggerAutoSave();
      clearSummaryTestResult();
    });
    $('summaryModel').addEventListener('input', () => {
      const summary = ensureSummaryConfig(config);
      summary.model = String($('summaryModel').value || '').trim();
      triggerAutoSave();
      clearSummaryTestResult();
    });
    $('summaryTimeoutMs').addEventListener('change', () => {
      const summary = ensureSummaryConfig(config);
      const n = Number($('summaryTimeoutMs').value);
      summary.timeoutMs = Number.isFinite(n) && n >= 200 ? n : 15000;
      triggerAutoSave();
      clearSummaryTestResult();
    });

    if ($('summaryApiKeyToggle')) {
      $('summaryApiKeyToggle').addEventListener('click', () => {
        const input = $('summaryApiKey');
        if (!input) return;
        setSummaryApiKeyVisibility(input.type === 'password');
      });
      syncSummaryApiKeyToggle();
    }

    if ($('summaryTestBtn')) {
      $('summaryTestBtn').addEventListener('click', async () => {
        if (!window.completeNotify || typeof window.completeNotify.testSummary !== 'function') {
          setSummaryTestResult('summary.test.fail', t('summary.test.unsupported'));
          return;
        }

        const provider = normalizeSummaryProvider($('summaryProvider')?.value);
        const apiUrl = String($('summaryApiUrl')?.value || '').trim();
        const apiKey = String($('summaryApiKey')?.value || '').trim();
        const model = String($('summaryModel')?.value || '').trim();
        const timeoutRaw = Number($('summaryTimeoutMs')?.value || 15000);
        const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw >= 200 ? timeoutRaw : 15000;

        if (!apiUrl) {
          setSummaryTestResult('summary.test.fail', t('summary.test.missingApiUrl'));
          return;
        }
        if (!model) {
          setSummaryTestResult('summary.test.fail', t('summary.test.missingModel'));
          return;
        }
        if (provider === 'google') {
          if (!apiKey && !hasApiKeyInUrl(apiUrl)) {
            setSummaryTestResult('summary.test.fail', t('summary.test.missingApiKey'));
            return;
          }
        } else if (!apiKey) {
          setSummaryTestResult('summary.test.fail', t('summary.test.missingApiKey'));
          return;
        }

        const summary = ensureSummaryConfig(config);
        summary.provider = provider;
        summary.apiUrl = apiUrl;
        summary.apiKey = apiKey;
        summary.model = model;
        summary.timeoutMs = timeoutMs;
        triggerAutoSave();

        const isEnglish = currentLanguage === 'en';
        const payload = {
          summary: {
            provider,
            apiUrl,
            apiKey,
            model,
            timeoutMs
          },
          taskInfo: isEnglish
            ? 'Summary test: verify API connectivity.'
            : '摘要测试：验证 API 连通性。',
          contentText: isEnglish
            ? 'The task completed successfully and needs a short summary.'
            : '任务已完成，需要生成简短摘要。',
          summaryContext: isEnglish
            ? { userMessage: 'Please summarize the task outcome.', assistantMessage: 'Completed successfully.' }
            : { userMessage: '请总结任务结果。', assistantMessage: '任务已完成。' }
        };

        $('summaryTestBtn').disabled = true;
        setSummaryTestResult('summary.test.running');
        try {
          const result = await window.completeNotify.testSummary(payload);
          if (result && result.ok && result.summary) {
            setSummaryTestResult('summary.test.success', result.summary);
            return;
          }
          const detail = formatSummaryTestFailure(result);
          setSummaryTestResult('summary.test.fail', detail);
        } catch (error) {
          setSummaryTestResult('summary.test.fail', String(error?.message || error));
        } finally {
          $('summaryTestBtn').disabled = false;
        }
      });
    }
  };

  applyLanguageToDom(config, { onGlobalChange: triggerAutoSave, onSourceChange: triggerAutoSave });
  bindSummaryControls();
  applySummaryValues(config);
  setSummaryVisibility(Boolean(config?.summary?.enabled));
  applyWatchLogRetention(config);
  applyConfirmAlertValues(config);
  applyWebhookCardToggle(config);

  if ($('watchLogRetentionDays')) {
    $('watchLogRetentionDays').addEventListener('change', () => {
      config.ui = config.ui || {};
      const n = Number($('watchLogRetentionDays').value);
      config.ui.watchLogRetentionDays = Number.isFinite(n) && n >= 1 ? n : 7;
      applyWatchLogRetention(config);
      triggerAutoSave();
    });
  }

  if ($('watchConfirmEnabled')) {
    $('watchConfirmEnabled').addEventListener('change', () => {
      const confirmAlert = ensureConfirmAlertConfig(config);
      confirmAlert.enabled = Boolean($('watchConfirmEnabled').checked);
      applyConfirmAlertValues(config);
      triggerAutoSave();
    });
  }
  if ($('watchConfirmKeywords')) {
    $('watchConfirmKeywords').addEventListener('input', () => {
      const confirmAlert = ensureConfirmAlertConfig(config);
      confirmAlert.keywords = String($('watchConfirmKeywords').value || '').trim();
      triggerAutoSave();
    });
  }

  $('reloadBtn').addEventListener('click', async () => {
    $('reloadBtn').disabled = true;
    try {
      const latest = await window.completeNotify.getConfig();
      // Replace config contents to keep listeners' references
      for (const key of Object.keys(config)) delete config[key];
      Object.assign(config, latest || {});

      currentLanguage = normalizeLanguage(config.ui?.language || 'zh-CN');
      config.ui.language = currentLanguage;
      $('languageSelect').value = currentLanguage;

      applyLanguageToDom(config, { onGlobalChange: triggerAutoSave, onSourceChange: triggerAutoSave });
      applySummaryValues(config);
      setSummaryVisibility(Boolean(config?.summary?.enabled));
      applyWatchLogRetention(config);
      applyConfirmAlertValues(config);
      applyWebhookCardToggle(config);
      await refreshWatchStatus();
    } catch (error) {
      setHint(String(error?.message || error));
    } finally {
      $('reloadBtn').disabled = false;
    }
  });

  $('testBtn').addEventListener('click', async () => {
    $('testBtn').disabled = true;
    setLog(t('log.testing'));
    try {
      const payload = {
        source: $('testSource').value,
        durationMinutes: Number($('testDuration').value || 0),
        taskInfo: $('testTask').value || t('test.fallbackTask')
      };
      const result = await window.completeNotify.testNotify(payload);
      setLog(JSON.stringify(result, null, 2));
    } catch (error) {
      setLog(String(error?.message || error));
    } finally {
      $('testBtn').disabled = false;
    }
  });

  // watch (interactive / VSCode plugin)
  let unsubscribeWatchLog = null;
  try {
    unsubscribeWatchLog = window.completeNotify.onWatchLog((line) => appendWatchLog(line));
  } catch (_error) {
    // ignore
  }

  async function refreshWatchStatus() {
    try {
      const status = await window.completeNotify.watchStatus();
      const running = Boolean(status && status.running);
      $('watchStatus').textContent = running ? t('watch.status.running') : t('watch.status.stopped');
      $('watchStatus').classList.toggle('on', running);
      $('watchStartBtn').disabled = running;
      $('watchStopBtn').disabled = !running;
      if ($('watchToggle')) $('watchToggle').checked = running;
      const logEl = $('watchLog');
      if (running && logEl && !logEl.textContent.trim()) {
        setWatchLog(currentLanguage === 'en' ? '[watch] running...' : '【watch】运行中…');
      }
    } catch (error) {
      $('watchStatus').textContent = String(error?.message || error);
      $('watchStatus').classList.remove('on');
      if ($('watchToggle')) $('watchToggle').checked = false;
    }
  }

  function buildWatchPayloadFromUi() {
    const sources = [];
    if ($('watchClaude') && $('watchClaude').checked) sources.push('claude');
    if ($('watchCodex') && $('watchCodex').checked) sources.push('codex');
    if ($('watchGemini') && $('watchGemini').checked) sources.push('gemini');
    const geminiQuietMs = Number($('watchGeminiQuietMs')?.value || 3000);
    const claudeQuietMs = Number($('watchClaudeQuietMs')?.value || 60000);
    return {
      sources: sources.length ? sources.join(',') : 'all',
      intervalMs: Number($('watchIntervalMs')?.value || 1000),
      geminiQuietMs,
      claudeQuietMs
    };
  }

  if ($('watchToggle')) {
    $('watchToggle').addEventListener('change', async () => {
      $('watchToggle').disabled = true;
      try {
        if ($('watchToggle').checked) {
          const result = await window.completeNotify.watchStart(buildWatchPayloadFromUi());
          appendWatchLog(`[watch] start result: ${JSON.stringify(result)}`);
        } else {
          const result = await window.completeNotify.watchStop();
          appendWatchLog(`[watch] stop result: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        appendWatchLog(`[watch] toggle failed: ${String(error?.message || error)}`);
      } finally {
        $('watchToggle').disabled = false;
        await refreshWatchStatus();
      }
    });
  }

  $('watchStartBtn').addEventListener('click', async () => {
    $('watchStartBtn').disabled = true;
    try {
      const result = await window.completeNotify.watchStart(buildWatchPayloadFromUi());
      appendWatchLog(`[watch] start result: ${JSON.stringify(result)}`);
    } catch (error) {
      appendWatchLog(`[watch] start failed: ${String(error?.message || error)}`);
    } finally {
      await refreshWatchStatus();
    }
  });

  $('watchStopBtn').addEventListener('click', async () => {
    $('watchStopBtn').disabled = true;
    try {
      const result = await window.completeNotify.watchStop();
      appendWatchLog(`[watch] stop result: ${JSON.stringify(result)}`);
    } catch (error) {
      appendWatchLog(`[watch] stop failed: ${String(error?.message || error)}`);
    } finally {
      await refreshWatchStatus();
    }
  });

  setWatchLog('');
  await refreshWatchStatus();

  setHint('');

  window.addEventListener('beforeunload', () => {
    if (typeof unsubscribeWatchLog === 'function') unsubscribeWatchLog();
    if (typeof cleanupClosePrompt === 'function') cleanupClosePrompt();
    if (typeof cleanupNav === 'function') cleanupNav();
  });
}

main().catch((error) => {
  setHint(String(error?.message || error));
});








