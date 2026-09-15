# 03: Docs and release — v2.17.0

**What to build:** Every reader of the project's five documentation languages learns that ZCode is supported: each README mentions ZCode everywhere the sibling Sources are enumerated, gains a 2.17.0 changelog entry, and carries the bumped version in its title and badge. The version bump lands last so the changelog describes the whole feature. Spec: docs/specs/zcode-source-support.md.

**Blocked by:** 02 — Manage ZCode from the desktop app (docs describe the UI, and the version bump must come after all feature work).

**Status:** implemented

- [x] All five READMEs (English, Simplified Chinese, Traditional Chinese, Korean, Japanese) mention ZCode at every site where sibling Sources are enumerated — introduction/title area, key features, hooks-vs-watch explanation, hook install command blocks, log-monitoring notes, CLI help block, interface overview
- [x] ZCode is documented consistently as: hooks-only (no Watch path), user-level install, disabled by default, first-class Source
- [x] Each README gains a 2.17.0 changelog entry describing ZCode support
- [x] Version reads 2.17.0 in the package manifest, the Tauri config, the Cargo manifest, and the title line + version badge of all five READMEs
- [x] A repo-wide search for each sibling source name surfaces no enumeration site that omits ZCode
- [x] The five language versions tell the same story (no language left with stale counts of supported sources)
