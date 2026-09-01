# Codex Fork 历史提醒抑制设计

## 目标

解决 Codex Desktop 执行 `Fork chat from here` / `Fork in this workspace` 后，新 session 将原对话历史的完成事件重新发送提醒的问题。

产品规则只有一条：

> Fork 只复制上下文，不产生通知。只有用户在 Fork 对话中发出新消息后，新任务完成才发送提醒。

## 问题原因

当前 `src/watch.js` 使用记录时间戳与新 session 文件的 `birthtimeMs` 判断近期 seed 是否应当作实时事件补处理。Codex Fork 会复制原对话历史，且复制记录的外层时间戳可能被改成 Fork 当下的时间。这使原 session 中的旧 `task_complete` 被当成新事件，逐条重放通知。

现有回归测试只覆盖“复制历史保留旧时间戳，且在 Watch 附着前已全部写完”的情况，没有覆盖当前实际的时间戳重写和分批写入。

## 范围

仅修改：

- `src/watch.js` 中 Codex sessions Watch 的 Fork 初始化判定。
- `tests/watch-codex-multi-session.test.js` 中的 Fork 回归测试。

不修改：

- UI 和配置项。
- 通知通道与全局内容去重。
- Claude、Gemini 和 OpenCode 监听。
- Codex subagent、Goal 和确认提醒逻辑。

## 状态模型

Fork session 增加三个明确状态：

```text
copying_history -> waiting_for_new_user -> live
```

### `copying_history`

- 文件头的首条 `session_meta` 含有 `forked_from_id` 时进入该状态。
- 保留首条 `session_meta` 中的新子 session ID、`cwd` 和 `forked_from_id`。
- 复制过来的父 session `session_meta` 不得覆盖新子 session 身份。
- 已存在的 seed 与 Watch 附着后继续写入的 Fork 历史，全部只更新上下文状态，不进入确认或完成通知流程。
- Fork session 不再使用 `birthtimeMs` 进行实时 seed catchup。

### `waiting_for_new_user`

- 优先使用 `thread_settings_applied` 且其 `thread_id` 等于首条 `session_meta` 的新子 session ID，或 Fork 写入的 `thread_rolled_back` 事件，作为历史复制结束的强边界。
- 如果当前日志格式没有明确边界，文件大小和修改时间需要连续稳定至少 `1` 秒且跨越至少两个轮询周期，然后记录当前 EOF 并进入该状态。
- 进入该状态不代表可以发通知，仍然需要等待用户的新输入。

### `live`

- 只有在 Fork 初始化边界之后读到新的 `response_item` user message 或 `event_msg:user_message` 时才进入该状态。
- 这条新用户消息按普通新轮次处理。
- 随后的 `task_started`、Assistant 输出和 `task_complete` 继续使用现有 Codex 逻辑，任务完成后发送一次提醒。

## 数据处理

1. `createSession()` 扫描文件头，确定首条 `session_meta` 是否带有 `forked_from_id`。
2. 普通 session 保持现有 seed catchup 与实时轮询行为。
3. Fork session 在 `copying_history` 状态下，将所有对象以 `seed: true` 送入现有状态处理，从而保留 `cwd`、用户上下文和 Assistant 上下文，但阻断提醒。
4. 历史复制边界只将状态改为 `waiting_for_new_user`，不补发任何通知。
5. 边界后的首条新用户消息将状态改为 `live`，之后才允许确认和完成提醒。
6. 如果 Watch 附着时 Fork 边界和第一个新用户轮次已经存在于 seed 窗口，只将边界后、第一条新用户消息开始的近期记录按 live catchup 处理；边界之前的复制历史始终保持 seed。

## 兼容性与失败处理

- 没有 `forked_from_id` 的 session 不启用新状态机。
- 无法识别 Fork 初始化边界时，优先保证不重放历史，通过文件稳定 EOF 进入 `waiting_for_new_user`，不将现有内容当作实时事件。
- 无论使用明确边界还是稳定 EOF，都必须等待后续新用户消息才能发送提醒。
- 原有 subagent 过滤、Goal 状态、`request_user_input` 确认提醒和 TUI 失败提醒保持不变。

## 测试

1. **时间戳重写**：源 session 与 Fork session 同时存在，Fork 历史使用当前时间戳，预期通知数为 `0`。
2. **分批复制**：Watch 先附着 Fork session，再分批追加历史 `task_complete`，预期通知数为 `0`。
3. **新对话完成**：Fork 初始化结束后追加用户新消息和新 `task_complete`，预期只提醒 `1` 次，内容为新分支输出。
4. **快速首轮**：Watch 发现 Fork 文件时，复制边界后的新用户轮次已经写入且仍在 catchup 时间窗口内，预期只提醒该新轮次 `1` 次。
5. **Fork in this workspace**：Fork session 使用不同 `cwd`，历史不提醒，新对话完成后提醒 `1` 次。
6. **普通 session**：没有 `forked_from_id` 的 session 仍按现有规则正常提醒。

## 成功标准

- 执行 Fork 不会触发任何原对话提醒。
- Fork 复制历史无论是一次性写入、分批写入还是重写时间戳，都不会触发提醒。
- 用户在 Fork 对话中开始新任务后，完成时正常提醒一次。
- 普通 Codex session 及其他来源的通知行为不变。
