# macOS 程序坞图标隐藏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在「系统」面板的「无感启动」选项下方新增「在程序坞中隐藏」复选框，让用户可以立即隐藏/恢复 macOS Dock 图标，并持久化该设置。

**Architecture:** 新增 Rust command `set_dock_hidden` 调用 macOS `NSApp.setActivationPolicy` 切换 Dock 可见性；前端 checkbox onChange 同时调用该 command（立即生效）并更新 config（持久化）；启动时读取设置应用初始 policy。

**Tech Stack:** Tauri 2, React + TypeScript, `objc2-app-kit`（macOS only）, node:test（测试）

## Global Constraints

- 新分支开发：从 `main` 创建 `feat/macos-dock-hide` 分支，所有提交在该分支上
- 非 macOS 平台：Rust 侧用 `#[cfg(target_os = "macos")]` 隔离，前端不做平台判断（hint 文字注明仅 macOS）
- 命名规范：config 字段 `hideDockIcon`，Rust command `set_dock_hidden`，前端函数 `setDockHidden`，i18n key `advanced.hideDockIcon` / `advanced.hideDockIconHint`
- 切换 Activation Policy 为 Accessory 后应用不出现在 Dock 中（此为预期行为，不是 bug）
- 测试文件使用 `node:test` + `node:assert/strict`，风格与 `tests/tray-hide-source.test.js` 一致

---

## File Map

| 文件 | 变更类型 | 职责 |
|------|---------|------|
| `src-tauri/Cargo.toml` | 修改 | 新增 `objc2-app-kit` macOS only 依赖 |
| `src-tauri/src/lib.rs` | 修改 | 新增 `apply_dock_policy`、`read_hide_dock_icon_setting`、`set_dock_hidden` command，启动时初始化 |
| `src-ui/lib/window.ts` | 修改 | 新增 `setDockHidden` 导出函数 |
| `src-ui/lib/types.ts` | 修改 | `AppConfig.ui` 新增 `hideDockIcon: boolean` |
| `src/default-config.js` | 修改 | `ui.hideDockIcon` 默认值 `false` |
| `src-ui/i18n/zh-CN.json` | 修改 | 新增 2 个翻译键 |
| `src-ui/i18n/en.json` | 修改 | 新增 2 个翻译键 |
| `src-ui/components/AdvancedPanel.tsx` | 修改 | 新增 checkbox UI，调用 `setDockHidden` |
| `tests/macos-dock-hide.test.js` | 新建 | 结构性测试：验证各层实现正确连接 |

---

## Task 1: 创建开发分支

**Files:**
- 无文件变更，仅 git 操作

- [ ] **Step 1: 创建并切换到新分支**

```bash
cd /Users/fuliang/Workspace/ai-cli-complete-notify
git checkout -b feat/macos-dock-hide
```

Expected: `Switched to a new branch 'feat/macos-dock-hide'`

- [ ] **Step 2: 确认当前分支**

```bash
git branch
```

Expected: `* feat/macos-dock-hide` 高亮显示

---

## Task 2: 添加 Rust 依赖并实现后端

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces:
  - `set_dock_hidden(hidden: bool) -> Result<(), String>` — Tauri command，注册到 invoke_handler
  - `apply_dock_policy(hidden: bool)` — 内部函数，`#[cfg(target_os = "macos")]`
  - `read_hide_dock_icon_setting() -> bool` — 读取 `settings.json` 的 `ui.hideDockIcon`

- [ ] **Step 1: 在 `Cargo.toml` 新增 macOS only 依赖**

在 `[dependencies]` 块末尾之后，新增：

```toml
[target.'cfg(target_os = "macos")'.dependencies]
objc2-app-kit = { version = "0.3", features = ["NSApplication"] }
```

