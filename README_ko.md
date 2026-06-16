<div align="center">

<img width="128" src="https://github.com/ZekerTop/ai-cli-complete-notify/blob/main/desktop/assets/tray.png?raw=true">

# AI CLI Complete Notify (v2.8.0)

![Version](https://img.shields.io/badge/version-2.8.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows%20%7C%20WSL-lightgrey.svg)

[English](README.md) | [简体中文](README_zh.md) | [繁體中文](README_zh-TW.md) | 한국어 | [日本語](README_ja.md)

![UI Preview](docs/images/通道.png)

</div>

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

소스/개발 모드에는 Node.js/npm과 Rust/Cargo가 필요합니다. Tauri는 `npm run dev` 실행 중 `cargo`를 호출합니다. `cargo --version`이 실패하면 먼저 [Rust 공식 설치 페이지](https://www.rust-lang.org/tools/install)에서 Rust를 설치하세요.

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

macOS에서 더블 클릭 가능한 앱을 빌드하려면:

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

## 🔗 링크

- [LINUX DO](https://linux.do/)

## 📈 프로젝트 통계

<a href="https://www.star-history.com/#ZekerTop/ai-cli-complete-notify&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=ZekerTop/ai-cli-complete-notify&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=ZekerTop/ai-cli-complete-notify&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=ZekerTop/ai-cli-complete-notify&type=date&legend=top-left" />
 </picture>
</a>

---

**스마트 알림으로 AI가 일하게 두세요.** 🎉
