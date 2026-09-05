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