完整 `Cargo.toml` 末尾部分应为：

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-process = "2"
tauri-plugin-autostart = "2"
tauri-plugin-single-instance = "2.4.0"
tauri-plugin-notification = "2.3.3"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[target.'cfg(target_os = "macos")'.dependencies]
objc2-app-kit = { version = "0.3", features = ["NSApplication"] }
```

- [ ] **Step 2: 在 `lib.rs` 新增 `read_hide_dock_icon_setting`**

在 `read_silent_start_setting` 函数（约第 116 行）**之后**，插入：

```rust
fn read_hide_dock_icon_setting() -> bool {
    let settings_path = get_data_dir().join("settings.json");
    let bytes = match fs::read(&settings_path) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };

    let parsed: serde_json::Value = match serde_json::from_slice(&bytes) {
        Ok(value) => value,
        Err(_) => return false,
    };

    parsed
        .get("ui")
        .and_then(|ui| ui.get("hideDockIcon"))
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
}
```

- [ ] **Step 3: 在 `lib.rs` 新增 `apply_dock_policy` 内部函数**

在 `read_hide_dock_icon_setting` 函数**之后**，插入：

```rust
#[cfg(target_os = "macos")]
fn apply_dock_policy(hidden: bool) {
    use objc2_app_kit::{NSApplication, NSApplicationActivationPolicy};
    let app = unsafe { NSApplication::sharedApplication() };
    let policy = if hidden {
        NSApplicationActivationPolicy::Accessory
    } else {
        NSApplicationActivationPolicy::Regular
    };
    unsafe { app.setActivationPolicy(policy) };
}
```

- [ ] **Step 4: 在 `lib.rs` 新增 `set_dock_hidden` Tauri command**

在 `hide_to_tray` command（约第 171 行）**之后**，插入：

```rust
#[tauri::command]
fn set_dock_hidden(hidden: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    apply_dock_policy(hidden);
    Ok(())
}
```

- [ ] **Step 5: 注册新 command 到 invoke_handler**

找到 `invoke_handler` 宏（约第 191 行），将其修改为：

```rust
.invoke_handler(tauri::generate_handler![
    get_startup_status,
    set_autostart_enabled,
    hide_to_tray,
    set_dock_hidden,
])
```

- [ ] **Step 6: 在 `setup()` 中应用初始 dock policy**

找到 `setup` 闭包内 `let should_stay_hidden = ...` 之后（约第 201 行），在 `app.manage(launch_state);` 之前，插入：

```rust
let hide_dock = read_hide_dock_icon_setting();
#[cfg(target_os = "macos")]
apply_dock_policy(hide_dock);
```

即修改后该区域如下：

```rust
let should_stay_hidden =
    launch_state.silent_start_requested || read_silent_start_setting();

let hide_dock = read_hide_dock_icon_setting();
#[cfg(target_os = "macos")]
apply_dock_policy(hide_dock);

app.manage(launch_state);
```

- [ ] **Step 7: 验证 Rust 编译通过**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: `Finished` 无 error（warning 可忽略）

- [ ] **Step 8: Commit**

```bash
cd ..
git add src-tauri/Cargo.toml src-tauri/src/lib.rs
git commit -m "feat: add set_dock_hidden command and macOS activation policy control"
```

---

## Task 3: 前端类型、默认配置、window 函数、i18n

**Files:**
- Modify: `src-ui/lib/types.ts`
- Modify: `src/default-config.js`
- Modify: `src-ui/lib/window.ts`
- Modify: `src-ui/i18n/zh-CN.json`
- Modify: `src-ui/i18n/en.json`

**Interfaces:**
- Consumes: `set_dock_hidden` command（Task 2 产出）
- Produces:
  - `AppConfig.ui.hideDockIcon: boolean`
  - `setDockHidden(hidden: boolean): Promise<void>`
  - i18n keys: `advanced.hideDockIcon`, `advanced.hideDockIconHint`

- [ ] **Step 1: `types.ts` — 在 `AppConfig.ui` 中新增字段**

找到 `ui:` 块，在 `notificationMode` 字段之后新增一行：

```typescript
ui: {
  language: string;
  closeBehavior: 'ask' | 'tray' | 'exit';
  autostart: boolean;
  silentStart: boolean;
  watchLogRetentionDays: number;
  autoFocusOnNotify: boolean;
  forceMaximizeOnFocus: boolean;
  focusTarget: 'auto' | 'vscode' | 'terminal';
  confirmAlert: { enabled: boolean };
  notificationMode: 'watch' | 'hooks';
  hideDockIcon: boolean;
};
```

- [ ] **Step 2: `default-config.js` — 新增默认值**

找到 `ui:` 块，在 `notificationMode: 'hooks'` 之后新增：

```javascript
hideDockIcon: false,
```

即：

```javascript
notificationMode: 'hooks',
    hideDockIcon: false,
  },
```

- [ ] **Step 3: `window.ts` — 新增 `setDockHidden` 函数**

在现有 `hideToTray` 之后追加：

```typescript
export function setDockHidden(hidden: boolean) {
  return invoke<void>('set_dock_hidden', { hidden });
}
```

完整文件应为：

```typescript
import { invoke } from '@tauri-apps/api/core';

