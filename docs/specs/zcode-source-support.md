# Spec: ZCode Source Support

Status: `ready-for-agent`
Origin: design session 2026-09-11 (grill-with-docs). Glossary: [CONTEXT.md](../../CONTEXT.md).

## Problem Statement

Users who work in the ZCode AI CLI have no way to get notified when ZCode finishes a Turn. The tool supports Claude Code, Codex, OpenCode, Gemini, and Herdr, so a ZCode user must either keep watching the terminal during long tasks or hand-roll an unsupported workaround. ZCode is not going away as a daily driver for part of the user base, and its silence is the only gap among the CLIs this tool targets.

## Solution

Add ZCode as a first-class Source. A one-command Hook installation registers this tool as ZCode's native `Stop` handler in ZCode's user-level configuration, so every completed Turn produces a Completion signal that flows through the same engine as every other source: per-Source Channels, Duration threshold, Dedupe, Notification mode gating, and optional AI summary. ZCode ships with no Watch path — its native hook makes log inference unnecessary. The Source is disabled by default so upgrading users see no behavior change until they opt in.

## User Stories

1. As a ZCode user, I want a notification when ZCode finishes a Turn, so that I don't have to watch the terminal during long tasks.
2. As a ZCode user, I want hook installation to be a single command, so that setup takes seconds.
3. As a ZCode user, I want the installer to preserve my existing ZCode hooks, so that other automations I registered keep working.
4. As a ZCode user, I want the installer to enable ZCode's hooks runner automatically, so that the hook actually fires without me digging through ZCode config docs.
5. As a ZCode user, I want uninstall to remove only this tool's Stop handler, so that I can opt out without collateral damage to my ZCode configuration.
6. As a ZCode user, I want the notification to show the response preview (or the project when the preview is unavailable), so that I know what finished without switching windows.
7. As a ZCode user, I want per-Source channels (webhook, Telegram, email, desktop, sound, Gotify), so that ZCode alerts reach me wherever I am.
8. As a ZCode user, I want a Duration threshold for ZCode, so that quick question-and-answer Turns don't ping me.
9. As a ZCode user on Windows, I want the hook to run as a direct process without a shell, so that installation works reliably on my platform.
10. As a desktop app user, I want a ZCode toggle, threshold, and channel grid in the Sources panel, so that I manage it exactly like other first-class sources.
11. As a desktop app user, I want ZCode install/status/preview controls in the Hooks panel, so that I never need the CLI to set it up.
12. As an existing user who does not use ZCode, I want the ZCode Source disabled by default, so that upgrading changes nothing about my notifications.
13. As a multi-CLI user (e.g. Claude + ZCode), I want ZCode settings to be independent of every other source, so that enabling ZCode touches nothing else.
14. As a user running in Watch-only Notification mode, I want ZCode hook alerts not to be suppressed, so that the only working path for ZCode isn't silenced by a mode meant for other CLIs.
15. As a user, I want repeated completion signals for the same Turn collapsed by Dedupe, so that ZCode's repeatable Stop semantics don't spam me.
16. As a user, I want `ZCODE_WEBHOOK_URLS` environment support, so that I can configure ZCode's webhook the same way as other sources.
17. As an AI summary user, I want ZCode completions to feed the AI summary, so that long responses arrive as a short digest.
18. As a privacy-conscious user, I want the hook to hand over only local metadata and content destined for my own channels, so that nothing leaves my machine beyond what I configured.
19. As a maintainer, I want automated tests covering install/uninstall/status, payload parsing, and engine routing, so that future refactors don't silently break ZCode support.
20. As a maintainer, I want ZCode to follow the same source conventions as Herdr and OpenCode, so that the codebase stays uniform.
21. As a reader of the English, Simplified Chinese, Traditional Chinese, Korean, or Japanese docs, I want ZCode setup documented in my language, so that I can adopt it without translation tools.
22. As a user with an existing hand-tuned ZCode configuration, I want the installer to merge into it (never clobber unknown fields), so that my other ZCode settings survive.

## Implementation Decisions

