# AI CLI Complete Notify

A desktop/sidecar tool that notifies the user when an AI coding CLI finishes a unit of work, across multiple CLI tools and delivery channels.

## Language

### Sources

**Source**:
A specific AI CLI tool whose completions this tool monitors (Claude Code, Codex, OpenCode, Gemini, Herdr, ZCode).
_Avoid_: backend, provider, client

**First-class source**:
A source listed in the main Sources panel with its own enable switch, duration threshold, and per-channel routing.
_Avoid_: built-in source

**Third-party integration**:
A source that bridges to an external plugin/tool ecosystem and is configured in a separate panel (currently Herdr).
_Avoid_: plugin source

### Completion

**Turn**:
One complete user submission → assistant response cycle. The unit of completion; the tool notifies at most once per turn.
_Avoid_: task, request, run

**Sub-task suppression**:
The rule that intermediate assistant activity inside a turn (tool calls, sub-agents) never triggers a notification.

**Completion signal**:
An explicit, authoritative indication that a turn has ended.
_Avoid_: finish event, done marker

**Hook**:
A completion signal delivered by the AI CLI's own lifecycle-event mechanism (e.g. Claude Code `Stop`, Gemini `AfterAgent`, OpenCode `session.idle`, ZCode `Stop`).
_Avoid_: native event, callback

**Hook installation**:
Registering this tool as the recipient of a CLI's hook, by writing into that CLI's own configuration.

**Watch**:
Inferring turn completion by following a CLI's local session/log files and waiting for activity to settle.
_Avoid_: log mode, polling

**Quiet period**:
The span with no new session activity after which Watch declares the turn complete; longer when tool calls are involved.
_Avoid_: debounce time, idle timeout

**Dedupe**:
Suppressing a notification whose content already fired recently, so Hook and Watch paths for the same turn yield one alert.

### Delivery

**Channel**:
A delivery method for a notification: webhook, Telegram, email, desktop, sound, or Gotify.
_Avoid_: notifier, transport

**Notification mode**:
The user's global choice of which completion path to trust: Watch only, or Hooks (hybrid).
_Avoid_: run mode

**Duration threshold**:
The minimum turn length (minutes) below which no notification is sent.
_Avoid_: min duration, delay
