<div align="center">

<img width="128" src="https://github.com/ZekerTop/ai-cli-complete-notify/blob/main/desktop/assets/tray.png?raw=true">

# AI CLI Complete Notify (v2.8.0)

![Version](https://img.shields.io/badge/version-2.8.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows%20%7C%20WSL-lightgrey.svg)

[English](README.md) | [简体中文](README_zh.md) | [繁體中文](README_zh-TW.md) | [한국어](README_ko.md) | 日本語

![UI Preview](docs/images/通道.png)

</div>

### 📖 概要

AI CLI Complete Notify は、Claude Code / Codex / OpenCode / Gemini 向けのタスク完了通知ツールです。AI アシスタントが長時間の作業を終えたときに、デスクトップ通知、サウンド、Webhook、Telegram、Email など複数の経路で通知します。作業が終わるまで画面の前で待ち続ける必要はありません。

**対応している通知方法:**

📱 Webhook（Feishu / DingTalk / WeCom）• 💬 Telegram Bot • 📧 Email（SMTP）

🖥️ デスクトップ通知 • 🔊 サウンド / TTS 通知 • ⌚ スマートバンド / ウォッチ通知（既存の通知経路を利用）

## ✨ 主な機能

- 🎯 **スマートデバウンス**: タスクの種類に応じて通知タイミングを自動調整します。ツール呼び出しがある場合は基本 60 秒、ない場合は基本 15 秒待ちます。
- 🔀 **ソース別制御**: Claude / Codex / OpenCode / Gemini ごとに有効化、所要時間しきい値、通知チャネルを設定できます。
- 📡 **複数チャネル通知**: Webhook、Telegram、Email、デスクトップ通知、サウンドを同時に利用できます。
- ⏱️ **所要時間しきい値**: 指定時間を超えたタスクだけ通知し、細かすぎる通知を減らします。
- 🪝 **Hooks + Watch 統合**: Claude Code / Gemini CLI はネイティブ Hook、OpenCode はグローバルプラグインイベントを利用でき、Codex は主にログ Watch を使います。
- 🧠 **AI Summary（任意）**: タスク完了後に短い要約を生成し、失敗またはタイムアウト時は元の内容にフォールバックします。
- 🖥️ **デスクトップアプリ**: GUI 設定、言語切り替え、トレイ / macOS メニューバーへの格納、ログイン時起動に対応します。
- 🔐 **設定の分離**: 実行設定と Token / Webhook / Email などの機密情報を分けて管理できます。

## 💡 推奨設定

最適な体験のため、Claude Code / Codex / OpenCode / Gemini を使う際は、AI ツールに十分なファイル読み書き権限を付与することをおすすめします。

これによりローカルログが安定して記録され、Watch モードがタスク完了をより正確に判断できます。誤通知や通知漏れを減らす効果があります。

## 注意事項

- Claude Code は 1 つの依頼を複数のサブタスクに分けることがあります。通知が多くなりすぎないよう、このツールは全体のターンが完了したときだけ通知します。
- Watch モードはログの変化から完了を推定するため、一定の静かな時間を待ってから通知します。即時通知ではありません。
- より速く正確な通知が必要な場合、Claude Code / Gemini CLI は Hook、OpenCode はグローバルプラグインを優先してください。Codex や fallback 用途では Watch を使います。

## Hooks と Watch の違い

- **Hook / プラグインイベント** は AI CLI 自身が発行するライフサイクルイベントを使うため、実際の完了時点に近い通知ができます。
- **Hook** は対象ツールに対して長時間のバックグラウンドログ監視を常駐させる必要がありません。
- **Watch** は汎用 fallback です。Codex や Hook 未設定の環境で有用です。

## 🚀 クイックスタート

### Windows ユーザー

1. [Releases](https://github.com/ZekerTop/ai-cli-complete-notify/releases) から最新の `ai-cli-complete-notify-<version>-portable-win-x64.zip` をダウンロードします。
2. zip を展開し、任意のフォルダに置きます。例: `D:\Tools\`
3. `.env.example` を `.env` にコピーし、通知設定を入力します。
4. デスクトップアプリをダブルクリックして起動します。

### macOS / Linux ユーザー

ソース / 開発モードには Node.js/npm と Rust/Cargo が必要です。Tauri は `npm run dev` の実行中に `cargo` を呼び出します。`cargo --version` が失敗する場合は、先に [Rust 公式インストールページ](https://www.rust-lang.org/tools/install) から Rust をインストールしてください。

```bash
# リポジトリを clone
git clone https://github.com/ZekerTop/ai-cli-complete-notify.git
cd ai-cli-complete-notify

# Rust/Cargo が使えることを確認
cargo --version

# 依存関係をインストール
npm install

# 環境変数を設定（ソース / 開発モード）
cp .env.example .env
# .env を編集して通知設定を入力

# デスクトップアプリを起動
npm run dev
```

macOS でダブルクリック可能なアプリをビルドする場合:

```bash
# .app をビルド
npm run dist:mac:app

# 配布用 .dmg をビルド
npm run dist:mac:dmg
```

## 🖥️ デスクトップアプリ

### 画面構成

- **トップバー**: 言語切り替え、Watch トグル、ウィンドウ操作。
- **チャネル設定**: Webhook、Telegram、Email、デスクトップ通知、サウンドを設定。
- **ソース設定**: Claude / Codex / OpenCode / Gemini ごとの有効化と所要時間しきい値を設定。
- **監視設定**: ポーリング間隔とデバウンス時間を設定。
- **確認通知（デフォルト OFF）**: Codex が選択 / 送信を必要とする対話プロンプトを表示した場合のみ通知します。
- **AI Summary**: API URL、Key、モデル、タイムアウト fallback を設定。
- **詳細設定**: タイトル接頭辞、閉じる動作、自動起動、サイレント起動、通知クリックで戻る。

### 画面プレビュー

![Global Channels](docs/images/通道.png)
![Source Settings](docs/images/各cli来源.png)
![Interactive monitoring](docs/images/交互式监听.png)
![Hook Integration](docs/images/Hook集成.png)
![AI Summary](docs/images/AI摘要.png)
![Advanced Settings](docs/images/系统设置.png)

## 💻 CLI の使い方

Windows portable ビルドでは:

- `ai-cli-complete-notify.exe` はデスクトップ GUI です。
- `ai-reminder.exe` はターミナルで使う CLI / sidecar です。

### ヘルプ

```bash
# ソース / Node
node ai-reminder.js help

# Windows portable EXE
ai-reminder.exe help
```

### 即時通知

```bash
node ai-reminder.js notify --source claude --task "タスク完了"
```

### ネイティブ Hook / プラグインモード

```bash
# Hook 状態を確認
node ai-reminder.js hooks status

# Claude Code Hook をインストール
node ai-reminder.js hooks install --target claude

# Gemini CLI Hook をインストール
node ai-reminder.js hooks install --target gemini

# OpenCode グローバルプラグインをインストール
node ai-reminder.js hooks install --target opencode
```

### Watch ログ監視

```bash
# Windows
ai-reminder.exe watch --sources all --gemini-quiet-ms 3000 --claude-quiet-ms 60000

# macOS / Linux / WSL
node ai-reminder.js watch --sources all --gemini-quiet-ms 3000 --claude-quiet-ms 60000
```

### 自動タイマー

```bash
# Windows
ai-reminder.exe run --source codex -- codex <args...>

# macOS / Linux / WSL
node ai-reminder.js run --source codex -- codex <args...>
```

### 診断

```bash
# settings.json、状態ファイル、watch ログパスを表示
node ai-reminder.js paths

# 現在有効なランタイム設定を表示
node ai-reminder.js config

# .env の存在確認。なければ .env.example を生成
node ai-reminder.js env-status --create-example
```

## ⚙️ 設定

### `.env` の場所

- **Windows portable ビルド**: `ai-cli-complete-notify.exe` と同じフォルダに置きます。
- **パッケージ済み macOS アプリ（.app / .dmg）**: `~/.ai-cli-complete-notify/.env` に置きます。`.app` バンドル内や読み取り専用の `.dmg` ボリュームには依存しないでください。
- **ソース / 開発 / CLI モード**: プロジェクトルートまたはデータディレクトリに置けます。

パッケージ済み macOS アプリは初回起動時に `.env` を自動チェックします。見つからない場合はデータディレクトリに `.env.example` を作成し、設定案内を表示します。Finder で `.env.example` が見えない場合は `Command + Shift + .` で隠しファイルを表示してください。

```env
WEBHOOK_URLS=https://open.feishu.cn/open-apis/bot/v2/hook/XXXXX
NOTIFICATION_ENABLED=true
SOUND_ENABLED=true

TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# AI summary(optional)
# SUMMARY_ENABLED=false
# SUMMARY_PROVIDER=openai
# SUMMARY_API_URL=https://api.openai.com
# SUMMARY_API_KEY=your_api_key
# SUMMARY_MODEL=gpt-4o-mini
# SUMMARY_TIMEOUT_MS=30000
```

### `settings.json`

- **Windows**: `%APPDATA%\ai-cli-complete-notify\settings.json`
- **macOS / Linux**: `~/.ai-cli-complete-notify/settings.json`

このファイルはデスクトップアプリが自動管理し、ソースの有効化状態、しきい値、UI 設定を保存します。

## 🔧 開発とビルド

```bash
# Tauri 開発モード
npm run dev

# フロントエンドのみ
npm run dev:ui

# 現在のプラットフォーム向けにビルド
npm run dist

# Windows portable
npm run dist:portable

# macOS .app
npm run dist:mac:app

# macOS .dmg
npm run dist:mac:dmg
```

macOS の注意:

- 通常利用では `.dmg` から `/Applications` にドラッグして実行してください。
- Desktop や Downloads から `.app` を長期的に直接実行すると、macOS がフォルダアクセス権限を繰り返し求めることがあります。
- 公開配布には Apple Developer 署名と notarization が必要になる場合があります。

## 📝 使い方のヒント

- `notify` は時間しきい値を無視して即時通知します。
- Webhook はデフォルトで Feishu post 形式を使います。WeCom / DingTalk はテキスト形式で送信されます。
- スマートバンド / ウォッチ通知は、通常スマートフォン通知同期、Webhook relay、Telegram、Email を通じて間接的に実現します。
- Hooks / プラグインモードは Claude Code / Gemini CLI / OpenCode に向いています。Watch は主に Codex または fallback 用です。

## 変更履歴

<details>
<summary>バージョン履歴を表示</summary>

> `v2.x` は現在の Tauri ベースのデスクトップラインで、`v1.x` は旧 Electron ラインです。過去の完全な履歴は [English](README.md) または [简体中文](README_zh.md) を参照してください。

### 2.8.0

- 実際のテスト通知を送信し、AI Summary の生成結果と通知配信結果を UI に表示するテスト経路を追加しました。
- AI Summary API URL 入力の説明を改善し、base URL、完全な endpoint、末尾の `/` / `#` の扱いを明示しました。
- Webhook ログが stdout を汚染して要約テストの JSON 解析を壊す問題を修正しました。
- AI Summary のデフォルトタイムアウトを 30 秒に延長し、旧 15 秒のデフォルト値も 30 秒へ自動移行して、遅い API で意図せず fallback する可能性を減らしました。
- AI Summary テスト結果ボックスに成功 / 失敗の色分けを追加しました。成功は緑、失敗は赤で表示します。
- Webhook に原文出力を含める / 隠すオプションを追加しました。AI Summary が成功した場合、要約のみ送るか原文も一緒に送るかを選べます。一緒に送る場合は区切り線とラベルで AI 要約と原文を明確に分けます。AI Summary が無効または失敗した場合も、空の通知を避けるため原文を残し、失敗理由を `AI Summary: request timed out, original output is shown` のように inline で表示します。
- 非カード Webhook の原文出力長を `WEBHOOK_OUTPUT_MAX_LENGTH` で制限できるようにしました。

### 2.7.0

- macOS デスクトップ互換性を追加しました。パッケージ済み `.app` は Tauri ネイティブ通知でデスクトップ通知を送るため、AppleScript アクセス権限プロンプトの繰り返しを減らします。CLI / ソース実行では fallback として `osascript display notification` を維持します。サウンド通知は `say` / `beep` をサポートし、カスタム音声ファイルは `afplay` を使います。
- macOS Tauri sidecar ビルド経路を追加しました。現在のアーキテクチャに応じて `ai-reminder-aarch64-apple-darwin` または `ai-reminder-x86_64-apple-darwin` を生成し、パッケージ済み macOS ビルドが sidecar を正しく見つけられるようにしました。
- macOS パッケージングスクリプトを追加しました。`npm run dist:mac:app` はダブルクリック可能な `.app` を生成し、`npm run dist:mac:dmg` は配布用 `.dmg` を生成します。
- `npm run dist` は現在のプラットフォームに応じて出力を選ぶようになりました。Windows は portable パッケージを維持し、macOS は `.app` をビルドします。
- macOS パッケージ版の `.env` 位置を `~/.ai-cli-complete-notify/.env` と明確化し、`paths` 出力にも追加しました。Windows portable ビルドは引き続き exe と同じ場所の `.env` をサポートします。
- パッケージ済み macOS アプリは起動時に `.env` を確認します。存在しない場合は `.env.example` を作成して設定案内を表示し、存在する場合は設定読み込み成功状態を表示します。Finder で隠しファイルが見えない場合に `Command + Shift + .` を押してから `.env.example` を `.env` にコピーする案内も含みます。
- Windows 以外で「Open config file」が使えなかった問題を修正しました。macOS ではシステムの `open` コマンドを使います。
- フロントエンドサイドバーのバージョンが古い値のまま残る問題を修正しました。バージョンは手書きせず、ビルド時に `package.json` から注入します。
- macOS でトレイ / メニューバーに隠した後、ウィンドウを再表示しづらい問題を修正しました。
- README に macOS インストール、権限プロンプト、配布時の注意事項を追加しました。

</details>

## 🤝 コントリビュート

Issue と Pull Request を歓迎します。

## 🔗 リンク

- [LINUX DO](https://linux.do/)

## 📈 プロジェクト統計

<a href="https://www.star-history.com/#ZekerTop/ai-cli-complete-notify&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ZekerTop/ai-cli-complete-notify&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ZekerTop/ai-cli-complete-notify&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ZekerTop/ai-cli-complete-notify&type=date&legend=top-left" />
 </picture>
</a>

---

**スマート通知で、AI に仕事を任せましょう。** 🎉
