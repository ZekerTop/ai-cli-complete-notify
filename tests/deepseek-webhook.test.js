const test = require('node:test');
const assert = require('node:assert/strict');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { notifyWebhook } = require('../src/notifiers/webhook');

test('DeepSeek webhook overrides remain source-scoped and fall back to global URLs', async (t) => {
  const keys = ['DEEPSEEK_WEBHOOK_URLS', 'WEBHOOK_URLS', 'CODEX_WEBHOOK_URLS', 'WEBHOOK_FORMAT'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const original = https.request;
  const hosts = [];
  t.after(() => {
    https.request = original;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  https.request = (options, callback) => {
    hosts.push(options.hostname);
    const req = new EventEmitter();
    req.write = () => {};
    req.setTimeout = () => {};
    req.destroy = () => {};
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('end');
    };
    return req;
  };
  process.env.WEBHOOK_URLS = 'https://global.test/hook';
  process.env.DEEPSEEK_WEBHOOK_URLS = 'https://deepseek.test/hook';
  delete process.env.CODEX_WEBHOOK_URLS;
  process.env.WEBHOOK_FORMAT = 'json';
  const config = {
    channels: { webhook: { enabled: true, urls: [] } },
    sources: { deepseek: { webhookUrls: [] }, codex: { webhookUrls: [] } },
  };
  const send = (sourceName) => notifyWebhook({ config, sourceName, sourceLabel: sourceName, taskInfo: 'done', contentText: 'done' });
  assert.equal((await send('deepseek')).ok, true);
  assert.equal((await send('codex')).ok, true);
  delete process.env.DEEPSEEK_WEBHOOK_URLS;
  config.sources.deepseek.webhookUrls = ['https://deepseek-config.test/hook'];
  assert.equal((await send('deepseek')).ok, true);
  config.sources.deepseek.webhookUrls = [];
  assert.equal((await send('deepseek')).ok, true);
  assert.deepEqual(hosts, ['deepseek.test', 'global.test', 'deepseek-config.test', 'global.test']);
});
