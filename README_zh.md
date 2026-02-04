<div align="center">

<img width="128" src="https://github.com/ZekerTop/ai-cli-complete-notify/blob/main/desktop/assets/tray.png?raw=true">

# AI CLI Complete Notify (v1.4.2)

![Version](https://img.shields.io/badge/version-1.4.2-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows%20%7C%20WSL-lightgrey.svg)

[English](README.md) | 中文

![桌面端预览](docs/images/exe预览.png)

</div>

### 📖 简介

面向 Claude Code / Codex / Gemini 的智能任务完成提醒工具，支持多种通知渠道和灵活的配置选项。当 AI 助手完成长时间任务时，自动通过多种方式通知您，让您无需守在电脑前等待。

**支持的通知方式：**

📱 Webhook（飞书/钉钉/企业微信）• 💬 Telegram Bot • 📧 邮件（SMTP）

🖥️ 桌面通知 • 🔊 声音/TTS 提醒 • ⌚ 手环提醒


## ✨ 核心特性（更多详细更新日志见文末）

- 🎯 **智能去抖**：根据任务类型自动调整提醒时机，有工具调用时等待 60 秒，无工具调用时仅需 15 秒
- 🔀 **分源控制**：Claude / Codex / Gemini 独立启用与阈值设置
- 📡 **多通道推送**：同时支持多种通知方式，确保消息送达
- ⏱️ **耗时阈值**：只在任务超过设定时长时提醒，避免频繁打扰
- 👀 **双模式监听**：支持计时模式（`run`/`start-stop`）和日志监听模式（适合交互式 CLI / VSCode）
- 🧠 **AI 摘要（可选）**：任务完成后快速生成简短摘要，超时自动回退
- 🖥️ **桌面应用**：图形界面配置，支持中英文切换、托盘隐藏、开机自启
- 🔐 **配置分离**：运行配置与敏感信息分离，安全可靠

## 💡 推荐配置

**重要提示**：为了获得最佳使用体验，建议在使用 Claude Code / Codex / Gemini 时授予 AI 助手**完整的文件读写权限**。

这样做的好处：
- ✅ 确保任务日志被正确记录到本地文件
- ✅ 监听功能能够准确捕获任务完成状态
- ✅ 提醒时机更加精准，避免误报或漏报
- ✅ AI 可以更好地管理项目文件和配置

## 注意事项

- Claude Code 往往会拆分为多个子任务，为避免每个子任务都提醒，本项目只在“整轮完成”后再通知。
- 监听模式依赖日志变化，需要一个去抖静默时间确认结束，因此提醒不是即时触发（默认有工具调用时 60 秒、无工具调用时 15 秒）。
- 若需更快提醒：Codex/Gemini 可使用 `notify` 或 `run`；Claude Code 仍建议用 `watch` 等待整轮完成。

## 🚀 快速开始

### Windows 用户

1. 从 [Releases](https://github.com/ZekerTop/ai-cli-complete-notify/releases) 下载最新的 `ai-cli-complete-notify-x.x.x.zip`
2. 压缩包解压后放到任意目录（如 `D:\Tools\`）
3. 复制 `.env.example` 为 `.env`，按照里面的要求填写通知配置
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

## 🖥️ 桌面应用使用

### 界面说明

- **顶部栏**：语言切换、Watch 监听开关、窗口控制
- **通道配置**：配置 Webhook、Telegram、邮件等通知渠道
- **来源设置**：为 Claude / Codex / Gemini 分别设置启用状态和耗时阈值
- **监听配置**：设置轮询间隔和去抖时间，支持智能调整
- **确认关键词（可选）**：仅在 Watch 监听生效，用于识别 AI 是否在向你请求确认/授权/继续执行。留空则使用内置关键词库；可用逗号分隔自定义（如：是否,确认,allow,approve）。
- **监听日志**：本地持久化，可一键打开，并支持保留天数设置。
- **测试功能**：测试各通知渠道是否正常工作
- **AI 摘要**：配置 API URL / Key / 模型 与超时回退
- **高级选项**：标题前缀、关闭行为、开机自启动、无感启动、点击通知切回编辑器/终端（受系统焦点限制）

### 界面预览

![桌面端预览](docs/images/exe预览.png)
![全局通道](docs/images/全局通道.png)
![各来源设置](docs/images/各cli来源.png)
![交互式监听](docs/images/交互式监听.png)
![AI 摘要](docs/images/AI摘要.png)
![高级设置](docs/images/高级设置.png)

### 托盘功能

选择"隐藏到托盘"后，应用会最小化到系统托盘。图标可能在任务栏的 ^ 折叠区域中。
开启“无感启动”后，启动即隐藏到托盘且不弹出提示。

## 💻 命令行使用

> WSL 说明：命令行提醒可用（Webhook/Telegram/邮件）。桌面/声音/托盘仅 Windows 支持。日志监听仅在 AI CLI 运行于 WSL（日志位于 `~/.claude`、`~/.codex`、`~/.gemini`）时生效。WSL/CLI 下，AI 摘要与飞书卡片都建议用 `.env` 控制，且 `.env` 优先于 `settings.json`（见下方示例）。

命令行（源码方式）使用前请先执行 `npm install`。

### 直接通知

```bash
# 立即发送通知（忽略阈值）
node ai-reminder.js notify --source claude --task "任务完成"
```

### 日志监听模式（推荐）

```bash
# 自动监听所有 AI 工具的日志
# Windows（EXE）
ai-cli-complete-notify-<版本号>.exe watch --sources all --gemini-quiet-ms 3000 --claude-quiet-ms 60000

# macOS / Linux / WSL（Node）
node ai-reminder.js watch --sources all --gemini-quiet-ms 3000 --claude-quiet-ms 60000
```

### 自动计时模式

```bash
# 自动包裹命令并计时
# Windows（EXE）
ai-cli-complete-notify-<版本号>.exe run --source codex -- codex <参数...>

# macOS / Linux / WSL（Node）
node ai-reminder.js run --source codex -- codex <参数...>
```

说明：`--` 用来分隔本工具参数与“被执行的真实命令”。`codex <参数...>` 代表你要执行的 AI CLI（这里只是示例，也可以换成 `claude` 或 `gemini`）以及它自己的参数。

### 手动计时模式

```bash
# 开始计时
node ai-reminder.js start --source gemini --task "构建项目"

# ...执行您的任务...

# 停止计时并发送通知
node ai-reminder.js stop --source gemini --task "构建项目"
```

### 常用参数

- `--source` / `--sources`：指定 AI 来源（claude / codex / gemini / all）
- `--task`：任务描述
- `--interval-ms`：轮询间隔（毫秒）
- `--gemini-quiet-ms`：Gemini 去抖时间（毫秒）
- `--claude-quiet-ms`：Claude 去抖时间（毫秒）
- `--force`：强制发送通知，忽略阈值

## ⚙️ 配置说明

### 环境变量配置（.env）

从 `.env.example` 复制并填写您的配置：

```env
# Webhook 配置（支持飞书/钉钉/企业微信）
WEBHOOK_URLS=https://open.feishu.cn/open-apis/bot/v2/hook/XXXXX
# 飞书卡片格式（true/false），.env 优先于 settings.json
# WEBHOOK_USE_FEISHU_CARD=false

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

# AI 摘要（可选）
# SUMMARY_ENABLED=false
# SUMMARY_PROVIDER=openai    # 模型平台：openai | anthropic | google | qwen | deepseek
# SUMMARY_API_URL=https://api.openai.com/v1/chat/completions
# SUMMARY_API_KEY=your_api_key
# SUMMARY_MODEL=gpt-4o-mini
# SUMMARY_TIMEOUT_MS=15000
# SUMMARY_PROMPT=你是一个技术助手，请输出一句简短中文摘要（100字以内）。

# 自定义路径（可选）
# AI_CLI_COMPLETE_NOTIFY_DATA_DIR=...
# AI_CLI_COMPLETE_NOTIFY_ENV_PATH=...
```

WSL/CLI 快速设置示例：

```env
# .env（WSL/CLI）
SUMMARY_ENABLED=true
WEBHOOK_USE_FEISHU_CARD=true
```

### 运行时配置（settings.json）

配置文件位置：
- **Windows**: `%APPDATA%\ai-cli-complete-notify\settings.json`
- **macOS / Linux**: `~/.ai-cli-complete-notify/settings.json`

此文件由桌面应用自动管理，包含来源启用状态、阈值等设置。

## 🔧 开发与构建

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

## 📝 使用提示

- ⏱️ **阈值功能**需要有计时数据（通过 `run` / `start-stop` / `watch` 模式），`notify` 命令会忽略阈值直接发送
- 🔗 **Webhook** 默认使用飞书 post 格式；如需飞书 JSON 卡片，可在“高级”中开启“Webhook 使用飞书卡片格式”（监听有输出内容时会附加到卡片中）
- 🚀 **开机自启**功能在"高级"选项卡中配置（支持 Windows / macOS）
- 🎯 **智能去抖**会根据 AI 消息类型自动调整等待时间，提升提醒准确性
- 💡 **监听模式**适合长时间运行，建议设置开机自启或在后台终端中保持运行
- 💡 **EXE 启动默认开启 Watch 监听**：如不需要可在顶部开关关闭。
- 🧭 **点击切回**更可靠，但仍受系统焦点限制；若是 VSCode 插件场景，建议选择 VSCode 目标，并确保 VSCode 未最小化/未被专注助手拦截

## 版本更新

- 1.4.2：
  - Watch 模式确认提醒（支持自定义关键词）
  - 监听日志持久化 + 一键打开 + 保留天数设置
  - EXE 启动自动开启 Watch 监听
  - 桌面通知升级：通知窗UI优化 + 点击切回（可设置目标/强制最大化）
  - 声音提醒增强：自定义声音、TTS 开关、WSL 用 PowerShell 播放
  - 飞书卡片支持 `.env` 开关（WEBHOOK_USE_FEISHU_CARD），且 `.env` 优先
- 1.3.0：
  - 飞书卡片 webhook + LOGO 随系统深浅色切换
  - AI 摘要多模型平台 + 测试 + 流式解析
  - 启用摘要时仅发送摘要（失败回退为输出内容）
  - UI 细节优化（退出弹窗/勾选框/数字步进）
  - watch 日志持久化
  - 摘要测试默认超时 15s
- 1.2.0：
  - 修复隐藏托盘多开问题
  - 增加部分提示
  - 修复中英文切换问题
- 1.1.0：
  - 修复 CC 整轮对话未完成但子任务优先提醒
  - 针对 CC 提供自适应去抖时间，自动识别消息类型
- 1.0.0：
  - 初始版本


## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**享受智能提醒，让 AI 为您工作！** 🎉
