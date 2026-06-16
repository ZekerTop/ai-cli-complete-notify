<div align="center">

<img width="128" src="https://github.com/ZekerTop/ai-cli-complete-notify/blob/main/desktop/assets/tray.png?raw=true">

# AI CLI Complete Notify (v2.8.0)

![Version](https://img.shields.io/badge/version-2.8.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows%20%7C%20WSL-lightgrey.svg)

[English](README.md) | [简体中文](README_zh.md) | 繁體中文 | [한국어](README_ko.md) | [日本語](README_ja.md)

![介面預覽](docs/images/通道.png)

</div>

### 📖 簡介

AI CLI Complete Notify 是面向 Claude Code / Codex / OpenCode / Gemini 的任務完成提醒工具。它可以在 AI 助手完成長時間任務後，透過桌面通知、聲音、Webhook、Telegram、Email 等方式提醒你，不必一直守在電腦前等待。

**支援的通知方式：**

📱 Webhook（飛書 / 釘釘 / 企業微信）• 💬 Telegram Bot • 📧 Email（SMTP）

🖥️ 桌面通知 • 🔊 聲音 / TTS 提醒 • ⌚ 手環 / 手錶提醒（透過既有通知鏈路間接接入）

## ✨ 核心特性

- 🎯 **智慧去抖**：依任務類型自動調整提醒時機，有工具呼叫時等待 60 秒，無工具呼叫時僅需 15 秒。
- 🔀 **來源控制**：Claude / Codex / OpenCode / Gemini 可分別設定啟用狀態、耗時閾值與通知通道。
- 📡 **多通道推送**：Webhook、Telegram、Email、桌面通知與聲音可以同時啟用。
- ⏱️ **耗時閾值**：只在任務超過指定時長後提醒，避免頻繁打擾。
- 🪝 **Hooks + Watch 混合模式**：Claude Code / Gemini CLI 可使用原生 Hook，OpenCode 可使用全域插件事件，Codex 仍以日誌監聽為主。
- 🧠 **AI 摘要（可選）**：任務完成後產生短摘要，逾時或失敗時會回退到原始內容。
- 🖥️ **桌面應用**：圖形化配置、語言切換、隱藏到托盤 / macOS 選單列、開機自啟。
- 🔐 **設定分離**：執行設定與敏感憑證分離，`.env` 優先保存 Token、Webhook、Email 等資訊。

## 💡 建議設定

為了獲得最佳體驗，使用 Claude Code / Codex / OpenCode / Gemini 時，建議授予 AI 助手完整的檔案讀寫權限。

這樣可以確保任務日誌被正確寫入本機檔案，讓 Watch 模式更準確地判斷任務是否真正完成，減少誤報或漏報。

## 注意事項

- Claude Code 經常會把一個請求拆成多個子任務。為避免每個子任務都提醒，本工具只在整輪完成後發送提醒。
- Watch 模式依賴日誌變化，需要一段去抖靜默時間確認結束，因此提醒不是即時觸發。
- 若想要更快、更準確的提醒：Claude Code / Gemini CLI 優先使用 Hook，OpenCode 優先使用全域插件，Codex 或兜底場景繼續使用 Watch。

## Hooks 與 Watch 的差異

- **Hook / 插件事件** 直接使用 AI CLI 自身發出的生命週期事件，完成時機更接近真實狀態。
- **Hook** 不需要為對應工具長期常駐背景監聽器，空閒開銷更低。
- **Watch** 是通用兜底方案，適合 Codex，也適合尚未配置 Hook 的場景。

## 🚀 快速開始

### Windows 使用者

1. 從 [Releases](https://github.com/ZekerTop/ai-cli-complete-notify/releases) 下載最新的 `ai-cli-complete-notify-<版本號>-portable-win-x64.zip`。
2. 解壓縮到任意目錄，例如 `D:\Tools\`。
3. 複製 `.env.example` 為 `.env`，並填入通知設定。
4. 雙擊執行桌面應用。

### macOS / Linux 使用者

原始碼 / 開發模式需要 Node.js/npm 和 Rust/Cargo。Tauri 執行 `npm run dev` 時會呼叫 `cargo`；如果 `cargo --version` 失敗，請先從 [Rust 官方安裝頁面](https://www.rust-lang.org/tools/install) 安裝 Rust。

```bash
# 複製專案
git clone https://github.com/ZekerTop/ai-cli-complete-notify.git
cd ai-cli-complete-notify

# 確認 Rust/Cargo 可用
cargo --version

# 安裝依賴
npm install

# 設定環境變數（原始碼 / 開發模式）
cp .env.example .env
# 編輯 .env，填入通知設定

# 啟動桌面應用
npm run dev
```

建置可雙擊開啟的 macOS 應用：

```bash
# 產生 .app
npm run dist:mac:app

# 產生 .dmg（用於分發）
npm run dist:mac:dmg
```

## 🖥️ 桌面應用

### 介面說明

- **頂部列**：語言切換、Watch 監聽開關、視窗控制。
- **通道設定**：設定 Webhook、Telegram、Email、桌面通知與聲音。
- **來源設定**：分別設定 Claude / Codex / OpenCode / Gemini 的啟用狀態與耗時閾值。
- **監聽設定**：設定輪詢間隔與去抖時間。
- **確認提醒（預設關閉）**：僅在 Codex 出現需要選擇 / 提交的互動提示時提醒。
- **AI 摘要**：設定 API URL、Key、模型與逾時回退。
- **進階選項**：標題前綴、關閉行為、開機自啟、無感啟動、點擊通知切回。

### 介面預覽

![Global Channels](docs/images/通道.png)
![Source Settings](docs/images/各cli来源.png)
![Interactive monitoring](docs/images/交互式监听.png)
![Hook Integration](docs/images/Hook集成.png)
![AI Summary](docs/images/AI摘要.png)
![Advanced Settings](docs/images/系统设置.png)

## 💻 命令列使用

Windows 便攜版：

- `ai-cli-complete-notify.exe` 是桌面 GUI。
- `ai-reminder.exe` 是 CLI / sidecar，可在終端中使用。

### 查看說明

```bash
# 原始碼 / Node
node ai-reminder.js help

# Windows 便攜版
ai-reminder.exe help
```

### 直接通知

```bash
node ai-reminder.js notify --source claude --task "任務完成"
```

### 原生 Hook / 插件模式

```bash
# 查看 Hook 狀態
node ai-reminder.js hooks status

# 安裝 Claude Code Hook
node ai-reminder.js hooks install --target claude

# 安裝 Gemini CLI Hook
node ai-reminder.js hooks install --target gemini

# 安裝 OpenCode 全域插件
node ai-reminder.js hooks install --target opencode
```

### Watch 日誌監聽

```bash
# Windows
ai-reminder.exe watch --sources all --gemini-quiet-ms 3000 --claude-quiet-ms 60000

# macOS / Linux / WSL
node ai-reminder.js watch --sources all --gemini-quiet-ms 3000 --claude-quiet-ms 60000
```

### 自動計時

```bash
# Windows
ai-reminder.exe run --source codex -- codex <args...>

# macOS / Linux / WSL
node ai-reminder.js run --source codex -- codex <args...>
```

### 診斷

```bash
# 查看 settings.json、狀態檔與 watch 日誌路徑
node ai-reminder.js paths

# 查看目前生效設定
node ai-reminder.js config

# 檢查 .env；缺失時產生 .env.example
node ai-reminder.js env-status --create-example
```

## ⚙️ 設定

### `.env` 放置位置

- **Windows 便攜版**：放在 `ai-cli-complete-notify.exe` 同目錄。
- **macOS 打包版（.app / .dmg）**：放在 `~/.ai-cli-complete-notify/.env`。不要放進 `.app` 包內，也不要依賴 `.dmg` 的唯讀目錄。
- **原始碼 / CLI 模式**：可放在專案根目錄或資料目錄。

macOS 桌面版首次啟動會自動檢查 `.env`。如果找不到，會在資料目錄建立 `.env.example` 並提示你設定；如果 Finder 看不到 `.env.example`，按 `Command + Shift + .` 顯示隱藏檔案。

```env
WEBHOOK_URLS=https://open.feishu.cn/open-apis/bot/v2/hook/XXXXX
NOTIFICATION_ENABLED=true
SOUND_ENABLED=true

TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# AI 摘要（可選）
# SUMMARY_ENABLED=false
# SUMMARY_PROVIDER=openai
# SUMMARY_API_URL=https://api.openai.com
# SUMMARY_API_KEY=your_api_key
# SUMMARY_MODEL=gpt-4o-mini
# SUMMARY_TIMEOUT_MS=30000
```

### `settings.json`

- **Windows**：`%APPDATA%\ai-cli-complete-notify\settings.json`
- **macOS / Linux**：`~/.ai-cli-complete-notify/settings.json`

此檔案由桌面應用自動管理，包含來源啟用狀態、閾值與 UI 設定。

## 🔧 開發與建置

```bash
# Tauri 開發模式
npm run dev

# 僅前端
npm run dev:ui

# 依目前平台選擇產物
npm run dist

# Windows 便攜版
npm run dist:portable

# macOS .app
npm run dist:mac:app

# macOS .dmg
npm run dist:mac:dmg
```

macOS 建議：

- 日常使用請從 `.dmg` 拖到 `/Applications` 後執行。
- 不建議長期直接從 Desktop 或 Downloads 執行 `.app`，否則 macOS 可能反覆提示允許存取桌面 / 下載資料夾。
- 正式公開分發時，可能還需要 Apple Developer 簽名與 notarization 公證。

## 📝 使用提示

- `notify` 會忽略耗時閾值並直接發送提醒。
- Webhook 預設使用飛書 post 格式；企業微信 / 釘釘會自動使用文字格式。
- 手環 / 手錶提醒通常透過手機通知同步、Webhook 中轉、Telegram 或 Email 間接實現。
- Hooks / 插件模式較適合 Claude Code / Gemini CLI / OpenCode；Watch 主要保留給 Codex 或兜底場景。

## 版本歷史

<details>
<summary>展開 / 收合版本歷史</summary>

> `v2.x` 是目前的 Tauri 桌面版本線；`v1.x` 是舊 Electron 版本線。完整舊版本歷史可參考 [English](README.md) 或 [简体中文](README_zh.md)。

### 2.8.0

- 新增 AI 摘要測試鏈路：桌面端測試時會真實發送一則測試通知，並同時顯示摘要生成與通知送達結果。
- 優化 AI 摘要 API URL 提示，說明基礎地址、完整接口地址和結尾 `/` / `#` 的處理規則。
- 修復摘要測試 JSON 解析問題，避免 webhook 日誌污染 stdout。
- AI 摘要預設逾時調整為 30 秒，並將舊的 15 秒預設值自動遷移至 30 秒，降低慢速 API 意外回退的機率。
- AI 摘要測試結果框新增成功 / 失敗顏色，成功顯示綠色，失敗顯示紅色。
- 新增 Webhook「附帶原始輸出」選項：AI 摘要成功時可選擇只顯示摘要或同時附帶原文；同時顯示時會用分隔線區分 AI 摘要和原文。摘要未啟用或失敗時仍保留原文，避免通知為空，並在 Webhook 中直接顯示失敗原因，例如 `AI 摘要：請求逾時，已顯示原文`。
- 非卡片 Webhook 可透過 `WEBHOOK_OUTPUT_MAX_LENGTH` 限制原始輸出長度。

### 2.7.0

- 新增 macOS 桌面端相容：打包後的 `.app` 改為透過 Tauri 原生通知發送桌面通知，避免反覆彈出 AppleScript 存取提示；CLI / 原始碼執行時仍保留 `osascript display notification` 作為兜底。聲音提醒支援 `say` / `beep`，自訂音訊支援 `afplay`。
- 新增 macOS Tauri sidecar 建置鏈路，依目前架構產生 `ai-reminder-aarch64-apple-darwin` 或 `ai-reminder-x86_64-apple-darwin`，解決 macOS 打包時 sidecar 命名不匹配的問題。
- 新增 macOS 打包腳本：`npm run dist:mac:app` 產生可雙擊開啟的 `.app`，`npm run dist:mac:dmg` 產生用於分發的 `.dmg`。
- `npm run dist` 改為依目前平台選擇建置產物：Windows 繼續輸出便攜版，macOS 輸出 `.app`。
- 明確 macOS 打包版 `.env` 位置為 `~/.ai-cli-complete-notify/.env`，並在 `paths` 命令中輸出建議路徑；Windows 便攜版繼續支援 exe 同目錄 `.env`。
- macOS 桌面版啟動時會檢查 `.env`：缺失時自動建立 `.env.example` 並提醒使用者設定，存在時顯示設定載入成功；提示中會說明 Finder 看不到隱藏檔案時可按 `Command + Shift + .` 顯示，再複製 `.env.example` 為 `.env`。
- 修復桌面介面「開啟設定檔」能力在非 Windows 平台不可用的問題，macOS 現在使用系統 `open` 命令開啟檔案。
- 修復前端側欄版本號仍顯示舊版本的問題，版本號改為從 `package.json` 注入建置，不再手寫。
- 修復 macOS 隱藏到托盤 / 選單列後無法可靠重新開啟的問題。
- README 補充 macOS 安裝、權限提示與分發注意事項。

</details>

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request。

## 🔗 連結

- [LINUX DO](https://linux.do/)

## 📈 專案統計

<a href="https://www.star-history.com/#ZekerTop/ai-cli-complete-notify&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ZekerTop/ai-cli-complete-notify&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ZekerTop/ai-cli-complete-notify&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ZekerTop/ai-cli-complete-notify&type=date&legend=top-left" />
 </picture>
</a>

---

**享受智慧提醒，讓 AI 替你工作。** 🎉
