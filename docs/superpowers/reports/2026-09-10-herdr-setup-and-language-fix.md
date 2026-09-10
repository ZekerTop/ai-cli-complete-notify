# 2.16.0 Herdr 连接失败与语言切换修复

## 实际复现

在工作区隔离 HOME 中安装官方 Herdr 0.9.0，并实际下载社区插件 0.2.0（提交 9d1236ddf7e6c3334e3ddfc3161ece820553a5c5）。原流程安装成功后重复执行 `plugin enable`，在没有运行 Herdr 服务时返回 `server_not_running`；UI 将部分成功误报为笼统配置失败。重复连接还会重新下载已存在的插件；验证过程中真实遇到下载超时。

UI 将 `t(...)` 翻译后的句子存入状态，导致中文错误产生后切换英文，已有提示仍为中文。

## 修复

- 已安装插件不再重复下载，已启用插件不再重复激活。未安装时仍需用户确认下载。
- 新增安装结果的 `--json` 输出，提供安全的阶段和错误代码，不向界面透传第三方原始输出。
- 对未启动 Herdr、超时、安装/桥接配置/激活失败分别给出本地化提示。
- UI 保存翻译键，成功及失败提示随当前语言即时切换。
- 「配置…」更名为「安装并连接插件…」，成功提示说明在终端运行 herdr、在其中使用 AI 工具，以及独立开启通知的步骤。
- 不改变用户现有来源、通知渠道或 Herdr 通知开关。不安装或替换 `/Applications` 内应用。

## 验证

- 143 / 143 全量测试通过，0 跳过：`src-tauri/target/herdr-setup-tests.log`。
- TypeScript、Vite/Tauri release 构建和 `git diff --check` 通过。
- 最终 DMG 只读挂载，内置 Node 执行 18 / 18 Herdr 测试通过：`src-tauri/target/dmg-2.16.0-herdr-setup/tests.log`。
- 最终 DMG sidecar 使用真实 Herdr 与真实已安装插件，最小 GUI PATH、未启动 Herdr 服务时重连成功；实际状态 available/installed/enabled/configured 均 true：同目录 `real-install.json`、`real-status.json`。
- CUA 浏览器运行真实 UI 组件、mock Tauri 通道：先产生中文错误，再切换英文，旧提示立即变英文；英文连接成功后切换中文，成功提示变中文；通知仍关闭、其他来源不变。
- 最终包主程序及 Node 均 arm64、应用版本 2.16.0；源码与工作树一致；ad-hoc 签名、DMG 校验通过；安装布局和图标保持原样。

## 当前包

路径：`/Users/zt/Desktop/开源项目/ai-cli-complete-notify/dist/ai-cli-complete-notify_2.16.0_aarch64.dmg`

大小：45,768,831 字节。

SHA256：`fce19b487641f6b14cd48e6c00b3d4cd61f4431937e9bd1b6e028bb6c129d37d`

上一版保存在工作树 `src-tauri/target/dmg-2.16.0-herdr-setup/previous-2.16.0.dmg`。未推送、未发布；仍为 Apple Silicon 本地构建，未经 Apple 公证。真实任务事件到外部通知渠道的完整联调未进行，未改动用户真实配置或启动其 Herdr 服务。
