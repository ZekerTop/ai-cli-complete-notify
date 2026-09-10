# 2.16.0 Herdr 路径检测修复

## 根因与修改

此前仅通过 PATH 调用 Herdr。Finder 启动的应用通常不包含 `~/.local/bin`，导致已安装 Herdr 仍显示无法查询。隔离环境复现了 `spawnSync herdr ENOENT`，指定绝对路径后真实 Herdr 0.9.0 返回正常插件列表。

仅修改共享的 Herdr 可执行文件解析：手动 `HERDR_BIN_PATH` 优先，其次原 PATH，最后在 macOS 检查 `~/.local/bin`、`/opt/homebrew/bin`、`/usr/local/bin` 的可执行文件。不修改系统 PATH，不启动 Herdr 服务，不改变其他 AI 集成。状态、安装、卸载、预览共用此解析函数。

## 验证

- 全量回归：139 / 139 通过，0 跳过；`src-tauri/target/herdr-path-tests.log`。
- TypeScript 检查、Tauri release app 构建、`git diff --check` 通过。
- 最终 DMG 挂载后使用其内置 Node 执行 Herdr 测试：14 / 14 通过；包含 GUI PATH 发现、配置调用及手动/PATH 优先级；`src-tauri/target/dmg-2.16.0-herdr-path/tests.log`。
- 真实 Herdr 0.9.0 使用工作区隔离 HOME，放置于模拟 `~/.local/bin`，仅保留 `/usr/bin:/bin` PATH；最终 DMG sidecar 成功自动发现并查询。证据 `src-tauri/target/dmg-2.16.0-herdr-path/real-status.json`。
- DMG 内源码与工作树一致；应用版本 2.16.0；应用与 Node 均 arm64；ad-hoc 签名验证和 DMG 校验通过。
- 安装布局 `.DS_Store`、卷图标与原模板逐字节一致，Applications 快捷方式不变。

## 当前交付

- `/Users/zt/Desktop/开源项目/ai-cli-complete-notify/dist/ai-cli-complete-notify_2.16.0_aarch64.dmg`
- 大小：44,783,042 字节。
- SHA256：`ea03689a7a5b427178d5f91f6678ba79cfafa6427783b7c61783321c59f10afa`
- 仍为未发布的 2.16.0，本地旧包已备份，2.15.0 发布包未修改。

没有替换用户 `/Applications` 中的应用，没有修改真实 Herdr 配置或开启通知；需用户退出旧应用、安装修复版，再检查和配置。真实插件安装/通知端到端联调仍未验证。本包仅 Apple Silicon，未经 Apple 公证。
