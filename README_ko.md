<div align="center">

<img width="128" src="https://github.com/ZekerTop/ai-cli-complete-notify/blob/main/desktop/assets/tray.png?raw=true">

# AI CLI Complete Notify (v2.15.0)

![Version](https://img.shields.io/badge/version-2.15.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows%20%7C%20WSL-lightgrey.svg)
[![macOS DMG 다운로드](https://img.shields.io/github/v/release/ZekerTop/ai-cli-complete-notify?label=macOS%20DMG&logo=apple)](https://github.com/ZekerTop/ai-cli-complete-notify/releases/latest)

[English](README.md) | [简体中文](README_zh.md) | [繁體中文](README_zh-TW.md) | 한국어 | [日本語](README_ja.md)

![UI Preview](docs/images/通道.png)

</div>

## Sponsors
> [👉 이 프로젝트를 후원하고 싶으신가요?](mailto:top.zeker@gmail.com)

### 📖 소개

AI CLI Complete Notify는 Claude Code / Codex / OpenCode / Gemini 작업 완료 알림 도구입니다. AI 도구가 긴 작업을 마쳤을 때 데스크톱 알림, 소리, Webhook, Telegram, Email 등 여러 채널로 알려 주기 때문에 컴퓨터 앞에서 계속 기다릴 필요가 없습니다.

**지원 알림 채널:**

📱 Webhook(Feishu/DingTalk/WeCom) • 💬 Telegram Bot • 📧 Email(SMTP)

🖥️ 데스크톱 알림 • 🔊 사운드/TTS 알림 • ⌚ 스마트 밴드/워치 알림(기존 알림 경로를 통한 간접 연동)

## ✨ 주요 기능

- 🎯 **스마트 디바운스**: 작업 유형에 따라 알림 시점을 자동 조정합니다. 도구 호출이 있으면 기본 60초, 없으면 기본 15초를 기다립니다.
- 🔀 **소스별 제어**: Claude / Codex / OpenCode / Gemini를 각각 켜고 끌 수 있으며, 시간 임계값과 알림 채널도 따로 설정할 수 있습니다.
- 📡 **멀티 채널 알림**: Webhook, Telegram, Email, 데스크톱 알림, 사운드를 동시에 사용할 수 있습니다.
- ⏱️ **소요 시간 임계값**: 지정한 시간보다 오래 걸린 작업에만 알림을 보내 불필요한 방해를 줄입니다.
- 🪝 **Hooks + Watch 혼합 방식**: Claude Code / Gemini CLI는 네이티브 Hook을, OpenCode는 전역 플러그인 이벤트를 사용할 수 있으며 Codex는 주로 로그 Watch 방식을 사용합니다.
- 🧠 **AI 요약(선택 사항)**: 작업 완료 후 짧은 요약을 생성하고, 실패하거나 시간 초과되면 원래 내용으로 되돌아갑니다.
- 🖥️ **데스크톱 앱**: GUI 설정, 언어 전환, 트레이/메뉴 막대 숨김, 로그인 시 자동 시작을 지원합니다.
- 🔐 **설정 분리**: 실행 설정과 민감한 토큰/키를 분리하여 `.env`로 관리할 수 있습니다.

## 💡 권장 설정

최상의 경험을 위해 Claude Code / Codex / OpenCode / Gemini를 사용할 때 AI 도구에 충분한 파일 읽기/쓰기 권한을 부여하는 것을 권장합니다.

이렇게 하면 로컬 로그가 안정적으로 기록되고, Watch 모드가 작업 완료 상태를 더 정확하게 판단하여 누락 알림이나 오탐을 줄일 수 있습니다.

## 주의 사항

- Claude Code는 하나의 요청을 여러 하위 작업으로 나눌 수 있습니다. 알림이 과도하게 발생하지 않도록 이 도구는 전체 턴이 끝났을 때만 알림을 보냅니다.
- Watch 모드는 로그 변화를 기반으로 완료를 추정하므로 조용한 시간이 지나야 알림이 발생합니다. 즉시 알림이 아닙니다.
- 더 빠르고 정확한 알림이 필요하면 Claude Code / Gemini CLI는 Hook을, OpenCode는 전역 플러그인을 우선 사용하세요. Codex 또는 일반 fallback 용도에는 Watch를 사용합니다.

## Hooks와 Watch의 차이

- **Hook / 플러그인 이벤트**는 AI CLI가 직접 내보내는 생명주기 이벤트를 사용하므로 실제 완료 시점에 더 가깝습니다.
- **Hook**은 해당 도구에 대해 장시간 백그라운드 로그 감시기를 유지할 필요가 없습니다.
- **Watch**는 범용 fallback입니다. Codex와 Hook이 구성되지 않은 환경에서 유용합니다.

## 🚀 빠른 시작

### Windows 사용자

1. [Releases](https://github.com/ZekerTop/ai-cli-complete-notify/releases)에서 최신 `ai-cli-complete-notify-<version>-portable-win-x64.zip`을 다운로드합니다.
2. 압축을 풀고 원하는 폴더에 넣습니다. 예: `D:\Tools\`
3. `.env.example`을 `.env`로 복사한 뒤 알림 설정을 입력합니다.
4. 데스크톱 앱을 더블 클릭해 실행합니다.

### macOS / Linux 사용자

#### macOS: DMG 직접 설치(권장)

1. Apple Silicon Mac에서는 [GitHub Releases](https://github.com/ZekerTop/ai-cli-complete-notify/releases/latest)에서 최신 `ai-cli-complete-notify_<version>_aarch64.dmg`를 다운로드합니다.
2. DMG를 열고 `ai-cli-complete-notify.app`을 `Applications`로 드래그합니다.
3. 처음 실행할 때 macOS에서 개발자를 확인할 수 없다고 표시하면 앱을 마우스 오른쪽 버튼으로 클릭하고 **열기**를 선택합니다.
4. 패키징된 앱은 `~/.ai-cli-complete-notify/.env`에서 알림 설정을 읽습니다. 첫 실행 시 설정이 없으면 같은 디렉터리에 `.env.example`을 생성합니다.

> 현재 Release DMG는 Apple Silicon(`arm64`)용입니다. Intel Mac 사용자는 아래 단계에 따라 소스에서 빌드할 수 있습니다.

#### 소스에서 실행(macOS / Linux)

아래 단계는 Linux, Intel Mac, 개발 또는 소스에서 직접 빌드하려는 경우에만 필요합니다. 소스/개발 모드에는 Node.js/npm과 Rust/Cargo가 필요합니다. Tauri는 `npm run dev` 실행 중 `cargo`를 호출합니다. `cargo --version`이 실패하면 먼저 [Rust 공식 설치 페이지](https://www.rust-lang.org/tools/install)에서 Rust를 설치하세요.

```bash
# 저장소 복제
git clone https://github.com/ZekerTop/ai-cli-complete-notify.git
cd ai-cli-complete-notify

# Rust/Cargo 사용 가능 여부 확인
cargo --version

# 의존성 설치
npm install

# 환경 변수 설정(소스/개발 모드)
cp .env.example .env
# .env 파일을 열어 알림 설정을 입력합니다

# 데스크톱 앱 실행
npm run dev
```

선택 사항: 소스에서 더블 클릭 가능한 macOS 앱을 빌드하려면:

```bash
# .app 빌드
npm run dist:mac:app

# 배포용 .dmg 빌드
npm run dist:mac:dmg
```

## 🖥️ 데스크톱 앱

### 화면 구성

- **상단 바**: 언어 전환, Watch 토글, 창 제어.
- **채널 설정**: Webhook, Telegram, Email, 데스크톱 알림, 사운드 설정.
- **소스 설정**: Claude / Codex / OpenCode / Gemini별 활성화 상태와 시간 임계값 설정.
- **감시 설정**: 폴링 간격과 디바운스 시간 설정.
- **확인 알림(기본 OFF)**: Codex가 선택/제출이 필요한 대화형 프롬프트를 표시할 때만 알림을 보냅니다.
- **AI 요약**: API URL, Key, 모델, 타임아웃 fallback 설정.
- **고급 옵션**: 제목 접두어, 닫기 동작, 자동 시작, 조용한 시작, 알림 클릭 후 돌아가기.

### 화면 미리보기

![Global Channels](docs/images/通道.png)
![Source Settings](docs/images/各cli来源.png)
![Interactive monitoring](docs/images/交互式监听.png)
![Hook Integration](docs/images/Hook集成.png)
![AI Summary](docs/images/AI摘要.png)
![Advanced Settings](docs/images/系统设置.png)

## 💻 CLI 사용법

Windows portable 빌드에서는:

- `ai-cli-complete-notify.exe`는 데스크톱 GUI입니다.
- `ai-reminder.exe`는 터미널에서 사용하는 CLI/sidecar입니다.

### 도움말

```bash
# 소스 / Node
node ai-reminder.js help

# Windows portable EXE
ai-reminder.exe help
```

### 즉시 알림

```bash
node ai-reminder.js notify --source claude --task "작업 완료"
```

### 네이티브 Hook / 플러그인 모드

```bash
# Hook 상태 확인
node ai-reminder.js hooks status

# Claude Code Hook 설치
node ai-reminder.js hooks install --target claude

# Gemini CLI Hook 설치
node ai-reminder.js hooks install --target gemini

# OpenCode 전역 플러그인 설치
node ai-reminder.js hooks install --target opencode
```

### Watch 로그 감시 모드

```bash
# Windows
ai-reminder.exe watch --sources all --gemini-quiet-ms 3000 --claude-quiet-ms 60000

# macOS / Linux / WSL
node ai-reminder.js watch --sources all --gemini-quiet-ms 3000 --claude-quiet-ms 60000
```

### 자동 타이머

```bash
# Windows
ai-reminder.exe run --source codex -- codex <args...>

# macOS / Linux / WSL
node ai-reminder.js run --source codex -- codex <args...>
```

### 진단

```bash
# settings.json, 상태 파일, watch 로그 경로 출력
node ai-reminder.js paths

# 현재 적용된 런타임 설정 출력
node ai-reminder.js config

# .env 존재 여부 확인, 없으면 .env.example 생성
node ai-reminder.js env-status --create-example
```

## ⚙️ 설정

### `.env` 위치

- **Windows portable 빌드**: `ai-cli-complete-notify.exe`와 같은 폴더에 둡니다.
- **패키징된 macOS 앱(.app / .dmg)**: `~/.ai-cli-complete-notify/.env`에 둡니다. `.app` 번들 안이나 읽기 전용 `.dmg` 볼륨에 의존하지 마세요.
- **소스/개발/CLI 모드**: 프로젝트 루트 또는 데이터 디렉터리에 둘 수 있습니다.

패키징된 macOS 앱은 첫 실행 시 `.env`를 자동으로 확인합니다. 없으면 데이터 디렉터리에 `.env.example`을 만들고 설정 안내를 표시합니다. Finder에서 `.env.example`이 보이지 않으면 `Command + Shift + .`를 눌러 숨김 파일을 표시하세요.

```env
WEBHOOK_URLS=https://open.feishu.cn/open-apis/bot/v2/hook/XXXXX
# DingTalk 사용자 지정 로봇의 보안 키워드를 "AI提醒"으로 설정하세요. 모든 Webhook 메시지에 이 문자열이 포함됩니다
# 선택 사항: 소스별 재정의. 설정된 소스는 전용 URL로만 전송합니다
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

이 파일은 데스크톱 앱이 자동으로 관리하며 소스 활성화 상태, 임계값, UI 설정을 저장합니다.

## 🔧 개발 및 빌드

```bash
# Tauri 개발 모드
npm run dev

# 프런트엔드만 실행
npm run dev:ui

# 현재 플랫폼에 맞는 산출물 빌드
npm run dist

# Windows portable 빌드
npm run dist:portable

# macOS .app
npm run dist:mac:app

# macOS .dmg
npm run dist:mac:dmg
```

macOS 참고:

- 일반 사용 시 `.dmg`에서 앱을 `/Applications`로 드래그한 뒤 실행하세요.
- Desktop 또는 Downloads에서 `.app`을 장기간 직접 실행하면 macOS가 해당 폴더 접근 권한을 반복적으로 요청할 수 있습니다.
- 공개 배포 시 Apple Developer 서명과 notarization이 필요할 수 있습니다.

## 📝 사용 팁

- `notify` 명령은 시간 임계값을 무시하고 즉시 알림을 보냅니다.
- Webhook은 기본적으로 Feishu post 형식을 사용합니다. WeCom/DingTalk는 텍스트 형식으로 전송됩니다.
- 스마트 밴드/워치 알림은 보통 휴대폰 알림 동기화, Webhook relay, Telegram, Email을 통해 간접적으로 구현합니다.
- Hooks / 플러그인 모드는 Claude Code / Gemini CLI / OpenCode에 더 적합하며, Watch는 주로 Codex 또는 fallback 용도로 사용합니다.

## 변경 이력

<details>
<summary>버전 이력 보기</summary>

> `v2.x`는 현재 Tauri 기반 데스크톱 라인이고, `v1.x`는 이전 Electron 라인입니다. 전체 이전 버전 이력은 [English](README.md) 또는 [简体中文](README_zh.md)를 참고하세요.

### 2.15.0

- Codex Desktop에서 Fork한 새 대화가 이전 완료 알림을 다시 재생하는 문제를 수정했습니다. Fork로 복사된 기록은 초기화가 끝나고 사용자가 새 메시지를 보낼 때까지 알림을 보내지 않으며, 새 브랜치의 turn만 알림을 보냅니다.
- Fork 타임스탬프 재작성, Watch 연결 후 분할 복사, 명확한 경계가 없을 때의 상속 turn 식별, attach/seed 경쟁, 서로 다른 작업 공간 `cwd`를 대상으로 하는 회귀 테스트를 추가했습니다.

### 2.14.0

- 모든 Webhook 테스트와 실제 알림에 표시되는 `AI提醒` 표식을 추가하고 기본 테스트 내용에도 같은 문자열을 포함했습니다. DingTalk 사용자 지정 로봇은 "AI提醒"을 공통 보안 키워드로 사용할 수 있습니다.
- Feishu 테스트 카드 본문이 비어 있던 문제를 수정했습니다. AI 요약을 사용하지 않을 때는 `AI提醒 原文`과 작업 또는 출력 내용을 표시하고, 요약 성공 시에는 `AI提醒 AI摘要`를 표시하면서 기존 원문 첨부 설정을 유지합니다.
- Webhook 실패 시 URL이나 Token을 노출하지 않고 공급자와 반환 사유를 테스트 화면에 표시합니다.

### 2.13.0

- Codex Watch가 `/goal` 작업의 기본 `thread_goal_updated` 상태를 추적합니다. Goal이 `active` 또는 `paused`인 동안에는 중간 완료 알림을 차단하고, `complete`, `blocked`, `usage_limited`, `budget_limited` 상태가 된 뒤 최종 알림을 한 번만 보냅니다.
- Goal 상태는 Codex 세션과 턴별로 분리되며, 일반 작업, 다중 세션 알림, 명시적인 `request_user_input` 확인 알림 및 Goal 이벤트가 없는 이전 Codex 로그의 기존 동작을 유지합니다.
- Claude Watch의 `tool_use` / `tool_result` 처리 중 발생하던 잘못된 완료 알림을 수정했습니다. 도구 결과는 실제 사용자 입력처럼 턴을 재설정하지 않으며, 도구 호출과 비어 있는 Assistant 레코드는 완료 타이머를 시작하거나 남겨 두지 않습니다. 최종 비어 있지 않은 Assistant 텍스트만 완료 알림을 발생시킵니다.

### 2.12.0

- [Issue #18](https://github.com/ZekerTop/ai-cli-complete-notify/issues/18)을 수정했습니다. 이제 최상위 Codex 세션은 독립적으로 완료 알림을 보내므로 VSCode에서 중단되거나 정상적으로 종료되지 않은 세션이 같은 작업 공간의 다른 세션 알림을 차단하지 않습니다. 명확한 부모/자식 메타데이터가 있는 subagent 세션은 계속 필터링됩니다.
- Codex 확인 알림은 이제 명시적인 `request_user_input` 이벤트에서만 발생합니다. 일반 `task_complete` 응답이 "계속할까요?" 같은 질문으로 끝나더라도 완료 알림으로 처리됩니다.
- [Issue #30](https://github.com/ZekerTop/ai-cli-complete-notify/issues/30)을 지원하기 위해 소스별 Webhook 라우팅을 추가했습니다. Claude, Codex, Gemini, OpenCode는 각각 `CLAUDE_WEBHOOK_URLS`, `CODEX_WEBHOOK_URLS`, `GEMINI_WEBHOOK_URLS`, `OPENCODE_WEBHOOK_URLS`를 사용할 수 있습니다.
- 소스별 환경 변수 또는 `sources.<source>.webhookUrls`는 해당 소스의 전역 URL을 대체하며 중복 전송하지 않습니다. 설정하지 않으면 기존 `WEBHOOK_URLS`와 `channels.webhook.urls`로 폴백합니다.
- 기존 Webhook 형식, Feishu 카드, AI 요약, 출력 처리, Hook/Watch 라우팅, 중복 제거와 다른 알림 채널을 유지하고 Claude/Codex 분리 전송 및 전역 폴백 회귀 테스트를 추가했습니다.

### 2.11.0

- [Issue #24](https://github.com/ZekerTop/ai-cli-complete-notify/issues/24)를 수정하고 Claude 소스에 기본 활성화된 `대화형 세션만 알림` 옵션을 추가해 Agent Team, Workflow, worktree, 백그라운드 Agent, `claude -p` 같은 SDK 파생 세션의 잘못된 완료 알림을 차단했습니다.
- Claude Stop Hook과 Claude Watch가 제한된 공통 transcript 출처 분석기를 사용하며, `entrypoint: "sdk-cli"` / `promptSource: "sdk"`는 SDK 세션으로, `entrypoint: "cli"` / `promptSource: "typed"`는 대화형 세션으로 판별합니다.
- transcript가 없거나 읽을 수 없거나 출처를 판별할 수 없으면 기존 알림 흐름을 유지합니다. `claude -p` 완료 알림이 필요한 경우 이 옵션을 끌 수 있습니다.
- 기존 Claude 최종 응답 추출, 실패 알림, Hook 지연, Watch 폴백, 요약, 채널, 중복 제거를 유지하고 Claude 양쪽 경로와 기존 Gemini 수정에 대한 회귀 테스트를 추가했습니다.
- 프로젝트 정보 페이지에 GitHub Release 업데이트 확인 기능을 추가했습니다. 페이지를 열 때 자동으로 확인하고 수동 재확인도 지원하며, 현재 버전과 최신 공개 버전을 표시합니다. Windows와 macOS 모두 GitHub Releases에서 설치 패키지를 직접 선택할 수 있습니다.

### 2.10.0

- 하이브리드 라우팅을 개선해 Claude와 Gemini Hook이 Watch 폴백과 함께 동작하도록 했습니다. Codex는 Watch를, OpenCode는 플러그인을 계속 사용합니다.
- 작업 디렉터리가 다른 경우에도 Gemini Hook/Watch 중복 제거가 동작하도록 개선하고, 동일한 출력을 세션별로 구분합니다.
- 새 사용자 턴이 시작되거나 활성 세션 파일이 바뀔 때 Gemini Watch의 이전 출력을 초기화해 오래된 내용이 전송되지 않도록 했습니다.
- Gemini Hook stdout이 항상 유효한 JSON을 반환하도록 수정하고 알림 진단 로그를 stderr로 보냅니다.
- Gemini CLI 0.49+의 `AfterAgent` Hook 설치를 필수 중첩 구조로 수정했습니다. 기존 평면 설정은 자동 마이그레이션되고 다른 Hook은 유지되며, 상태 확인과 제거도 유효한 구조를 오탐 없이 인식합니다.
- 수동 테스트 알림이 중복 제거를 우회하고 Gemini Hook의 `{}` 응답 대신 채널별 실제 성공 또는 실패 결과를 표시하도록 수정했습니다.
- 일반 CLI 알림과 다른 소스의 기존 출력 동작은 유지됩니다.

### 2.9.0

- OpenCode 전역 플러그인에서 `session.status` idle 이벤트를 지원하고 기존 `session.idle` / `session.error` 호환성도 유지했습니다.
- OpenCode 완료 알림이 최신 assistant 응답을 작업 문구로 사용할 수 있어 항상 일반적인 `OpenCode 完成`만 표시되던 상태를 개선했습니다.
- Gotify 토글을 전환한 뒤 채널 화면에 파란 가로 스크롤바가 나타날 수 있던 문제를 수정했습니다.
- System 뒤에 About Project 페이지를 추가해 프로젝트 소개, 작성자 WeChat QR 코드, 선택적 Alipay / WeChat 후원 코드를 보여 줍니다.

### 2.8.0

- 실제 테스트 알림을 보내고 AI 요약 생성 결과와 알림 전송 결과를 UI에 표시하는 AI Summary 테스트 경로를 추가했습니다.
- AI Summary API URL 입력 안내를 개선해 base URL, 전체 endpoint, 끝의 `/` / `#` 처리 규칙을 설명합니다.
- Webhook 로그가 stdout을 오염시켜 요약 테스트 JSON 파싱을 깨뜨리던 문제를 수정했습니다.
- AI Summary 기본 타임아웃을 30초로 늘리고, 기존 15초 기본값을 30초로 자동 마이그레이션해 느린 API에서 의도치 않게 fallback되는 가능성을 줄였습니다.
- AI Summary 테스트 결과 박스에 성공/실패 색상을 추가했습니다. 성공은 초록색, 실패는 빨간색으로 표시됩니다.
- Webhook에 원본 출력 포함/숨김 옵션을 추가했습니다. AI Summary가 성공하면 요약만 보내거나 원문을 함께 보낼 수 있고, 함께 보낼 때는 구분선과 라벨로 AI 요약과 원문을 명확히 나눕니다. AI Summary가 꺼져 있거나 실패하면 빈 알림을 피하기 위해 원문을 유지하고, 실패 이유를 예를 들어 `AI Summary: request timed out, original output is shown`처럼 inline으로 표시합니다.
- 비카드 Webhook 원본 출력 길이를 `WEBHOOK_OUTPUT_MAX_LENGTH`로 제한할 수 있게 했습니다.

### 2.7.0

- macOS 데스크톱 호환성을 추가했습니다. 패키징된 `.app`은 데스크톱 알림을 Tauri 네이티브 알림으로 보내 반복적인 AppleScript 접근 권한 프롬프트를 줄이고, CLI/소스 실행은 `osascript display notification`을 fallback으로 유지합니다. 사운드 알림은 `say` / `beep`를 지원하고, 사용자 지정 오디오 파일은 `afplay`를 사용합니다.
- macOS Tauri sidecar 빌드 경로를 추가했습니다. 현재 아키텍처에 맞춰 `ai-reminder-aarch64-apple-darwin` 또는 `ai-reminder-x86_64-apple-darwin`을 생성해 패키징된 macOS 빌드가 sidecar를 올바르게 찾을 수 있게 했습니다.
- macOS 패키징 스크립트를 추가했습니다. `npm run dist:mac:app`은 더블 클릭 가능한 `.app`을 만들고, `npm run dist:mac:dmg`는 배포용 `.dmg`를 만듭니다.
- `npm run dist`가 현재 플랫폼에 따라 산출물을 선택하도록 변경했습니다. Windows는 portable 패키지를 유지하고, macOS는 `.app`을 빌드합니다.
- macOS 패키징 버전의 `.env` 위치를 `~/.ai-cli-complete-notify/.env`로 명확히 하고 `paths` 출력에도 추가했습니다. Windows portable 빌드는 계속 exe 옆의 `.env`를 지원합니다.
- 패키징된 macOS 앱은 시작 시 `.env`를 확인합니다. 없으면 `.env.example`을 만들고 설정 안내를 표시하며, 있으면 설정 로드 성공 상태를 보여 줍니다. Finder에서 숨김 파일이 보이지 않을 때 `Command + Shift + .`를 누른 뒤 `.env.example`을 `.env`로 복사하라는 안내도 포함합니다.
- Windows가 아닌 플랫폼에서 "Open config file" 동작이 작동하지 않던 문제를 수정했습니다. macOS는 이제 시스템 `open` 명령을 사용합니다.
- 프런트엔드 사이드바 버전이 오래된 값으로 남아 있던 문제를 수정했습니다. 버전은 더 이상 하드코딩하지 않고 빌드 시 `package.json`에서 주입됩니다.
- macOS에서 트레이/메뉴 막대로 숨긴 뒤 창을 다시 열기 어려운 문제를 수정했습니다.
- README에 macOS 설치, 권한 프롬프트, 배포 주의 사항을 보강했습니다.

</details>

## 🤝 기여

Issue와 Pull Request를 환영합니다.

## 기여자

코드, 문서, 피드백, 아이디어로 프로젝트에 참여해 주신 모든 분께 감사드립니다.

<a href="https://github.com/ZekerTop/ai-cli-complete-notify/graphs/contributors">
 <img alt="기여자" src="https://contrib.rocks/image?repo=ZekerTop/ai-cli-complete-notify&max=100&columns=12&anon=0" />
</a>

## 🔗 링크

- [LINUX DO](https://linux.do/)

## 📈 프로젝트 통계

<a href="https://www.star-history.com/?repos=ZekerTop%2Fai-cli-complete-notify&type=date&legend=top-left">
 <img alt="Star History Chart" src="assets/star-history/star-history.png" />
</a>

## 라이선스

이 프로젝트는 [ISC License](LICENSE)에 따라 배포됩니다.

---

**스마트 알림으로 AI가 일하게 두세요.** 🎉
