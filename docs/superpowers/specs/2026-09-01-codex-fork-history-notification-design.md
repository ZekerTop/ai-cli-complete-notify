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
       \-------------------------------> live
```

### `copying_history`

- 文件头的首条 `session_meta` 含有 `forked_from_id` 时进入该状态。
- 保留首条 `session_meta` 中的新子 session ID、`cwd` 和 `forked_from_id`。
- 复制过来的父 session `session_meta` 不得覆盖新子 session 身份。
- 已存在的 seed 与 Watch 附着后继续写入的 Fork 历史，全部只更新上下文状态，不进入确认或完成通知流程。
- Fork session 不再使用 `birthtimeMs` 进行实时 seed catchup。
- 根据 `forked_from_id` 定位源 session，只保留其已有 `turn_id` 集合。复制轮次无论分批间隔多久，都继续作为 seed。

### `waiting_for_new_user`

- 优先使用 `thread_settings_applied` 且其 `thread_id` 等于首条 `session_meta` 的新子 session ID，作为历史复制结束的强边界。不将无 session 归属信息的旧回滚事件当作唯一边界。
- 进入该状态不代表可以发通知，仍然需要等待用户的新输入。

### `live`

- 只有在 Fork 初始化边界之后读到新的 `response_item` user message 或 `event_msg:user_message` 时才进入该状态。
- 如果日志没有明确边界，读到不属于源 session `turn_id` 集合的新 `turn_context` 或 `task_started` 时，也可直接进入该状态。
- 这条新用户消息按普通新轮次处理。
- 随后的 `task_started`、Assistant 输出和 `task_complete` 继续使用现有 Codex 逻辑，任务完成后发送一次提醒。

## 数据处理

1. `createSession()` 扫描文件头，确定首条 `session_meta` 是否带有 `forked_from_id`。
2. 使用 `forked_from_id` 查找源 session 文件，流式读取并只保留已有 `turn_id` 集合，不将源 session 全文加载到内存。
3. 普通 session 保持现有 seed catchup 与实时轮询行为。
4. Fork session 在 `copying_history` 状态下，将继承轮次以 `seed: true` 送入现有状态处理，从而保留上下文，但阻断提醒。
5. 历史复制边界只将状态改为 `waiting_for_new_user`，不补发任何通知。没有边界时，首个非继承 `turn_id` 直接开启 `live`。
6. 边界后的首条新用户消息将状态改为 `live`，之后才允许确认和完成提醒。
7. 如果 Watch 附着时新 Fork 轮次已经存在于 seed 窗口，只将明确边界或首个非继承 `turn_id` 之后的近期记录按 live catchup 处理。
8. seed 读取完成后将 follower 位置同步到已读 EOF，避免 attach 与 seed priming 之间追加的记录被再读一次。

## 兼容性与失败处理

- 没有 `forked_from_id` 的 session 不启用新状态机。
- 没有明确 Fork 边界时，使用源 session 的继承 `turn_id` 集合识别新轮次，不使用容易被大文件复制停顿欺骗的短时静默判断。
- 如果源 session 无法定位且日志也没有子 session 边界，优先保持静默，避免再次重放历史通知。
- 原有 subagent 过滤、Goal 状态、`request_user_input` 确认提醒和 TUI 失败提醒保持不变。

## 测试

1. **时间戳重写**：源 session 与 Fork session 同时存在，Fork 历史使用当前时间戳，预期通知数为 `0`。
2. **分批复制**：Watch 先附着 Fork session，再分批追加历史 `task_complete`，包括较长批次间隔，预期通知数为 `0`。
3. **无明确边界**：没有 `thread_settings_applied` 时，复制轮次的 `turn_id` 仍静默，首个非继承 `turn_id` 的新任务立即恢复提醒。
4. **新对话完成**：Fork 初始化结束后追加用户新消息和新 `task_complete`，预期只提醒 `1` 次，内容为新分支输出。
5. **attach/prime 竞态**：在 follower attach 后、seed priming 前追加历史、边界和新轮次，预期历史不被二次读取，新轮次只提醒 `1` 次。
6. **Fork in this workspace**：Fork session 使用不同 `cwd`，历史不提醒，新对话完成后提醒 `1` 次。
7. **普通 session**：没有 `forked_from_id` 的 session 仍按现有规则正常提醒。

## 成功标准

- 执行 Fork 不会触发任何原对话提醒。
- Fork 复制历史无论是一次性写入、分批写入还是重写时间戳，都不会触发提醒。
- 用户在 Fork 对话中开始新任务后，完成时正常提醒一次。
- 普通 Codex session 及其他来源的通知行为不变。
