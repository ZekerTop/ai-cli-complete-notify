<div align="center">

# 🔔 AI CLI Complete Notify

**版本：1.1.0**

[English](README.md) | 中文

- ![桌面端预览](docs/images/exe预览.png)

---

### 📖 简介

面向 Claude Code / Codex / Gemini 的智能任务完成提醒工具，支持多种通知渠道和灵活的配置选项。当 AI 助手完成长时间任务时，自动通过多种方式通知您，让您无需守在电脑前等待。

</div>

<div align="center">

**支持的通知方式：**

📱 Webhook（飞书/钉钉/企业微信）• 💬 Telegram Bot • 📧 邮件（SMTP）

🖥️ 桌面通知 • 🔊 声音/TTS 提醒 • ⌚ 手环提醒

</div>

<div align="center">

## ✨ 核心特性

</div>

- 🎯 **智能去抖**：根据任务类型自动调整提醒时机，有工具调用时等待 60 秒，无工具调用时仅需 15 秒
- 🔀 **分源控制**：Claude / Codex / Gemini 独立启用与阈值设置
- 📡 **多通道推送**：同时支持多种通知方式，确保消息送达
- ⏱️ **耗时阈值**：只在任务超过设定时长时提醒，避免频繁打扰
- 👀 **双模式监听**：支持计时模式（`run`/`start-stop`）和日志监听模式（适合交互式 CLI / VSCode）
- 🖥️ **桌面应用**：图形界面配置，支持中英文切换、托盘隐藏、开机自启
- 🔐 **配置分离**：运行配置与敏感信息分离，安全可靠

<div align="center">

## 💡 推荐配置

</div>

**重要提示**：为了获得最佳使用体验，建议在使用 Claude Code / Codex / Gemini 时授予 AI 助手**完整的文件读写权限**。

这样做的好处：
- ✅ 确保任务日志被正确记录到本地文件
- ✅ 监听功能能够准确捕获任务完成状态
- ✅ 提醒时机更加精准，避免误报或漏报
- ✅ AI 可以更好地管理项目文件和配置

<div align="center">

## 🚀 快速开始

</div>

### Windows 用户

1. 从 [Releases](https://github.com/ZekerTop/ai-cli-complete-notify/releases) 下载最新的 `ai-cli-complete-notify-x.x.x.exe`
2. 将程序放到任意目录（如 `C:\Tools\`）
3. 复制 `.env.example` 为 `.env`，填写您的通知配置
4. 双击运行桌面应用

### macOS / Linux 用户

```bash
# 克隆仓库
git clone https://github.com/ZekerTop/ai-cli-complete-notify.git
cd ai-cli-complete-notify

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写您的通知配置

# 运行桌面应用
npm run dev
```

<div align="center">

## 🖥️ 桌面应用使用

</div>

### 界面说明

- **顶部栏**：语言切换、Watch 监听开关、窗口控制
- **通道配置**：配置 Webhook、Telegram、邮件等通知渠道
- **来源设置**：为 Claude / Codex / Gemini 分别设置启用状态和耗时阈值
- **监听配置**：设置轮询间隔和去抖时间，支持智能调整
- **测试功能**：测试各通知渠道是否正常工作
- **高级选项**：标题前缀、关闭行为、开机自启动

### 界面预览

- ![桌面端预览](docs/images/exe预览.png)
- ![全局通道](docs/images/全局通道.png)
- ![各来源设置](docs/images/各cli来源.png)
- ![监听 / 测试 / 高级](docs/images/监听、测试、高级功能.png)

### 托盘功能

选择"隐藏到托盘"后，应用会最小化到系统托盘。图标可能在任务栏的 ^ 折叠区域中。

<div align="center">

## 💻 命令行使用

</div>

### 直接通知

```bash
# 立即发送通知（忽略阈值）
node ai-reminder.js notify --source claude --task "任务完成"
```

### 自动计时模式

```bash
# 自动包裹命令并计时
ai-cli-complete-notify.exe run --source codex -- codex <参数...>
```

### 手动计时模式

```bash
# 开始计时
node ai-reminder.js start --source gemini --task "构建项目"

# ...执行您的任务...

# 停止计时并发送通知
node ai-reminder.js stop --source gemini --task "构建项目"
```

### 日志监听模式

```bash
# 自动监听所有 AI 工具的日志
ai-cli-complete-notify.exe watch --sources all --gemini-quiet-ms 3000
```

### 常用参数

- `--source` / `--sources`：指定 AI 来源（claude / codex / gemini / all）
- `--task`：任务描述
- `--interval-ms`：轮询间隔（毫秒）
- `--gemini-quiet-ms`：Gemini 去抖时间（毫秒）
- `--claude-quiet-ms`：Claude 去抖时间（毫秒）
- `--force`：强制发送通知，忽略阈值

<div align="center">

## ⚙️ 配置说明

</div>

### 环境变量配置（.env）

从 `.env.example` 复制并填写您的配置：

```env
# Webhook 配置（支持飞书/钉钉/企业微信）
WEBHOOK_URLS=https://open.feishu.cn/open-apis/bot/v2/hook/XXXXX

# 桌面通知和声音
NOTIFICATION_ENABLED=true
SOUND_ENABLED=true

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# 邮件配置（可选）
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=465
# EMAIL_SECURE=true
# EMAIL_USER=bot@example.com
# EMAIL_PASS=your_smtp_password
# EMAIL_FROM=AI Notify <bot@example.com>
# EMAIL_TO=you@example.com

# 自定义路径（可选）
# AI_CLI_COMPLETE_NOTIFY_DATA_DIR=...
# AI_CLI_COMPLETE_NOTIFY_ENV_PATH=...
```

### 运行时配置（settings.json）

配置文件位置：
- **Windows**: `%APPDATA%\ai-cli-complete-notify\settings.json`
- **macOS / Linux**: `~/.ai-cli-complete-notify/settings.json`

此文件由桌面应用自动管理，包含来源启用状态、阈值等设置。

### 安全提示

⚠️ `.env` 文件已在 `.gitignore` 中，请勿将包含敏感信息的配置文件提交到代码仓库。

<div align="center">

## 🔧 开发与构建

</div>

### 开发模式

```bash
npm run dev
```

### 构建发布版本

```bash
# Windows 可执行文件
npm run dist

# 或使用 electron-builder
npm run dist:portable

# macOS / Linux
# 在目标系统上使用 electron-packager 或 electron-builder 打包
```

<div align="center">

## 📝 使用提示

</div>

- ⏱️ **阈值功能**需要有计时数据（通过 `run` / `start-stop` / `watch` 模式），`notify` 命令会忽略阈值直接发送
- 🔗 **通用 Webhook** 默认使用飞书 JSON 格式，如需对接其他平台请自行调整格式
- 🚀 **开机自启**功能在"高级"选项卡中配置（支持 Windows / macOS）
- 🎯 **智能去抖**会根据 AI 消息类型自动调整等待时间，提升提醒准确性
- 💡 **监听模式**适合长时间运行，建议设置开机自启或在后台终端中保持运行

<div align="center">

## 📄 许可证

ISC

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**享受智能提醒，让 AI 为您工作！** 🎉

</div>
