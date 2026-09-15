const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const test = require('node:test');

function mockTelegramResponse(t, { statusCode, body }, onRequest) {
  const originalRequest = https.request;
  const previousToken = process.env.TELEGRAM_BOT_TOKEN;
  const previousChatId = process.env.TELEGRAM_CHAT_ID;

  t.after(() => {
    https.request = originalRequest;
    if (previousToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previousToken;
    if (previousChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = previousChatId;
  });

  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;

  https.request = (options, callback) => {
    let payload = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      payload += chunk.toString();
    };
    req.end = () => {
      if (onRequest) onRequest(options, payload);
      const res = new EventEmitter();
      res.statusCode = statusCode;
      callback(res);
      res.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };
}

test('notifyTelegram sends the configured token and chat id', async (t) => {
  let capturedPath = '';
  let capturedPayload = null;
  mockTelegramResponse(t, { statusCode: 200, body: { ok: true } }, (options, payload) => {
    capturedPath = options.path;
    capturedPayload = JSON.parse(payload);
  });

  delete require.cache[require.resolve('../src/notifiers/telegram')];
  const { notifyTelegram } = require('../src/notifiers/telegram');
  const result = await notifyTelegram({
    config: {
      channels: {
        telegram: {
          botToken: '1234567890:test-token',
          chatId: '123456789',
        },
      },
    },
    title: 'Test',
    contentText: 'Hello',
  });

  assert.equal(result.ok, true);
  assert.equal(capturedPath, '/bot1234567890:test-token/sendMessage');
  assert.equal(capturedPayload.chat_id, '123456789');
  assert.match(capturedPayload.text, /Hello/);
});

test('notifyTelegram explains a non-JSON HTTP 401 response without exposing the token', async (t) => {
  mockTelegramResponse(t, {
    statusCode: 401,
    body: 'Unauthorized',
  });

  delete require.cache[require.resolve('../src/notifiers/telegram')];
  const { notifyTelegram } = require('../src/notifiers/telegram');
  const result = await notifyTelegram({
    config: {
      channels: {
        telegram: {
          botToken: '1234567890:secret-token',
          chatId: '123456789',
        },
      },
    },
    title: 'Test',
    contentText: 'Hello',
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /Token/);
  assert.match(result.error, /@BotFather/);
  assert.doesNotMatch(result.error, /secret-token/);
});

test('notifyTelegram recognizes Telegram error_code 401', async (t) => {
  mockTelegramResponse(t, {
    statusCode: 200,
    body: { ok: false, error_code: 401, description: 'Authentication failed' },
  });

  delete require.cache[require.resolve('../src/notifiers/telegram')];
  const { notifyTelegram } = require('../src/notifiers/telegram');
  const result = await notifyTelegram({
    config: {
      channels: {
        telegram: {
          botToken: '1234567890:test-token',
          chatId: '123456789',
        },
      },
    },
    title: 'Test',
    contentText: 'Hello',
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /Token/);
  assert.match(result.error, /@BotFather/);
});

test('notifyTelegram keeps non-authentication Telegram errors', async (t) => {
  mockTelegramResponse(t, {
    statusCode: 400,
    body: { ok: false, error_code: 400, description: 'Bad Request: chat not found' },
  });

  delete require.cache[require.resolve('../src/notifiers/telegram')];
  const { notifyTelegram } = require('../src/notifiers/telegram');
  const result = await notifyTelegram({
    config: {
      channels: {
        telegram: {
          botToken: '1234567890:test-token',
          chatId: '123456789',
        },
      },
    },
    title: 'Test',
    contentText: 'Hello',
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Bad Request: chat not found');
});

test('Telegram credential checks are read-only and redact private response fields', async (t) => {
  const methods = [];
  mockTelegramResponse(t, { statusCode: 200, body: { ok: true, result: { username: 'fixture_bot', id: 987654321, title: 'private title' } } }, (options) => {
    methods.push(options.path.split('/').at(-1));
  });
  const { checkTelegram } = require('../src/notifiers/telegram');
  const result = await checkTelegram({ channels: { telegram: { botToken: '1234567890:fixture-token', chatId: '987654321' } } });
  assert.equal(result.ok, true);
  assert.equal(result.botUsername, 'fixture_bot');
  assert.equal(result.tokenSource.source, 'settings');
  assert.deepEqual(methods, ['getMe', 'getChat']);
  assert.doesNotMatch(JSON.stringify(result), /fixture-token|987654321|private title/);
});

test('Telegram credential checks stop on failed authentication without attempting chat access', async (t) => {
  const methods = [];
  mockTelegramResponse(t, { statusCode: 401, body: { ok: false, error_code: 401, description: 'Unauthorized' } }, (options) => methods.push(options.path.split('/').at(-1)));
  const { checkTelegram } = require('../src/notifiers/telegram');
  const result = await checkTelegram({ channels: { telegram: { botToken: '1234567890:fixture-token', chatId: '123' } } });
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'getMe');
  assert.deepEqual(methods, ['getMe']);
  assert.match(result.error, /401 Unauthorized/);
  assert.doesNotMatch(JSON.stringify(result), /fixture-token/);
});

test('Telegram rejects copied API URLs, bot prefixes and invisible characters before making a request', async (t) => {
  let requests = 0;
  mockTelegramResponse(t, { statusCode: 200, body: { ok: true } }, () => requests++);
  const { notifyTelegram } = require('../src/notifiers/telegram');
  for (const token of ['bot1234567890:fixture-token', 'https://api.telegram.org/bot1234567890:fixture-token', '1234567890:fixture\u200btoken']) {
    const result = await notifyTelegram({ config: { channels: { telegram: { botToken: token, chatId: '123' } } }, title: 'Test', contentText: 'Test' });
    assert.equal(result.ok, false);
    assert.match(result.error, /format is invalid/);
    assert.ok(!result.error.includes(token));
  }
  assert.equal(requests, 0);
});

test('Telegram shows summary or original output, escapes HTML and bounds long messages', async (t) => {
  const payloads = [];
  mockTelegramResponse(t, { statusCode: 200, body: { ok: true } }, (_options, payload) => payloads.push(JSON.parse(payload)));
  const { notifyTelegram } = require('../src/notifiers/telegram');
  const base = { config: { channels: { telegram: { botToken: '123:fixture', chatId: '123' } } }, title: 'Title', contentText: 'Source: Codex' };
  for (const detail of [
    { summaryText: '摘要 <done> & checked', outputContent: 'hidden original' },
    { outputContent: '完整回答 <code> & text' },
    { taskInfo: '手动测试正文' },
    { title: '题'.repeat(500), outputContent: '😀<&>'.repeat(3000) }
  ]) assert.equal((await notifyTelegram({ ...base, ...detail })).ok, true);
  assert.match(payloads[0].text, /AI 摘要\n摘要 &lt;done&gt; &amp; checked/);
  assert.doesNotMatch(payloads[0].text, /hidden original/);
  assert.match(payloads[1].text, /AI 原文\n完整回答 &lt;code&gt; &amp; text/);
  assert.match(payloads[2].text, /任务\n手动测试正文/);
  const decoded = payloads[3].text.replace(/<\/?b>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.ok(decoded.length <= 4096);
  assert.doesNotMatch(decoded, /[\uD800-\uDFFF]/u);
  assert.match(decoded, /内容已截断/);
});

test('engine passes Telegram output and summary without changing other channel content', async (t) => {
  const config = structuredClone(require('../src/default-config').DEFAULT_CONFIG);
  for (const key of Object.keys(config.channels)) config.channels[key].enabled = ['telegram', 'webhook', 'email'].includes(key);
  config.sources.codex.enabled = true;
  config.sources.codex.channels = { telegram: true, webhook: true, email: true };
  const calls = {};
  let summary = '';
  const mocks = {
    '../src/config': { loadConfig: () => config },
    '../src/summary': { summarizeTaskDetailed: async () => ({ ok: Boolean(summary), summary }) },
    '../src/notifiers/telegram': { notifyTelegram: async args => { calls.telegram = args; return { ok: true }; } },
    '../src/notifiers/webhook': { notifyWebhook: async args => { calls.webhook = args; return { ok: true }; } },
    '../src/notifiers/email': { notifyEmail: async args => { calls.email = args; return { ok: true }; } }
  };
  const saved = new Map();
  for (const name of ['../src/engine', ...Object.keys(mocks)]) {
    const id = require.resolve(name);
    saved.set(id, require.cache[id]);
    delete require.cache[id];
    if (mocks[name]) require.cache[id] = { id, filename: id, loaded: true, exports: mocks[name] };
  }
  t.after(() => { for (const [id, entry] of saved) { if (entry) require.cache[id] = entry; else delete require.cache[id]; } });
  const { sendNotifications } = require('../src/engine');
  for (summary of ['', 'Summary result']) {
    await sendNotifications({ source: 'codex', taskInfo: 'Task', summaryContext: { assistantMessage: 'Actual answer' }, force: true, skipDedupe: true });
    assert.equal(calls.telegram.outputContent, 'Actual answer');
    assert.equal(calls.telegram.summaryText, summary);
    assert.equal(calls.telegram.taskInfo, 'Task');
    assert.equal(calls.webhook.outputContent, 'Actual answer');
    assert.equal(calls.webhook.taskInfo, summary || 'Task');
    assert.equal(calls.webhook.summaryUsed, Boolean(summary));
    assert.equal(calls.email.contentText, calls.webhook.contentText);
    assert.doesNotMatch(calls.email.contentText, /Actual answer|Summary result/);
    assert.deepEqual(Object.keys(calls.email).sort(), ['config', 'contentText', 'title']);
  }
});

test('Telegram renders Markdown without interpreting code or raw HTML as formatting', async (t) => {
  const payloads = [];
  mockTelegramResponse(t, { statusCode: 200, body: { ok: true } }, (_options, payload) => payloads.push(JSON.parse(payload)));
  const { notifyTelegram } = require('../src/notifiers/telegram');
  const config = { channels: { telegram: { botToken: '123:fixture', chatId: '123' } } };
  const outputContent = [
    '# 更新情况', '- **中文、英文**：已补齐', '__重点__ 与 *斜体*、_强调_、~~删除~~',
    '[官方文档](https://example.com/?a=1&b=2)', '`a < b && **literal**`',
    '```js', 'const x = "<b>**literal**</b>";', '```',
    '<script>alert(1)</script>', '[local](/private/file)', 'snake_case_value'
  ].join('\n');
  assert.equal((await notifyTelegram({ config, title: 'Test', contentText: 'Source: Codex', outputContent })).ok, true);
  const html = payloads[0].text;
  assert.match(html, /<b>更新情况<\/b>/);
  assert.match(html, /- <b>中文、英文<\/b>：已补齐/);
  assert.match(html, /<b>重点<\/b> 与 <i>斜体<\/i>、<i>强调<\/i>、<s>删除<\/s>/);
  assert.match(html, /<a href="https:\/\/example.com\/\?a=1&amp;b=2">官方文档<\/a>/);
  assert.match(html, /<code>a &lt; b &amp;&amp; \*\*literal\*\*<\/code>/);
  assert.match(html, /<pre>const x = "&lt;b&gt;\*\*literal\*\*&lt;\/b&gt;";\n<\/pre>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /\[local\]\(\/private\/file\)/);
  assert.match(html, /snake_case_value/);
  await notifyTelegram({ config, title: 'Test', contentText: '', outputContent: '```js\n' + '<&😀'.repeat(2000) });
  const longHtml = payloads[1].text;
  assert.match(longHtml, /<pre>[\s\S]*内容已截断\]<\/pre>$/);
  const visible = longHtml.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.ok(visible.length <= 4096);
  assert.doesNotMatch(visible, /[\uD800-\uDFFF]/u);
});

test('Telegram retries as plain text only after a formatting rejection', async (t) => {
  const payloads = [];
  const body = { ok: false, error_code: 400, description: "Bad Request: can't parse entities" };
  mockTelegramResponse(t, { statusCode: 200, body }, (_options, payload) => {
    payloads.push(JSON.parse(payload));
    if (payloads.length === 2) body.ok = true;
  });
  const { notifyTelegram } = require('../src/notifiers/telegram');
  const result = await notifyTelegram({
    config: { channels: { telegram: { botToken: '123:fixture', chatId: '123' } } },
    title: 'Test', contentText: 'Source: Codex', outputContent: '**正文**'
  });
  assert.equal(result.ok, true);
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0].parse_mode, 'HTML');
  assert.equal(payloads[1].parse_mode, undefined);
  assert.match(payloads[1].text, /\*\*正文\*\*/);
});
