# Codex Fork 历史提醒修复实施计划

## 任务 1：增加 Fork session 状态

**文件：** `src/watch.js`

- 从文件头首条 `session_meta` 读取子 session ID 和 `forked_from_id`。
- 保证复制过来的父 session metadata 不覆盖子 session 身份。
- 增加 `copying_history -> waiting_for_new_user -> live` 状态。

## 任务 2：阻断 Fork 历史通知

**文件：** `src/watch.js`

- Fork 已存在的 seed 不执行原有基于 `birthtimeMs` 的 live catchup。
- `copying_history` 期间新追加的记录继续以 seed 处理。
- 识别子 session 的 `thread_settings_applied` 或 `thread_rolled_back` 边界；无边界时使用稳定 EOF 兜底。
- 进入 `waiting_for_new_user` 后仍不发通知。
- 边界后首条新用户消息将 session 切换为 `live`，之后复用现有通知逻辑。

## 任务 3：补充回归测试

**文件：** `tests/watch-codex-multi-session.test.js`

- Fork 复制历史重写为当前时闳时不提醒。
- Watch 附着后分批追加复制历史时不提醒。
- Fork 边界后的第一个新用户任务完成时只提醒一次。
- 不同 `cwd` 的 `Fork in this workspace` 保持相同行为。
- 普通非 Fork session 的现有测试继续通过。

## 任务 4：验证

- 运行 `node --test tests/watch-codex-multi-session.test.js`。
- 运行 `node --test tests/*.test.js`。
- 运行 `npm run build:ui`。
- 运行 `cargo check --manifest-path src-tauri/Cargo.toml`。
- 运行 `git diff --check`。
