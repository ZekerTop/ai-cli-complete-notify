# 01: ZCode hook end-to-end — install → Stop → notification delivered

**What to build:** The narrowest complete path for ZCode support: a ZCode user runs the CLI hook-install command for ZCode; the installer writes ZCode's user-level configuration (enabling ZCode's hooks runner — it is off by default for config-file hooks — and registering a Stop handler that invokes this tool's notifier as a direct process with an argument vector, no shell, preserving everything already in the config). From then on, every completed Turn produces a Completion signal that flows through the engine like any other Source: payload parsed with graceful content fallback, per-Source channels, Duration threshold, Dedupe, and Notification-mode gating. The Source ships disabled by default. Spec: docs/specs/zcode-source-support.md (glossary: CONTEXT.md at repo root).

**Blocked by:** None (can start immediately).

**Status:** implemented

- [x] Hook installation for ZCode writes the user-level ZCode configuration: hooks runner enabled, a Stop handler registered as a process-type (argument vector, shell-free) invocation of the notifier in hook mode, and all pre-existing hooks plus unknown fields preserved
- [x] Uninstall removes only this tool's Stop handler; the rest of the user's ZCode configuration is untouched
- [x] Hook status reports ZCode's installation state, and the install preview shows what would be written
- [x] All installation behaviors are verified against a temporary HOME — the developer's real ZCode configuration is never touched by tests
- [x] A Stop payload yields a notification context with the correct source, a stable dedupe key, and content from the payload with fallback to the project directory name; non-Stop events are rejected; absent optional fields never error
- [x] With ZCode at its default (disabled) no notification is sent; once enabled with the Duration threshold met, notifications flow through the per-Source channels
- [x] Watch-only Notification mode does not suppress ZCode hook alerts, and ZCode is absent from the watch "all" source set
- [x] Two identical ZCode completions inside the dedupe window collapse to one alert
- [x] A hook-invoked notification writes nothing to stdout (ZCode validates hook stdout as strict JSON)
- [x] The ZCode webhook URL environment variable is honored and documented in the `.env` example
- [x] ZCode has a display label and appears in CLI help text, the valid hook targets, and hook-reminder display names
- [x] Automated tests cover the three seams — installation, payload parsing, engine routing — following the Herdr hook-install / Herdr hook-context / Gemini hook-install / engine hybrid-routing prior art, all green