export function hideToTray() {
  return invoke<void>('hide_to_tray');
}

export function setDockHidden(hidden: boolean) {
  return invoke<void>('set_dock_hidden', { hidden });
}
```

- [ ] **Step 4: `zh-CN.json` — 新增翻译键**

在 `advanced.silentStartHint` 这一行之后，插入：

```json
"advanced.hideDockIcon": "在程序坞中隐藏（仅在 macOS 菜单栏显示图标）",
"advanced.hideDockIconHint": "隐藏后应用不再出现在程序坞中，仅通过菜单栏图标操作。（仅 macOS 有效）",
```

- [ ] **Step 5: `en.json` — 新增翻译键**

在 `advanced.silentStartHint` 这一行之后，插入：

```json
"advanced.hideDockIcon": "Hide from Dock (show only in macOS menu bar)",
"advanced.hideDockIconHint": "When hidden, the app will not appear in the Dock. Use the menu bar icon to access it. (macOS only)",
```

- [ ] **Step 6: Commit**

```bash
git add src-ui/lib/types.ts src/default-config.js src-ui/lib/window.ts \
        src-ui/i18n/zh-CN.json src-ui/i18n/en.json
git commit -m "feat: add hideDockIcon config field, default value, setDockHidden fn, and i18n keys"
```

---

## Task 4: UI — AdvancedPanel 新增 checkbox

**Files:**
- Modify: `src-ui/components/AdvancedPanel.tsx`

**Interfaces:**
- Consumes:
  - `config.ui.hideDockIcon: boolean`（Task 3 产出）
  - `setDockHidden(hidden: boolean): Promise<void>`（Task 3 产出）
  - `t('advanced.hideDockIcon')` / `t('advanced.hideDockIconHint')`（Task 3 产出）

- [ ] **Step 1: 在文件顶部 import 中新增 `setDockHidden`**

找到现有的 import 区域（文件开头），目前没有从 `@/lib/window` 导入任何内容。新增一行：

```typescript
import { setDockHidden } from '@/lib/window';
```

- [ ] **Step 2: 在「无感启动」块之后插入「在程序坞中隐藏」块**

找到「无感启动」的整个 `<div className="space-y-2">` 块（约第 93 行），其结束 `</div>` 之后（在关闭按钮行为卡片 `</div>` 之前），插入：

```tsx
<div className="space-y-2">
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={config.ui.hideDockIcon}
      onChange={() =>
        onUpdate((c) => {
          const next = { ...c, ui: { ...c.ui, hideDockIcon: !c.ui.hideDockIcon } };
          void setDockHidden(next.ui.hideDockIcon);
          return next;
        })
      }
      className={checkboxClass}
    />
    <span className="text-sm leading-relaxed">{t('advanced.hideDockIcon')}</span>
  </label>
  <div className="pl-[30px] text-xs text-muted leading-relaxed">
    {t('advanced.hideDockIconHint')}
  </div>
</div>
```

插入位置参考——修改后该卡片结构应为：

```tsx
{/* Close behavior card */}
<div className="surface-card-soft p-4 space-y-4">
  {/* closeBehavior select */}
  ...

  {/* autostart */}
  ...

  {/* silentStart */}
  <div className="space-y-2">
    <label ...>silentStart checkbox</label>
    <div ...>silentStartHint</div>
  </div>

  {/* hideDockIcon ← 新增在这里 */}
  <div className="space-y-2">
    <label ...>hideDockIcon checkbox</label>
    <div ...>hideDockIconHint</div>
  </div>

