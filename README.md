# AI CLI Complete Notify
Version: 1.0.3

[中文文档](README_zh.md)

---

## Overview
Multi-channel notifications for AI CLIs (Claude / Codex / Gemini). Supports duration thresholds, desktop UI, CLI, and multiple channels (Webhook, Telegram, Email, Desktop, Sound), with optional wearables/app notifications if your band app mirrors system notifications.

## Features
| Feature | Description |
|---------|-------------|
| Per-source control | Independent enable/disable + thresholds for Claude/Codex/Gemini |
| Channels | Webhook (Feishu/DingTalk/WeCom JSON), Telegram Bot, Email (SMTP), Desktop notification, Sound/TTS |
| Duration threshold | Notify only when tasks exceed your minutes |
| Modes | Timer (`run`/`start-stop`) or log watch (interactive CLIs/VSCode) |
| Desktop UI | Switches, thresholds, language (EN/中文), tray hide, autostart |
| Config split | Runtime `settings.json`; secrets in `.env` |

## Quick Start
**Windows**
1. Download the latest `ai-cli-complete-notify.exe` from [Releases](https://github.com/ZekerTop/ai-cli-complete-notify/releases).
2. Place it in your folder (e.g., `C:\Tools\`).
3. Copy `.env.example` to `.env` in the same folder and fill Webhook/Token/SMTP.
4. Double-click to run the desktop app (CLI also available).

**macOS/Linux**
```bash
git clone https://github.com/ZekerTop/ai-cli-complete-notify.git
cd ai-cli-complete-notify
npm install
cp .env.example .env   # Windows: copy .env.example .env
# Fill .env with your Webhook/Token/SMTP before running
npm run dev            # run desktop app in dev
```

## Desktop App
- Top bar: language switch, watch toggle, close-to-tray option.
- Sources: enable/disable, set minutes before notify; auto-save. Use **Reload** if you edited files manually.
- Advanced: close behavior, autostart (Win/macOS), title prefix.
- Tray: choose “hide to tray”; icon may sit under the ^ chevron.

Screenshots:
- ![Desktop preview](docs/images/exe预览.png)
- ![Global channels](docs/images/全局通道.png)
- ![Per-source settings](docs/images/各cli来源.png)
- ![Watch / Test / Advanced](docs/images/监听、测试、高级功能.png)

## CLI Usage
```bash
# Instant notify (ignores thresholds)
node ai-reminder.js notify --source claude --task "done"

# Auto-timed wrap
ai-cli-complete-notify.exe run --source codex -- codex <args...>

# Manual start/stop
node ai-reminder.js start --source gemini --task "build"
...do work...
node ai-reminder.js stop  --source gemini --task "build"

# Watch logs (auto-detect sources)
ai-cli-complete-notify.exe watch --sources all --gemini-quiet-ms 3000
```

Key options: `--source`/`--sources`, `--task`, `--interval-ms`, `--gemini-quiet-ms`, `--force`.

## Configuration
`.env` (copy from `.env.example`):
```env
WEBHOOK_URLS=https://open.feishu.cn/open-apis/bot/v2/hook/XXXXX
NOTIFICATION_ENABLED=true
SOUND_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=465
# EMAIL_SECURE=true
# EMAIL_USER=bot@example.com
# EMAIL_PASS=your_smtp_password
# EMAIL_FROM=AI Notify <bot@example.com>
# EMAIL_TO=you@example.com
# Optional fixed paths:
# AI_CLI_COMPLETE_NOTIFY_DATA_DIR=...
# AI_CLI_COMPLETE_NOTIFY_ENV_PATH=...
```
Runtime settings live in `settings.json`:
- Windows: `%APPDATA%\ai-cli-complete-notify\settings.json`
- macOS/Linux: `~/.ai-cli-complete-notify/settings.json`

`.env` is in `.gitignore`—do not commit your secrets.

## Build / Release
- Dev: `npm run dev`
- Windows EXE: `npm run dist` or `npm run dist:portable`
- macOS/Linux: package on target OS via electron-packager/electron-builder.

## Tips
- Thresholds need timing data (`run`/`start-stop`/`watch`); `notify` ignores thresholds.
- Default webhook payload is Feishu JSON; adapt if your webhook format differs.
- Autostart switch is in Advanced (Win/macOS).
