<div align="center">

<img width="128" src="https://github.com/ZekerTop/ai-cli-complete-notify/blob/main/desktop/assets/tray.png?raw=true">

# AI CLI Complete Notify (v2.16.0)

![Version](https://img.shields.io/badge/version-2.16.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows%20%7C%20WSL-lightgrey.svg)
[![macOS DMG をダウンロード](https://img.shields.io/github/v/release/ZekerTop/ai-cli-complete-notify?label=macOS%20DMG&logo=apple)](https://github.com/ZekerTop/ai-cli-complete-notify/releases/latest)

[English](README.md) | [简体中文](README_zh.md) | [繁體中文](README_zh-TW.md) | [한국어](README_ko.md) | 日本語

![UI Preview](docs/images/home-v2.16.0.png)

</div>

## Sponsors

> [👉 このプロジェクトをスポンサー支援しませんか？](mailto:top.zeker@gmail.com)

<table>
  <tr>
    <td align="center" width="180">
      <a href="https://gptplus.uno"><img src="https://www.gptplus.uno/image/logo.png" alt="gptplus.uno" width="100" /></a><br />
      <a href="https://gptplus.uno"><strong>gptplus.uno</strong></a>
    </td>
    <td><a href="https://gptplus.uno"><strong>gptplus.uno</strong></a> は、ChatGPT Plus / Pro の購入・アップグレードガイド、プラン選びのアドバイス、FAQ、セルフトラブルシューティングを提供し、WeChat Pay と Alipay での支払いに対応しています。本オープンソースプロジェクトへのご支援に感謝します。</td>
  </tr>
</table>

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

#### macOS: DMG を直接インストール（推奨）

1. [GitHub Releases](https://github.com/ZekerTop/ai-cli-complete-notify/releases/latest) から、お使いの Mac に合った DMG をダウンロードします。
   - Apple Silicon（M シリーズ）: `ai-cli-complete-notify_<version>_aarch64.dmg`
   - Intel: `ai-cli-complete-notify_<version>_x86_64.dmg`
2. DMG を開き、`ai-cli-complete-notify.app` を「Applications」にドラッグします。
3. 初回起動時に開発元を確認できないと表示された場合は、アプリを右クリックして「開く」を選択します。
4. パッケージ版は `~/.ai-cli-complete-notify/.env` から通知設定を読み込みます。初回起動時に設定がない場合は、同じディレクトリに `.env.example` が作成されます。

> macOS 13.5 以降が必要です（同梱の Node.js ランタイムの最低要件）。「この Mac について」でチップまたはプロセッサを確認できます。アーキテクチャ別の独立したパッケージであり、Universal バイナリではありません。どちらも Node.js を同梱しているため、DMG のインストールに Node.js/npm や Rust/Cargo の追加インストールは不要です。

#### ソースから実行（macOS / Linux）

以下の手順は、Linux、開発、またはソースからビルドしたい場合にのみ必要です。ソース / 開発モードには Node.js/npm と Rust/Cargo が必要です。Tauri は `npm run dev` の実行中に `cargo` を呼び出します。`cargo --version` が失敗する場合は、先に [Rust 公式インストールページ](https://www.rust-lang.org/tools/install) から Rust をインストールしてください。

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

任意: ソースからダブルクリック可能な macOS アプリをビルドする場合:

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
- **詳細設定**: タイトル接頭辞、閉じる動作、自動起動、サイレント起動、Dock アイコンの非表示（macOS のみ）、通知クリックで戻る。

### 画面プレビュー

![Global Channels](docs/images/通道.png)
![Source Settings](docs/images/各cli来源.png)
![Interactive monitoring](docs/images/交互式监听.png)
![Hook Integration](docs/images/Hook集成.png)
![AI Summary](docs/images/AI摘要.png)
![Advanced Settings](docs/images/系统设置.png)

### トレイとメニューバー

「トレイに隠す」を選択すると、ウィンドウを非表示にしてアプリの実行を継続します。Windows ではアイコンがタスクバーの ^ 内に格納される場合があります。macOS ではメニューバーのアイコンからウィンドウを再表示できます。サイレント起動を有効にすると、起動時からウィンドウを非表示にし、ポップアップも表示しません。

macOS では **Advanced → Hide from Dock (show only in macOS menu bar)** で Dock アイコンを非表示にできます。デフォルトは OFF で、設定は `ui.hideDockIcon` に保存されます。サイレント起動やウィンドウを閉じる動作とは独立した設定です。非表示にした後は、メニューバーのアイコンをクリックするか、そのメニューで **Show** を選択してウィンドウを再表示します。Ice などのメニューバー管理ツールを使用していてアイコンが見つからない場合は、非表示セクションとメニューバーの空きスペースを確認し、管理ツールのレイアウトを更新してください。

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

# Herdr プラグイン（herdr-ai-notify）をインストールして自動設定
node ai-reminder.js hooks install --target herdr
```

### オプションのサードパーティーツール（Herdr）

**Third-party tools → Herdr** を開くと状態を自動確認します。**① Check → ② Install and connect plugin…** の順で操作し、その後に通知を有効にします。Herdr は、同じウィンドウで Codex などの AI ツールを実行・管理する独立したターミナルツールです。通知対象は Herdr 内のタスクのみで、Codex デスクトップ版の利用には不要です。Herdr ≥ 0.7.0、Bash、Python 3 が必要です。macOS アプリは同梱 Node を使用します。準備完了・成功は緑、設定が必要な状態は黄色で表示します。Herdr をオフにするとチャネル操作はグレー表示で無効になり、選択は保持されます。通常の起動や watch では Herdr を呼び出さず、ページを開くだけでインストールすることもありません。カスタム設定と既存の AI 連携を保持し、選択済みかつ全体で有効なチャネルのみを使用します。同じタスクでネイティブ連携と併用すると通知が重複する場合があります。**?** をクリックすると説明を表示・非表示にできます。**Plugin repository** は [herdr-ai-notify](https://github.com/8liang/herdr-ai-notify)、貢献者リンクは [8liang](https://github.com/8liang) の GitHub プロフィールを開きます。

```bash
# Explicit plugin status (ordinary hooks status does not run Herdr)
node ai-reminder.js hooks status --target herdr
# Configuration does not enable this app's Herdr notifications
node ai-reminder.js hooks install --target herdr
# Enable only after reviewing duplicate-notification risks
node ai-reminder.js config --set '{"sources":{"herdr":{"enabled":true}}}'
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
# DingTalk カスタムロボットのセキュリティキーワードを「AI提醒」に設定してください。すべての Webhook メッセージにこの文字列が含まれます
# オプション: ソース別の上書き。設定したソースは専用 URL のみに送信します
# CLAUDE_WEBHOOK_URLS=https://example.com/claude-hook
# CODEX_WEBHOOK_URLS=https://example.com/codex-hook
# GEMINI_WEBHOOK_URLS=https://example.com/gemini-hook
# OPENCODE_WEBHOOK_URLS=https://example.com/opencode-hook
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

- Node.js と Rust の対象アーキテクチャを揃えてビルドしてください。sidecar ビルダーはアーキテクチャが一致しない Node.js を拒否します。`--arch x64` だけでは ARM ランタイムを Intel 向けに変換できません。メンテナーは **Actions → Build Intel macOS app** で Intel マシン上のネイティブビルド、アーキテクチャ確認、回帰テストを実行できます。
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

### 2.16.0

- レイアウトを簡素化。バージョン番号をアプリ名の右側に、文字を大きく太くした角丸バッジで表示します。背景色と枠線で見やすくし、専用の行は使いません。Desktop Console、Workspace Panel、Source Profile の装飾見出しも削除し、設定欄の縦方向のスペースを確保しました。
- 全体のライト・ダーク・システム連動テーマを追加。言語選択の下にある太陽・月・モニターのアイコンで切り替え、選択を保存します。システム連動では OS の外観変更を反映します。
- 任意で利用する Herdr ページを追加。通知は初期状態で無効で、独立したチャネル設定と重複通知の確認を備え、既存の AI 連携には影響しません。
- ページ表示時の自動確認、確認・インストールの手順番号、緑の成功表示と黄色の設定案内を追加。通知をオフにするとチャネル操作をグレー表示で無効化し、選択は保持します。クリックで開く説明、コミュニティタグ、プラグインと貢献者の GitHub リンクも追加しました。
- macOS GUI での Herdr パス検出、再接続時の不要なダウンロード、有効なプラグインの重複有効化、言語切り替えに追従しないメッセージを修正。カスタム設定、パスの引用、同梱ランタイムを維持します。

### 2.15.0

- Intel Mac 向けに独立した `ai-cli-complete-notify_2.15.0_x86_64.dmg` を追加しました。既存の Apple Silicon 用 `_aarch64.dmg` は変更していません。Intel ネイティブビルドのワークフローとランタイムのアーキテクチャチェックを追加し、異なるアーキテクチャが混在するパッケージの生成を防ぎます。
- Codex Desktop で Fork した新しいチャットが、過去の完了通知を再生する問題を修正しました。Fork で複製された履歴は、初期化完了後にユーザーが新しいメッセージを送るまでミュートされ、新しいブランチのターンだけが通知されます。
- Codex Watch が Guardian の内部承認レビューセッションをユーザータスクの完了と誤認する問題を修正しました。`other: "guardian"` を含むオブジェクト形式の `source.subagent` メタデータに既存のサブセッションフィルターを適用し、親セッションの通常の完了通知は維持します。[PR #34](https://github.com/ZekerTop/ai-cli-complete-notify/pull/34) を提供してくださった [Bbbbqsh](https://github.com/Bbbbqsh) さんに感謝します。
- macOS に **Dock アイコンを非表示にする**設定を追加しました。デフォルトは OFF で、起動時に保存済みの設定を適用します。Dock アイコンを非表示にしても、メニューバーのアイコンから操作できます。[PR #31](https://github.com/ZekerTop/ai-cli-complete-notify/pull/31) を提供してくださった [8liang](https://github.com/8liang) さんに感謝します。
- Telegram の `401 / Unauthorized` エラー診断を改善し、無効または失効した Bot Token を `@BotFather` で再生成し、漏えいした Token を失効させるよう案内します。エラー表示の改善であり、無効な認証情報を自動修復するものではありません（[Issue #33](https://github.com/ZekerTop/ai-cli-complete-notify/issues/33)）。
- Vite クライアントの型宣言を追加し、TypeScript が JPG リソースのインポートを認識できない問題を解消しました。画面の変更はありません。
- Fork タイムスタンプの書き換え、Watch 接続後の分割コピー、明確な境界がない場合の継承ターン識別、attach/seed 競合、異なるワークスペース `cwd`、Guardian のフィルタリングと親セッションの正常な完了通知、Telegram の認証エラー診断に関する回帰テストを追加しました。

### 2.14.0

- すべての Webhook テストと実際の通知に可視の `AI提醒` マーカーを追加し、既定のテスト内容にも同じ文字列を含めました。DingTalk カスタムロボットは「AI提醒」を共通のセキュリティキーワードとして使用できます。
- Feishu テストカードの本文が空になる問題を修正しました。AI 要約を使用しない場合は `AI提醒 原文` とタスクまたは出力を表示し、要約成功時は `AI提醒 AI摘要` を表示して既存の原文追加設定を維持します。
- Webhook 失敗時に、URL や Token を公開せず、プロバイダーと返却理由をテスト画面に表示するようにしました。

### 2.13.0

- Codex Watch は `/goal` タスクのネイティブな `thread_goal_updated` 状態を追跡します。Goal が `active` または `paused` の間は中間の完了通知を抑止し、`complete`、`blocked`、`usage_limited`、`budget_limited` になった後に最終通知を一度だけ送信します。
- Goal 状態は Codex のセッションとターンごとに分離され、通常タスク、複数セッション通知、明示的な `request_user_input` 確認通知、および Goal イベントを出力しない旧バージョンの Codex の動作を維持します。
- Claude Watch の `tool_use` / `tool_result` 中に発生する誤った完了通知を修正しました。ツール結果はユーザーの新規入力としてターンをリセットせず、ツール呼び出しや空の Assistant レコードは完了タイマーを開始・保持しません。最終的な空でない Assistant テキストだけが完了通知を発生させます。

### 2.12.0

- [Issue #18](https://github.com/ZekerTop/ai-cli-complete-notify/issues/18) を修正しました。トップレベルの Codex セッションは独立して完了通知を送るため、VSCode で中断または正常終了しなかったセッションが、同じワークスペースにある別セッションの通知を抑止しなくなりました。明確な親子メタデータを持つ subagent セッションは引き続き除外されます。
- Codex の確認通知は、明示的な `request_user_input` イベントでのみ発生します。通常の `task_complete` 応答が「続けますか？」などの質問で終わっていても、完了通知として扱われます。
- [Issue #30](https://github.com/ZekerTop/ai-cli-complete-notify/issues/30) に対応し、ソース別 Webhook ルーティングを追加しました。Claude、Codex、Gemini、OpenCode はそれぞれ `CLAUDE_WEBHOOK_URLS`、`CODEX_WEBHOOK_URLS`、`GEMINI_WEBHOOK_URLS`、`OPENCODE_WEBHOOK_URLS` を使用できます。
- ソース別環境変数または `sources.<source>.webhookUrls` は、そのソースのグローバル URL を置き換え、重複送信しません。未設定の場合は従来の `WEBHOOK_URLS` と `channels.webhook.urls` にフォールバックします。
- 既存の Webhook 形式、Feishu カード、AI 要約、出力処理、Hook/Watch ルーティング、重複排除、その他の通知チャンネルを維持し、Claude/Codex の個別送信とグローバルフォールバックの回帰テストを追加しました。

### 2.11.0

- [Issue #24](https://github.com/ZekerTop/ai-cli-complete-notify/issues/24) を修正し、Claude ソースにデフォルト有効の「対話セッションのみ」オプションを追加して、Agent Team、Workflow、worktree、バックグラウンド Agent、`claude -p` などの SDK 派生セッションによる誤った完了通知を抑制しました。
- Claude Stop Hook と Claude Watch は、制限付きの共通 transcript 解析を使用し、`entrypoint: "sdk-cli"` / `promptSource: "sdk"` を SDK セッション、`entrypoint: "cli"` / `promptSource: "typed"` を対話セッションとして判定します。
- transcript が存在しない、読み取れない、または判定不能な場合は従来の通知経路を維持します。`claude -p` の完了通知が必要な場合は、このオプションを無効にできます。
- 既存の Claude 最終応答抽出、失敗通知、Hook 遅延、Watch フォールバック、要約、チャンネル、重複排除を維持し、Claude の両経路と既存 Gemini 修正の回帰テストを追加しました。
- 「プロジェクトについて」に GitHub Release の更新確認を追加しました。ページを開いた際の自動確認と手動での再確認に対応し、現在のバージョンと最新公開バージョンを表示します。Windows と macOS のどちらでも GitHub Releases を開き、インストールパッケージを選択できます。

### 2.10.0

- ハイブリッドルーティングを改善し、Claude と Gemini の Hook を Watch フォールバックと併用できるようにしました。Codex は Watch、OpenCode はプラグインを引き続き使用します。
- 作業ディレクトリが異なる場合の Gemini Hook/Watch 重複排除を改善し、同じ出力をセッション単位で区別するようにしました。
- 新しいユーザーターンの開始時やアクティブなセッションファイルの切り替え時に、Gemini Watch の古い出力をリセットするようにしました。
- Gemini Hook の stdout を常に有効な JSON にし、通知の診断ログを stderr へ送るよう修正しました。
- Gemini CLI 0.49+ の `AfterAgent` Hook インストールを必須のネスト構造へ修正しました。旧フラット設定は自動移行し、他の Hook は保持され、状態確認とアンインストールも有効な構造を誤判定なく認識します。
- 手動テスト通知が重複排除を回避し、Gemini Hook の `{}` 応答ではなく各チャンネルの実際の成功・失敗結果を表示するよう修正しました。
- 通常の CLI 通知と他のソースの既存出力動作は変更していません。

### 2.9.0

- OpenCode グローバルプラグインで `session.status` idle イベントに対応し、既存の `session.idle` / `session.error` 互換も維持しました。
- OpenCode 完了通知は最新の assistant 返信をタスク文として使えるようになり、常に汎用の `OpenCode 完成` だけを表示する状態を改善しました。
- Gotify トグル切り替え後にチャンネル画面へ青い横スクロールバーが表示されることがある問題を修正しました。
- System の後ろに About Project ページを追加し、プロジェクト紹介、作者の WeChat QR コード、任意の Alipay / WeChat サポートコードを表示しました。

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

## コントリビューター

コード、ドキュメント、フィードバック、アイデアを通じてプロジェクトに参加してくださった皆さんに感謝します。

<a href="https://github.com/ZekerTop/ai-cli-complete-notify/graphs/contributors">
 <img alt="コントリビューター" src="https://contrib.rocks/image?repo=ZekerTop/ai-cli-complete-notify&max=100&columns=12&anon=0" />
</a>

## 🔗 リンク

- [LINUX DO](https://linux.do/)

## 📈 プロジェクト統計

<a href="https://www.star-history.com/?repos=ZekerTop%2Fai-cli-complete-notify&type=date&legend=top-left">
 <img alt="Star History Chart" src="assets/star-history/star-history.png" />
</a>

## ライセンス

このプロジェクトは [ISC License](LICENSE) の下で提供されています。

---

**スマート通知で、AI に仕事を任せましょう。** 🎉