- **First-class Source**: ZCode gets the same config schema as the other CLI sources (enable switch, Duration threshold, per-Source channels). Defaults: disabled; threshold in line with sibling sources.
- **Hooks-only completion path**: the native `Stop` event is the only Completion signal. No Watch path exists for ZCode: it is excluded from the watch "all" set, and it is classified with the hook-only sources in Notification mode gating so Watch-only mode does not suppress its hook alerts.
- **User-level installation**: the installer writes into ZCode's user-level configuration (global, all projects) — one install, mirroring how the Claude and Gemini installers behave. It must ensure ZCode's hooks runner is enabled (ZCode disables configuration-file hooks by default, unlike Claude Code) and must merge with any existing hooks and unknown fields.
- **Process-type hook**: the Stop handler is registered as an argument-vector process invocation, not a shell command string, for cross-platform (especially Windows) reliability. It invokes the notifier in hook mode with the force flag.
- **Stdin payload, graceful content**: the generic stdin JSON reader already used by hook mode reads ZCode's payload. Notification content prefers payload fields (response preview, session, working directory) and falls back to the project directory name. ZCode's rollout / model-I/O transcript files are never parsed.
- **Silent stdout**: hook-mode notifications must print nothing to stdout, because ZCode validates hook stdout as strict JSON and would mark the hook run as failed.
- **Stop continuation semantics**: ZCode's Stop hook can request continuation (up to three times). The first Stop is treated as the completion point — identical to how Claude Code's Stop is handled — and in-window repeats collapse through Dedupe.
- **Full source touchpoints**: default config, source labels, webhook env names, valid hook targets, hook status/preview registries, CLI help text, hook-reminder display names, desktop UI source list and hooks panel, i18n strings (English and Simplified Chinese), and the `.env` example.
- **No failure notifications**: ZCode's `PostToolUseFailure` event is deliberately not wired up in this iteration.
- **Version and docs**: version bumped to 2.17.0 in all synced locations and README title/badge; changelog entry appended in all five READMEs; all five READMEs updated at every place sources are enumerated.

## Testing Decisions

- Tests assert external behavior only — what a user or the engine observes — never internal call graphs.
- Three seams, all existing, no new seams:
  1. **Installation seam** — install/uninstall/status executed against a temporary HOME. Assert the written ZCode configuration: hooks runner enabled, a Stop handler present and process-typed, pre-existing hooks and unknown fields preserved. Uninstall removes only this tool's handler.
  2. **Payload seam** — the ZCode hook context builder as a pure function. A valid Stop payload yields a context with the right source, dedupe key, content, and working directory; a non-Stop event is rejected; missing optional fields degrade to the fallback content instead of erroring.
  3. **Engine routing seam** — end-to-end `sendNotifications` with a synthetic ZCode hook notification: the default-disabled source sends nothing; enabling it with a met threshold sends; Watch-only Notification mode does not suppress ZCode hook alerts; identical content inside the Dedupe window collapses to one alert.
- Prior art: the Herdr hook-install and hook-context tests, the Gemini hook-install test, and the engine hybrid-routing test.
- Desktop UI changes are not unit tested (repo convention); they are verified by a passing build plus a manual pass.

## Out of Scope

- A Watch/log-monitoring path for ZCode, including any parsing of rollout or model-I/O transcript files.
- Failure notifications via ZCode's `PostToolUseFailure` event.
- Workspace-level (per-project) hook installation.
- New notification channels or new UI panels; ZCode reuses existing panels.
- Installing the hook on the maintainer's live machine as part of the deliverable — the user runs the one install command themselves.
- Translating the UI beyond the existing English and Simplified Chinese locale files.

## Further Notes

- The one semantic trap versus prior integrations: ZCode's configuration-file hooks are **opt-in** (runner disabled unless explicitly enabled), whereas Claude Code runs written hooks by default. Tests cover it explicitly.
- ZCode's stdin payload schema is not officially documented. The payload contract is verified against a live probe during development, and every optional field is tolerated-absent. ZCode also injects documented Claude-compatible environment variables, which serve as a fallback for session and project identification.
- The upstream repository's issue tracker is not used for this spec; it is stored in-repo by decision, so the branch carries the spec next to the code.
