# 02: Manage ZCode from the desktop app

**What to build:** A desktop app user can manage ZCode entirely with the mouse, exactly like the other first-class Sources: the Sources panel shows ZCode with its enable toggle (default off), Duration threshold, and per-Source channel grid; the Hooks panel offers install / status / preview / uninstall for ZCode and reflects the real installation state. English and Simplified Chinese strings are complete. Spec: docs/specs/zcode-source-support.md.

**Blocked by:** 01 — ZCode hook end-to-end (the Source's config key and the hook status/install registries must exist first).

**Status:** implemented (manual pass pending)

- [x] The Sources panel lists ZCode as a first-class Source with enable toggle, Duration threshold, and the per-Source channel grid; default state is disabled
- [x] The Hooks panel offers install / status / preview / uninstall for ZCode and shows the actual installation state
- [x] ZCode never appears in any watch-source listing (it has no Watch path)
- [x] English and Simplified Chinese locale files contain all new strings; no missing-translation warnings at runtime
- [x] A production build of the desktop UI passes
- [ ] Manual pass: toggle ZCode on/off, set a threshold, run hook install and uninstall from the UI against the developer's real environment, and undo it