</div>
```

- [ ] **Step 3: 确认 TypeScript 类型检查通过**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 无 error 输出（如有 warning 可忽略）

- [ ] **Step 4: Commit**

```bash
git add src-ui/components/AdvancedPanel.tsx
git commit -m "feat: add hideDockIcon checkbox to AdvancedPanel"
```

---

## Task 5: 结构性测试

**Files:**
- Create: `tests/macos-dock-hide.test.js`

**Interfaces:**
- Consumes: 所有前序 task 的产出

- [ ] **Step 1: 新建测试文件**

创建 `tests/macos-dock-hide.test.js`，内容如下：

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('set_dock_hidden command is registered in invoke_handler', () => {
  const rustSource = fs.readFileSync(
    path.join(root, 'src-tauri', 'src', 'lib.rs'),
    'utf8'
  );

  assert.match(rustSource, /fn set_dock_hidden\(/, 'set_dock_hidden function must exist');
  assert.match(rustSource, /set_dock_hidden,/, 'set_dock_hidden must be registered in invoke_handler');
});

test('apply_dock_policy is cfg-gated to macOS only', () => {
  const rustSource = fs.readFileSync(
    path.join(root, 'src-tauri', 'src', 'lib.rs'),
    'utf8'
  );

  assert.match(
    rustSource,
    /#\[cfg\(target_os = "macos"\)\]\s*fn apply_dock_policy/,
    'apply_dock_policy must be macOS-only'
  );
});

test('startup applies initial dock policy from settings', () => {
  const rustSource = fs.readFileSync(
    path.join(root, 'src-tauri', 'src', 'lib.rs'),
    'utf8'
  );

  assert.match(rustSource, /read_hide_dock_icon_setting\(\)/, 'must read hideDockIcon on startup');
  assert.match(rustSource, /apply_dock_policy\(hide_dock\)/, 'must apply policy on startup');
});

test('setDockHidden is exported from window.ts and invokes set_dock_hidden', () => {
  const windowSource = fs.readFileSync(
    path.join(root, 'src-ui', 'lib', 'window.ts'),
    'utf8'
  );

  assert.match(windowSource, /export function setDockHidden/, 'setDockHidden must be exported');
  assert.match(windowSource, /invoke.*set_dock_hidden/, 'must invoke set_dock_hidden command');
});

test('AppConfig.ui includes hideDockIcon boolean field', () => {
  const typesSource = fs.readFileSync(
    path.join(root, 'src-ui', 'lib', 'types.ts'),
    'utf8'
  );

  assert.match(typesSource, /hideDockIcon:\s*boolean/, 'hideDockIcon must be typed as boolean');
});

test('default config sets hideDockIcon to false', () => {
  const defaultConfig = require(path.join(root, 'src', 'default-config.js'));

  assert.strictEqual(
    defaultConfig.DEFAULT_CONFIG.ui.hideDockIcon,
    false,
    'hideDockIcon default must be false'
  );
});

test('AdvancedPanel imports setDockHidden and uses hideDockIcon config', () => {
  const panelSource = fs.readFileSync(
    path.join(root, 'src-ui', 'components', 'AdvancedPanel.tsx'),
    'utf8'
  );

  assert.match(panelSource, /import.*setDockHidden.*from.*window/, 'must import setDockHidden');
  assert.match(panelSource, /config\.ui\.hideDockIcon/, 'must use config.ui.hideDockIcon');
  assert.match(panelSource, /setDockHidden\(/, 'must call setDockHidden on change');
});

test('i18n keys exist in zh-CN and en', () => {
  const zhSource = fs.readFileSync(
    path.join(root, 'src-ui', 'i18n', 'zh-CN.json'),
    'utf8'
  );
  const enSource = fs.readFileSync(
    path.join(root, 'src-ui', 'i18n', 'en.json'),
    'utf8'
  );

  assert.match(zhSource, /"advanced\.hideDockIcon"/, 'zh-CN must have hideDockIcon key');
  assert.match(zhSource, /"advanced\.hideDockIconHint"/, 'zh-CN must have hideDockIconHint key');
  assert.match(enSource, /"advanced\.hideDockIcon"/, 'en must have hideDockIcon key');
  assert.match(enSource, /"advanced\.hideDockIconHint"/, 'en must have hideDockIconHint key');
});
```

- [ ] **Step 2: 运行测试（实现完成前应全部通过）**

```bash
node --test tests/macos-dock-hide.test.js
```

Expected: 所有 8 个测试 PASS

若有失败，根据错误信息检查对应文件的实现是否正确。

- [ ] **Step 3: Commit**

```bash
git add tests/macos-dock-hide.test.js
git commit -m "test: add structural tests for macOS dock hide feature"
```

---

## Task 6: 全量测试 & 收尾

**Files:**
- 无新文件，验证整体

- [ ] **Step 1: 运行全部测试**

```bash
node --test tests/*.test.js 2>&1
```

Expected: 所有测试全部 PASS，无 FAIL

- [ ] **Step 2: 确认 Rust 编译**

```bash
cd src-tauri && cargo check && cd ..
```

Expected: `Finished` 无 error

- [ ] **Step 3: 确认 TypeScript 类型检查**

```bash
npx tsc --noEmit 2>&1
```

Expected: 无 error

- [ ] **Step 4: 推送分支**

```bash
git push -u origin feat/macos-dock-hide
```

Expected: 分支推送成功，显示远端 URL
