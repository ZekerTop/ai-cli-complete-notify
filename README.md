# 🔔 AI CLI Complete Notify
Version: 0.1.0

[English](#english) | [中文](#中文)

---

## English

### 📖 Overview

Multi-channel notification system for mainstream AI CLIs (Claude / Codex / Gemini). Get notified when long-running AI tasks complete, with customizable duration thresholds and multiple notification channels.

### ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Per-Source Control** | Independent enable/disable and duration thresholds for Claude, Codex, and Gemini |
| 📢 **Multiple Channels** | Webhook (Feishu/DingTalk/WeCom), Telegram Bot, Email (SMTP), Desktop notification, Sound/TTS |
| ⏱️ **Duration Threshold** | Only notify when tasks exceed your configured minutes - filter out quick tasks |
| 🔄 **Dual Modes** | Timer mode (`run`/`start-stop`) or log watcher mode (perfect for interactive CLIs) |
| 🖥️ **Desktop GUI** | Toggle switches, threshold controls, language switcher (EN/中文), system tray support |
| 📁 **Config Split** | Runtime settings in `settings.json`, secrets in `.env` for better security |

### 🚀 Quick Start

#### 📥 Installation

**Windows Users:**
1. Download the latest `ai-cli-complete-notify.exe` from [Releases](../../releases)
2. Place the executable in your preferred folder (e.g., `C:\Tools\`)
3. Copy `.env.example` to `.env` in the same folder, fill your Webhook/Token/SMTP (see [Configuration](#-configuration) below)
4. Double-click to run the desktop app, or use from command line

**macOS/Linux Users:**
```bash
git clone <repository-url>
cd ai-cli-complete-notify
npm install
cp .env.example .env   # Windows: copy .env.example .env
# Edit .env with your Webhook/Token/SMTP before running
npm run dev  # Run desktop app in development mode
```

#### 🎮 Desktop App Usage

1. **Launch the app**
   - Windows: Double-click `ai-cli-complete-notify.exe`
   - macOS/Linux: Run `npm run dev`

2. **Configure sources**
   - Toggle switches to enable/disable Claude, Codex, or Gemini notifications
   - Set "Minimum minutes before notify" for each source (e.g., only notify if task runs > 5 minutes)
   - Changes auto-save; use **Reload UI / config** to re-read settings if you edited files manually

3. **Language & Mode**
   - Use the language dropdown (top-right) to switch between English and 中文
   - Enable **Watch Mode** if you want to monitor log files instead of using timers

4. **System Tray**
   - Check "Remember my choice" when closing to minimize to tray
   - Find the tray icon in the system tray (Windows: click ^ to expand hidden icons)
   - Right-click tray icon for quick access

Screenshots:

![Desktop preview](docs/images/exe预览.png)
![Global channels](docs/images/全局通道.png)
![Per-source settings](docs/images/各cli来源.png)
![Watch / Test / Advanced](docs/images/监听、测试、高级功能.png)

#### 💻 Command Line Usage

| Command | Description | Example |
|---------|-------------|---------|
| `notify` | Send immediate notification (no timing) | `ai-cli-complete-notify.exe notify --source claude --task "Analysis done"` |
| `run` | Auto-wrap command with timing | `ai-cli-complete-notify.exe run --source codex -- codex analyze.py` |
| `start` | Manually start timer | `ai-cli-complete-notify.exe start --source gemini --task "Training model"` |
| `stop` | Manually stop timer | `ai-cli-complete-notify.exe stop --source gemini --task "Training model"` |
| `watch` | Auto-detect & watch local AI CLI logs | `ai-cli-complete-notify.exe watch --sources all` |

**Detailed Examples:**

```bash
# Example 1: Instant notification (ignores duration threshold)
node ai-reminder.js notify --source claude --task "Code review completed"

# Example 2: Auto-timed wrap (will notify if exceeds threshold)
# Windows
ai-cli-complete-notify.exe run --source codex -- codex "explain main.py"
# macOS/Linux
node ai-reminder.js run --source codex -- codex "explain main.py"

# Example 3: Manual timing (useful for multi-step workflows)
node ai-reminder.js start --source gemini --task "Building Docker image"
# ...do your work...
docker build -t myapp .
# ...work finished...
node ai-reminder.js stop --source gemini --task "Building Docker image"

# Example 4: Watch mode (monitors local AI CLI logs automatically)
ai-cli-complete-notify.exe watch --sources all --gemini-quiet-ms 3000

# Example 5: Watch specific sources with custom settings
node ai-reminder.js watch --sources claude,codex \
  --interval-ms 1000 \
  --gemini-quiet-ms 5000 \
  --quiet
```

**CLI Options Reference:**

| Option | Description | Default |
|--------|-------------|---------|
| `--source <name>` | AI source: `claude`, `codex`, or `gemini` | Required for notify/run/start/stop |
| `--sources <list>` | Comma-separated sources for watch mode | `all` |
| `--task <description>` | Task description for notification | Required for notify/start/stop |
| `--interval-ms <ms>` | Watch mode polling interval (ms) | `1000` |
| `--gemini-quiet-ms <ms>` | Gemini quiet period (ms) before detecting completion | `3000` |
| `--quiet` | Suppress watch mode console output | `false` |
| `--force` | Force send notification ignoring thresholds | `false` |
| `--duration-minutes <min>` | Manually specify task duration (for notify command) | - |

### ⚙️ Configuration

#### `.env` File (Secrets & Credentials)

Create a `.env` file next to the executable (Windows) or in project root (macOS/Linux):

```env
# Webhook URLs (Feishu/DingTalk/WeCom; comma-separated)
# Example 1: Feishu bot webhook
# https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_WEBHOOK_URL_HERE
# Example 2: DingTalk bot webhook
# https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN_HERE
WEBHOOK_URLS=https://open.feishu.cn/open-apis/bot/v2/hook/XXXXX,https://oapi.dingtalk.com/robot/send?access_token=YYYYY

# Channel toggles
# NOTIFICATION_ENABLED controls Webhook / Telegram / Email (desktop is configured in settings.json)
NOTIFICATION_ENABLED=true
# SOUND_ENABLED controls sound/TTS channel
SOUND_ENABLED=true

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
# Optional: proxy for Telegram (if needed in China)
# HTTPS_PROXY=http://127.0.0.1:7890

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=yourbot@gmail.com
EMAIL_PASS=your_app_specific_password
EMAIL_FROM=AI Notify <yourbot@gmail.com>
EMAIL_TO=you@example.com

# Optional: Override default config paths (useful for portable EXE)
# AI_CLI_COMPLETE_NOTIFY_DATA_DIR=C:\Tools\ai-notify\data
# AI_CLI_COMPLETE_NOTIFY_ENV_PATH=C:\Tools\ai-notify\.env
```

**Configuration Table:**

| Variable | Required | Description |
|----------|----------|-------------|
| `WEBHOOK_URLS` | Optional | Comma-separated webhook URLs (Feishu/DingTalk/WeCom JSON format) |
| `NOTIFICATION_ENABLED` | Optional | Enable webhook / Telegram / email channels (`true`/`false`) |
| `SOUND_ENABLED` | Optional | Enable sound/TTS alerts (`true`/`false`) |
| `TELEGRAM_BOT_TOKEN` | Optional* | Telegram bot token (get from @BotFather) |
| `TELEGRAM_CHAT_ID` | Optional* | Your Telegram chat ID (get from @userinfobot) |
| `HTTPS_PROXY` | Optional | Proxy URL for Telegram (if blocked in your region) |
| `EMAIL_HOST` | Optional** | SMTP server hostname |
| `EMAIL_PORT` | Optional** | SMTP port (465 for SSL, 587 for TLS) |
| `EMAIL_SECURE` | Optional** | Use SSL/TLS (`true` for port 465) |
| `EMAIL_USER` | Optional** | SMTP username |
| `EMAIL_PASS` | Optional** | SMTP password (use app-specific password for Gmail) |
| `EMAIL_FROM` | Optional** | Sender email address |
| `EMAIL_TO` | Optional** | Recipient email address |

*Required if you want Telegram notifications
**Required if you want email notifications

#### `settings.json` (Runtime Settings)

Auto-created at first run. Location:
- **Windows:** `%APPDATA%\ai-cli-complete-notify\settings.json`
- **macOS:** `~/.ai-cli-complete-notify/settings.json`
- **Linux:** `~/.ai-cli-complete-notify/settings.json`

Example content:
```json
{
  "version": 2,
  "channels": {
    "webhook": {
      "enabled": true,
      "urls": []
    },
    "telegram": {
      "enabled": true
    },
    "email": {
      "enabled": false
    },
    "sound": {
      "enabled": true,
      "tts": true
    },
    "desktop": {
      "enabled": true
    }
  },
  "sources": {
    "claude": {
      "enabled": true,
      "minDurationMinutes": 5,
      "channels": {
        "webhook": true,
        "telegram": false,
        "email": false,
        "sound": true,
        "desktop": true
      }
    },
    "codex": {
      "enabled": true,
      "minDurationMinutes": 3
    },
    "gemini": {
      "enabled": false,
      "minDurationMinutes": 10
    }
  }
}
```

### 🔧 Advanced Usage

#### Watch Mode Workflow

Watch mode monitors log files for AI completion signals. Ideal for:
- VSCode Claude Code extension
- Interactive terminal sessions
- Background AI processes

**How it works:**
- Automatically discovers and monitors local AI CLI log files
- No need to specify log file paths manually
- Detects completion patterns for Claude, Codex, and Gemini
- Waits for "quiet period" (no new output) before notifying

```bash
# Monitor all AI sources
ai-cli-complete-notify.exe watch --sources all

# Monitor specific sources with custom quiet period
ai-cli-complete-notify.exe watch \
  --sources claude,codex \
  --interval-ms 1000 \
  --gemini-quiet-ms 5000 \
  --quiet
```

#### Integration Examples

**With VSCode Claude Code:**
```bash
# Start watching in background before opening VSCode
ai-cli-complete-notify.exe watch --sources claude --quiet
```

**With custom scripts:**
```bash
#!/bin/bash
# wrap-ai.sh - Wrapper for any AI CLI tool

ai-cli-complete-notify.exe start --source codex --task "$1"
codex "$@"
ai-cli-complete-notify.exe stop --source codex --task "$1"
```

### 📦 Building from Source (macOS/Linux Only)

Windows users should download pre-built EXE from releases.

```bash
# Development mode
npm run dev

# Build for macOS (x64)
npx electron-packager . ai-cli-complete-notify --platform=darwin --arch=x64

# Build for macOS (ARM/M1)
npx electron-packager . ai-cli-complete-notify --platform=darwin --arch=arm64

# Build for Linux
npx electron-packager . ai-cli-complete-notify --platform=linux --arch=x64
```

### 💡 Tips & Troubleshooting

| Issue | Solution |
|-------|----------|
| 🔍 Can't find tray icon | Click the ^ (chevron) in system tray to expand hidden icons, then pin the app |
| ⏱️ Getting too many notifications | Increase the "minimum minutes" threshold for each source |
| 🔕 Not receiving notifications | Check that at least one channel is enabled in desktop app or `settings.json` |
| 📧 Email not working | Verify SMTP credentials; for Gmail, use [App Password](https://support.google.com/accounts/answer/185833) |
| 🤖 Telegram blocked | Set `HTTPS_PROXY` in `.env` to a working proxy server |
| 📝 Watch mode not detecting | Ensure AI CLI logs are being written to default locations and app has read permissions |

**Important Notes:**
- ⚠️ Duration thresholds only apply when timing exists (`run`/`start-stop`/`watch` modes)
- ⚠️ The `notify` command ignores thresholds and sends immediately
- ⚠️ Generic webhooks use Feishu JSON format by default; adapt code if using different webhook API

### 📄 License

ISC

---

## 中文

### 📖 简介

为主流 AI CLI 工具（Claude / Codex / Gemini）提供多通道完成提醒。当长时间运行的 AI 任务完成时收到通知，支持自定义耗时阈值和多种通知渠道。

### ✨ 特性

| 功能 | 说明 |
|------|------|
| 🎯 **分源控制** | Claude、Codex、Gemini 独立启用/禁用和耗时阈值设置 |
| 📢 **多通道通知** | Webhook（飞书/钉钉/企微）、Telegram Bot、邮件（SMTP）、桌面通知、声音/TTS |
| ⏱️ **耗时阈值** | 只在任务超过设定分钟数时提醒 - 过滤短任务 |
| 🔄 **双模式** | 计时器模式（`run`/`start-stop`）或日志监听模式（适合交互式 CLI） |
| 🖥️ **桌面 GUI** | 开关切换、阈值控制、语言切换（EN/中文）、系统托盘支持 |
| 📁 **配置分离** | 运行态配置存于 `settings.json`，密钥存于 `.env` 更安全 |

截图在下边

### 🚀 快速开始

#### 📥 安装

**Windows 用户：**
1. 从 [Releases](../../releases) 下载最新的 `ai-cli-complete-notify.exe`
2. 将可执行文件放到你喜欢的文件夹（如 `C:\Tools\`）
3. 复制 `.env.example` 为 `.env`，在同一文件夹中填写你的 Webhook/Token/SMTP（见下方 [配置说明](#-配置)）
4. 双击运行桌面应用，或从命令行使用

**macOS/Linux 用户：**
```bash
git clone <仓库地址>
cd ai-cli-complete-notify
npm install
cp .env.example .env   # Windows 请用 copy .env.example .env
# 运行前先在 .env 中填好 Webhook/Token/SMTP
npm run dev  # 开发模式运行桌面应用
```

#### 🎮 桌面应用使用

1. **启动应用**
   - Windows：双击 `ai-cli-complete-notify.exe`
   - macOS/Linux：运行 `npm run dev`

2. **配置来源**
   - 用开关切换启用/禁用 Claude、Codex 或 Gemini 通知
   - 为每个来源设置"超过多少分钟才提醒"（例如：只在任务运行 > 5 分钟时提醒）
   - 更改会自动保存；如手动改了文件，可点 **重载** 重新读取配置

3. **语言与模式**
   - 使用右上角语言下拉菜单切换中英文
   - 如需监听日志文件而非计时器，启用 **Watch 模式**

4. **系统托盘**
   - 关闭时勾选"记住我的选择"可最小化到托盘
   - 在系统托盘找到图标（Windows：点击 ^ 展开隐藏图标）
   - 右键托盘图标快速访问

界面示意：

![桌面端预览](docs/images/exe预览.png)
![全局通道](docs/images/全局通道.png)
![各来源设置](docs/images/各cli来源.png)
![监听 / 测试 / 高级](docs/images/监听、测试、高级功能.png)

#### 💻 命令行使用

| 命令 | 说明 | 示例 |
|------|------|------|
| `notify` | 立即发送通知（不计时） | `ai-cli-complete-notify.exe notify --source claude --task "分析完成"` |
| `run` | 自动包裹命令并计时 | `ai-cli-complete-notify.exe run --source codex -- codex analyze.py` |
| `start` | 手动开始计时 | `ai-cli-complete-notify.exe start --source gemini --task "训练模型"` |
| `stop` | 手动停止计时 | `ai-cli-complete-notify.exe stop --source gemini --task "训练模型"` |
| `watch` | 自动发现并监听本机 AI CLI 日志 | `ai-cli-complete-notify.exe watch --sources all` |

**详细示例：**

```bash
# 示例 1：即时通知（忽略耗时阈值）
node ai-reminder.js notify --source claude --task "代码审查完成"

# 示例 2：自动计时包裹（如超过阈值则通知）
# Windows
ai-cli-complete-notify.exe run --source codex -- codex "解释 main.py"
# macOS/Linux
node ai-reminder.js run --source codex -- codex "解释 main.py"

# 示例 3：手动计时（适合多步骤工作流）
node ai-reminder.js start --source gemini --task "构建 Docker 镜像"
# ...执行你的工作...
docker build -t myapp .
# ...工作完成...
node ai-reminder.js stop --source gemini --task "构建 Docker 镜像"

# 示例 4：监听日志文件（自动监听本机 AI CLI 日志）
ai-cli-complete-notify.exe watch --sources all --gemini-quiet-ms 3000

# 示例 5：监听特定来源并自定义设置
node ai-reminder.js watch --sources claude,codex \
  --interval-ms 1000 \
  --gemini-quiet-ms 5000 \
  --quiet
```

**CLI 选项参考：**

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--source <名称>` | AI 来源：`claude`、`codex` 或 `gemini` | notify/run/start/stop 必需 |
| `--sources <列表>` | watch 模式用逗号分隔的来源列表 | `all` |
| `--task <描述>` | 通知中显示的任务描述 | notify/start/stop 必需 |
| `--interval-ms <毫秒>` | Watch 模式轮询间隔（毫秒） | `1000` |
| `--gemini-quiet-ms <毫秒>` | Gemini 静默期（毫秒）用于检测完成 | `3000` |
| `--quiet` | 抑制 watch 模式控制台输出 | `false` |
| `--force` | 强制发送通知忽略阈值 | `false` |
| `--duration-minutes <分钟>` | 手动指定任务耗时（用于 notify 命令） | - |

### ⚙️ 配置

#### `.env` 文件（密钥与凭证）

在可执行文件旁边（Windows）或项目根目录（macOS/Linux）创建 `.env` 文件：

```env
# Webhook URLs（飞书/钉钉/企微，逗号分隔）
# 示例：可填多个 webhook，逗号分隔
# https://open.feishu.cn/open-apis/bot/v2/hook/XXXXX
# https://oapi.dingtalk.com/robot/send?access_token=YYYYY
WEBHOOK_URLS=https://open.feishu.cn/open-apis/bot/v2/hook/XXXXX,https://oapi.dingtalk.com/robot/send?access_token=YYYYY

# 通道开关
# NOTIFICATION_ENABLED 控制 Webhook / Telegram / 邮件（桌面通知在 settings.json 中配置）
NOTIFICATION_ENABLED=true
# SOUND_ENABLED 控制声音/TTS 渠道
SOUND_ENABLED=true

# Telegram Bot
TELEGRAM_BOT_TOKEN=你的_bot_token
TELEGRAM_CHAT_ID=你的_chat_id
# 可选：Telegram 代理（国内需要）
# HTTPS_PROXY=http://127.0.0.1:7890

# 邮件（SMTP）
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=yourbot@gmail.com
EMAIL_PASS=你的应用专用密码
EMAIL_FROM=AI Notify <yourbot@gmail.com>
EMAIL_TO=you@example.com

# 可选：覆盖默认配置路径（便携 EXE 使用）
# AI_CLI_COMPLETE_NOTIFY_DATA_DIR=C:\Tools\ai-notify\data
# AI_CLI_COMPLETE_NOTIFY_ENV_PATH=C:\Tools\ai-notify\.env
```

**配置表：**

| 变量 | 必需 | 说明 |
|------|------|------|
| `WEBHOOK_URLS` | 可选 | 逗号分隔的 Webhook URLs（飞书/钉钉/企微 JSON 格式） |
| `NOTIFICATION_ENABLED` | 可选 | 启用 Webhook / Telegram / 邮件渠道（`true`/`false`） |
| `SOUND_ENABLED` | 可选 | 启用声音/TTS 提醒（`true`/`false`） |
| `TELEGRAM_BOT_TOKEN` | 可选* | Telegram bot token（从 @BotFather 获取） |
| `TELEGRAM_CHAT_ID` | 可选* | 你的 Telegram chat ID（从 @userinfobot 获取） |
| `HTTPS_PROXY` | 可选 | Telegram 代理 URL（如果在你的地区被屏蔽） |
| `EMAIL_HOST` | 可选** | SMTP 服务器主机名 |
| `EMAIL_PORT` | 可选** | SMTP 端口（SSL 用 465，TLS 用 587） |
| `EMAIL_SECURE` | 可选** | 使用 SSL/TLS（端口 465 用 `true`） |
| `EMAIL_USER` | 可选** | SMTP 用户名 |
| `EMAIL_PASS` | 可选** | SMTP 密码（Gmail 用应用专用密码） |
| `EMAIL_FROM` | 可选** | 发件人邮箱地址 |
| `EMAIL_TO` | 可选** | 收件人邮箱地址 |

*如需 Telegram 通知则必需
**如需邮件通知则必需

#### `settings.json`（运行态配置）

首次运行自动创建。位置：
- **Windows：** `%APPDATA%\ai-cli-complete-notify\settings.json`
- **macOS：** `~/.ai-cli-complete-notify/settings.json`
- **Linux：** `~/.ai-cli-complete-notify/settings.json`

示例内容：
```json
{
  "version": 2,
  "channels": {
    "webhook": {
      "enabled": true,
      "urls": []
    },
    "telegram": {
      "enabled": true
    },
    "email": {
      "enabled": false
    },
    "sound": {
      "enabled": true,
      "tts": true
    },
    "desktop": {
      "enabled": true
    }
  },
  "sources": {
    "claude": {
      "enabled": true,
      "minDurationMinutes": 5,
      "channels": {
        "webhook": true,
        "telegram": false,
        "email": false,
        "sound": true,
        "desktop": true
      }
    },
    "codex": {
      "enabled": true,
      "minDurationMinutes": 3
    },
    "gemini": {
      "enabled": false,
      "minDurationMinutes": 10
    }
  }
}
```

### 🔧 高级用法

#### Watch 模式工作流

Watch 模式监听日志文件中的 AI 完成信号。适用于：
- VSCode Claude Code 扩展
- 交互式终端会话
- 后台 AI 进程

**工作原理：**
- 自动发现并监听本机 AI CLI 日志文件
- 无需手动指定日志文件路径
- 检测 Claude、Codex、Gemini 的完成模式
- 等待"静默期"（无新输出）后再通知

```bash
# 监听所有 AI 来源
ai-cli-complete-notify.exe watch --sources all

# 监听特定来源并自定义静默期
ai-cli-complete-notify.exe watch \
  --sources claude,codex \
  --interval-ms 1000 \
  --gemini-quiet-ms 5000 \
  --quiet
```

#### 集成示例

**配合 VSCode Claude Code：**
```bash
# 打开 VSCode 前在后台启动监听
ai-cli-complete-notify.exe watch --sources claude --quiet
```

**自定义脚本：**
```bash
#!/bin/bash
# wrap-ai.sh - 任何 AI CLI 工具的包装器

ai-cli-complete-notify.exe start --source codex --task "$1"
codex "$@"
ai-cli-complete-notify.exe stop --source codex --task "$1"
```

### 📦 从源码构建（仅 macOS/Linux）

Windows 用户请从 releases 下载预构建 EXE。

```bash
# 开发模式
npm run dev

# 构建 macOS (x64)
npx electron-packager . ai-cli-complete-notify --platform=darwin --arch=x64

# 构建 macOS (ARM/M1)
npx electron-packager . ai-cli-complete-notify --platform=darwin --arch=arm64

# 构建 Linux
npx electron-packager . ai-cli-complete-notify --platform=linux --arch=x64
```

### 💡 提示与故障排除

| 问题 | 解决方案 |
|------|----------|
| 🔍 找不到托盘图标 | 点击系统托盘的 ^（折叠区）展开隐藏图标，然后固定应用 |
| ⏱️ 收到太多通知 | 增加每个来源的"最小分钟数"阈值 |
| 🔕 收不到通知 | 检查桌面应用或 `settings.json` 中至少启用了一个通道 |
| 📧 邮件不工作 | 验证 SMTP 凭证；Gmail 需使用[应用专用密码](https://support.google.com/accounts/answer/185833) |
| 🤖 Telegram 被屏蔽 | 在 `.env` 中设置 `HTTPS_PROXY` 为可用代理服务器 |
| 📝 Watch 模式检测不到 | 确保 AI CLI 日志正在写入默认位置且应用有读取权限 |

**重要提示：**
- ⚠️ 耗时阈值仅在有计时数据时生效（`run`/`start-stop`/`watch` 模式）
- ⚠️ `notify` 命令忽略阈值立即发送
- ⚠️ 通用 webhook 默认使用飞书 JSON 格式；如使用其他 webhook API 需调整代码
- 自动保存：通道、来源开关/阈值、语言、关闭行为、开机自启动等改动自动保存；“重载”仅重新读取配置并刷新界面。
- 开机自启动：在“高级”中开启（Windows/macOS）；Linux 需自行配置。
- 截图：请放在 `docs/images/` 下，在 README 中用 `![说明](docs/images/xxx.png)` 引用。
- `.env` 处理：运行前先将 `.env.example` 复制为 `.env` 并填好自己的 Webhook/Token/SMTP；`.env` 已在 `.gitignore` 中，提交代码时不要上传个人 `.env`。

### 📄 License

ISC
