# GitHub Release Update Check

## Goal

Add a lightweight update check to the About Project page. The app reports whether a newer public release exists and lets the user open GitHub Releases to choose the appropriate Windows ZIP or macOS DMG.

## Scope

- Check the latest published GitHub Release for `ZekerTop/ai-cli-complete-notify`.
- Use the build-injected application version as the current version.
- Check automatically when the About Project page opens and keep a manual recheck action.
- Use the same GitHub Releases destination on Windows and macOS.
- Do not download, install, or restart the application automatically.
- Do not change notification sources, Hooks, Watch, channels, configuration, or packaging.

## User Experience

Add an unframed update section inside the existing project information card, separated from the project details by a divider.

The section displays:

- Current version, for example `v2.11.0`.
- Latest public version after a successful check.
- A status message and the appropriate action.

Supported states:

- `checking`: show a progress state and disable the recheck action.
- `update-available`: show the newer version and a `View GitHub Release` action.
- `up-to-date`: state that the installed version is current and retain a manual recheck action.
- `ahead`: state that the installed version is newer than the latest public release, which supports local and development builds.
- `error`: show a concise retry message and retain a `View GitHub Releases` fallback action.

The check runs each time the About Project component mounts. Repeated clicks while a request is active are ignored.

## Data Source

Request:

```text
GET https://api.github.com/repos/ZekerTop/ai-cli-complete-notify/releases/latest
```

Use these response fields only:

- `tag_name`: latest public release version.
- `html_url`: exact release page opened when an update is available.

GitHub's `releases/latest` endpoint excludes draft and prerelease entries. This matches the project's workflow: a draft Release does not become visible to installed applications until it is published.

The request is made with browser `fetch`. GitHub supports cross-origin requests for this public endpoint, and the existing Tauri configuration does not require an additional HTTP plugin or Rust command.

## Architecture

### Version Input

Continue using `__APP_VERSION__`, which Vite derives from `package.json`. Pass the current version from `App` to `AboutProjectPanel` so the component does not introduce a second version source.

### Update Check Module

Add a small frontend module responsible for:

- Normalizing an optional leading `v`.
- Validating stable `major.minor.patch` versions.
- Comparing current and latest versions numerically.
- Fetching and validating the latest Release payload.
- Returning structured data rather than UI strings.

The module must not open URLs or manage React state. This keeps network and comparison behavior independently testable.

### About Project Component

`AboutProjectPanel` owns the request lifecycle and display state. It starts the automatic check on mount, exposes the manual recheck action, translates user-facing messages, and opens URLs through the existing Tauri shell plugin.

When an update is available, open the API response's `html_url`. For error and general browsing states, open:

```text
https://github.com/ZekerTop/ai-cli-complete-notify/releases
```

## Version Rules

- Accept `2.11.0` and `v2.11.0`.
- Compare major, minor, and patch components as integers.
- Treat current lower than latest as `update-available`.
- Treat equal versions as `up-to-date`.
- Treat current higher than latest as `ahead`.
- Treat malformed current versions, malformed release tags, missing `tag_name`, or missing `html_url` as an error.
- Do not implement prerelease precedence because the endpoint intentionally ignores prereleases.

## Error Handling

- Network errors, non-2xx responses, GitHub rate limits, and invalid payloads produce the same non-blocking error state.
- The error does not affect the rest of the About Project page.
- Do not automatically retry. The user can retry manually.
- Do not display raw API response bodies or internal stack traces.
- Keep the general GitHub Releases link available even when checking fails.

## Localization

Add Simplified Chinese and English strings for:

- Current version and latest version labels.
- Checking, update available, up to date, ahead, and error states.
- Check again, view release, and view Releases actions.

No README localization changes are required for this UI-only feature until it is included in a release history entry.

## Verification

- Unit-test version normalization and comparison for lower, equal, higher, leading-`v`, and malformed inputs.
- Unit-test successful Release parsing and network, HTTP, and invalid-payload failures with a mocked fetch implementation.
- Extend About Project source tests to verify the current-version prop, automatic check, manual recheck, release action, and localized copy.
- Run the complete Node test suite.
- Run the production UI build.
- Confirm manually that the current local `2.11.0` build reports `ahead` while GitHub's latest published Release remains `v2.10.0`.
- Confirm that opening the update action uses the exact Release URL and does not start a download.

## Non-Goals

- Tauri Updater integration.
- Automatic downloads or installation.
- Platform-specific asset selection.
- Background or startup update notifications outside the About Project page.
- Authentication with GitHub or use of a GitHub token.
