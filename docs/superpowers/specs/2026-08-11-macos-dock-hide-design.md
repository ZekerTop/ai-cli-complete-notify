# macOS 程序坞图标隐藏功能设计

**日期**：2026-08-11  
**分支**：在新分支上开发

---

## 背景

当前应用在 macOS 上启动后，图标同时出现在程序坞（Dock）和菜单栏中。部分用户希望将应用作为纯菜单栏工具使用，不在程序坞中占位。本功能在「系统」面板的「关闭按钮行为」卡片中新增一个复选项，允许用户控制程序坞图标的显示与隐藏，且切换后立即生效。

---

## 功能描述

在 `AdvancedPanel`「无感启动」checkbox 的正下方（与其平级）新增：

```
[ ] 在程序坞中隐藏（仅在 macOS 菜单栏显示图标）
    隐藏后应用不再出现在程序坞中，仅通过菜单栏图标操作。（仅 macOS 有效）
```

**行为**：
- 勾选后**立即**隐藏程序坞图标，无需重启
- 取消勾选后**立即**恢复程序坞图标
- 设置持久化到 `settings.json`，下次启动自动应用

**副作用**：隐藏程序坞图标会将 macOS Activation Policy 从 Regular 切换为 Accessory，应用将不再出现在 Dock 中。用户通过 hint 文字了解此行为。

---

## 架构

改动分四层：

```
UI (AdvancedPanel)
  └─ checkbox: hideDockIcon
       ├─ onChange → invoke('set_dock_hidden')   // 立即生效
       └─ onUpdate(config.ui.hideDockIcon)       // 持久化到 settings.json

前端类型 (types.ts)
  └─ AppConfig.ui.hideDockIcon: boolean

Rust 后端 (lib.rs)
  ├─ set_dock_hidden(hidden: bool)               // tauri command
  ├─ apply_dock_policy(hidden: bool)             // 内部函数，macOS only
  └─ setup() 启动时读取 hideDockIcon 应用初始 policy

i18n (zh-CN.json / en.json)
  └─ 新增 advanced.hideDockIcon / advanced.hideDockIconHint
```

---

## 详细设计

### 1. UI — AdvancedPanel.tsx

在「无感启动」checkbox 块的正下方，新增同样结构的 checkbox 块：

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

> UI 层不做平台判断，始终渲染。Rust 侧非 macOS 时为空操作。

### 2. 前端类型 — types.ts

`AppConfig.ui` 新增字段：

```typescript
hideDockIcon: boolean;
```

### 3. 前端 window.ts

新增导出函数：

```typescript
export function setDockHidden(hidden: boolean) {
  return invoke<void>('set_dock_hidden', { hidden });
}
```

### 4. 默认配置 — default-config.js

`ui.hideDockIcon` 默认值为 `false`（不隐藏程序坞图标）。

### 5. Rust 后端 — lib.rs

**新增内部函数**（仅 macOS 编译）：

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

**新增 Tauri command**：

```rust
#[tauri::command]
fn set_dock_hidden(hidden: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    apply_dock_policy(hidden);
    Ok(())
}
```

注册到 `invoke_handler!` 宏：

```rust
.invoke_handler(tauri::generate_handler![
    get_startup_status,
    set_autostart_enabled,
    hide_to_tray,
    set_dock_hidden,   // 新增
])
```

**新增读取函数**（模式同 `read_silent_start_setting`）：

```rust
fn read_hide_dock_icon_setting() -> bool {
    // 读取 settings.json → ui.hideDockIcon，缺省返回 false
}
```

**`setup()` 中应用初始 policy**：

```rust
let hide_dock = read_hide_dock_icon_setting();
#[cfg(target_os = "macos")]
apply_dock_policy(hide_dock);
```

### 6. 依赖 — Cargo.toml

新增（macOS only）：

```toml
[target.'cfg(target_os = "macos")'.dependencies]
objc2-app-kit = { version = "0.3", features = ["NSApplication"] }
```

### 7. i18n

**zh-CN.json** 新增：

```json
"advanced.hideDockIcon": "在程序坞中隐藏（仅在 macOS 菜单栏显示图标）",
"advanced.hideDockIconHint": "隐藏后应用不再出现在程序坞中，仅通过菜单栏图标操作。（仅 macOS 有效）"
```

**en.json** 新增：

```json
"advanced.hideDockIcon": "Hide from Dock (show only in macOS menu bar)",
"advanced.hideDockIconHint": "When hidden, the app will not appear in the Dock. Use the menu bar icon to access it. (macOS only)"
```

---

## 开发分支

在新分支上开发，建议分支名：`feat/macos-dock-hide`

---

## 变更文件清单

| 文件 | 变更类型 |
|------|---------|
| `src-ui/components/AdvancedPanel.tsx` | 新增 checkbox UI |
| `src-ui/lib/types.ts` | 新增 `hideDockIcon: boolean` |
| `src-ui/lib/window.ts` | 新增 `setDockHidden` 函数 |
| `src/default-config.js` | 新增 `ui.hideDockIcon: false` |
| `src-tauri/src/lib.rs` | 新增 command、内部函数、启动时初始化 |
| `src-tauri/Cargo.toml` | 新增 `objc2-app-kit` 依赖（macOS only） |
| `src-ui/i18n/zh-CN.json` | 新增 2 个翻译键 |
| `src-ui/i18n/en.json` | 新增 2 个翻译键 |
