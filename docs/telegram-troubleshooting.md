# Telegram troubleshooting / Telegram 排障

In **Test notification**, click **Check Telegram**, or run:

```sh
node ai-reminder.js telegram-check
```

This uses the same configuration and HTTP(S) proxy as notifications. It calls `getMe`, then `getChat`; it does not send messages or consume `getUpdates`. Exit status is 0 on success and 1 on failure. Success confirms authentication and chat access, but does not prove permission to send messages; use a test notification to verify delivery.

- `stage: getMe`, `401 Unauthorized`: Telegram rejected the credential actually used by this process. Check `tokenSource` first. Sending `/start` or changing Chat ID cannot repair token authentication.
- `tokenSource.source: env-file`: the token came from the displayed `.env` path.
- `tokenSource.source: process-environment`: the process inherited the token. `shadowsEnvFile: true` means it differs from the discovered file; update/unset the inherited variable or explicitly select the intended file.
- `settingsTokenOverridden: true`: an environment token overrides the token saved in settings. Editing only settings will not change the active credential.
- `stage: getChat`: authentication succeeded. Check the Chat ID, start a private conversation with this bot, or add the bot to the intended group/channel. Sending to a channel also requires appropriate posting permissions.
- Connection failures: check network access and the configured HTTP(S) CONNECT proxy. The check reports whether a proxy is active without printing its credentials.

To explicitly select a file on macOS/Linux:

```sh
AI_CLI_COMPLETE_NOTIFY_ENV_PATH=/absolute/path/to/.env node ai-reminder.js telegram-check
```

An explicitly selected existing file overrides inherited variables for keys present in that file. Automatic `.env` discovery keeps environment-first precedence. Environment values still take precedence over settings. Restart a long-running watcher after changing its environment file.

Copy only the BotFather token, without an API URL or the `bot` prefix. If the intended token itself fails authentication, replace it through BotFather. Revoke any token exposed publicly. Do not paste tokens or credential-bearing URLs into issues; inspect diagnostic output for local file paths before sharing it.

中文：在「测试通知」点击 Telegram 检查，先核对实际 Token 来源，再区分认证失败和聊天访问失败。明确指定的 `.env` 现在优先于继承环境变量；自动查找仍保留原来的环境变量优先规则。检查不发消息，实际送达还需发送测试通知确认。
