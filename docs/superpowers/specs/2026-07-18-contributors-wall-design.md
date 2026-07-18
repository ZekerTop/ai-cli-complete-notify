# README Contributors 头像墙设计

## 目标

在项目的五份 README 中新增自动更新的 Contributors 头像墙，视觉上采用紧密排列的圆形 GitHub 头像，并保持现有贡献说明和 Star History 不变。

## 实现方案

- 使用 `contrib.rocks` 动态图片：
  `https://contrib.rocks/image?repo=ZekerTop/ai-cli-complete-notify&max=100&columns=12&anon=0`
- 图片链接指向 GitHub Contributors 页面：
  `https://github.com/ZekerTop/ai-cli-complete-notify/graphs/contributors`
- 在现有 Contributing 区块之后、Links 区块之前新增 Contributors 区块。
- 分别使用英文、简体中文、繁体中文、日文和韩文标题及感谢文案。
- 五份 README 共用同一个动态图片地址，避免重复维护。

## 自动更新

`contrib.rocks` 根据 GitHub 的公开贡献者数据生成头像墙。出现新的代码贡献者后，图片会自动更新，不需要仓库 Token、生成脚本或额外的 GitHub Actions。第三方服务和 GitHub CDN 缓存可能导致更新存在短暂延迟。

## 影响范围

仅修改以下文档：

- `README.md`
- `README_zh.md`
- `README_zh-TW.md`
- `README_ja.md`
- `README_ko.md`

不修改应用代码、构建流程、现有 Star History 工作流或生成文件。

## 验证

- 检查五份 README 均只新增一个 Contributors 区块。
- 检查五份 README 使用一致的 `contrib.rocks` 图片地址和 GitHub Contributors 链接。
- 请求动态图片地址并确认返回有效 SVG，且包含当前仓库贡献者头像。
- 执行 `git diff --check`，确认 Markdown 无空白或格式错误。
