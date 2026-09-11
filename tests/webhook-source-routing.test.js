const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const test = require('node:test');

const SOURCE_ENV_NAMES = [
  'CLAUDE_WEBHOOK_URLS',
  'CODEX_WEBHOOK_URLS',
  'GEMINI_WEBHOOK_URLS',
  'OPENCODE_WEBHOOK_URLS',
  'ZCODE_WEBHOOK_URLS',
  'WEBHOOK_URLS',
];

function mockHttpsRequests(t) {
  const originalRequest = https.request;
  const hosts = [];

  t.after(() => {
    https.request = originalRequest;
  });

  https.request = (options, callback) => {
    hosts.push(options.hostname);
    const req = new EventEmitter();
    req.write = () => {};
    req.end = () => {
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };

  return hosts;
}

function resetWebhookEnv(t) {
  const previous = Object.fromEntries(SOURCE_ENV_NAMES.map((name) => [name, process.env[name]]));
  for (const name of SOURCE_ENV_NAMES) delete process.env[name];
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
}

function buildConfig(globalUrls, sourceUrls = {}) {
  return {
    channels: {
      webhook: {
        urls: globalUrls,
        useFeishuCard: false,
      },
    },
    sources: Object.fromEntries(
      Object.entries(sourceUrls).map(([source, webhookUrls]) => [source, { webhookUrls }]),
    ),
  };
}

async function sendForSource(config, sourceName) {
  delete require.cache[require.resolve('../src/notifiers/webhook')];
  const { notifyWebhook } = require('../src/notifiers/webhook');
  return await notifyWebhook({
    config,
    sourceName,
    sourceLabel: sourceName || 'Webhook',
    title: 'Source routing test',
    contentText: 'Completed',
    projectName: 'test',
    timestamp: '2026/8/2 10:00:00',
    taskInfo: 'Source routing test',
    summaryUsed: false,
  });
}

test('source environment URLs override source config and global URLs without duplicate delivery', async (t) => {
  resetWebhookEnv(t);
  const hosts = mockHttpsRequests(t);
  process.env.CLAUDE_WEBHOOK_URLS = 'https://claude-one.test/hook, https://claude-two.test/hook';
  process.env.WEBHOOK_URLS = 'https://global-env.test/hook';

  const result = await sendForSource(
    buildConfig(['https://global-config.test/hook'], {
      claude: ['https://claude-config.test/hook'],
    }),
    'claude',
  );

  assert.equal(result.ok, true);
  assert.deepEqual(hosts, ['claude-one.test', 'claude-two.test']);
});

test('Claude and Codex route to different source environment URLs', async (t) => {
  resetWebhookEnv(t);
  const hosts = mockHttpsRequests(t);
  process.env.CLAUDE_WEBHOOK_URLS = 'https://claude-only.test/hook';
  process.env.CODEX_WEBHOOK_URLS = 'https://codex-only.test/hook';
  process.env.WEBHOOK_URLS = 'https://global-env.test/hook';
  const config = buildConfig(['https://global-config.test/hook']);

  const claudeResult = await sendForSource(config, 'claude');
  const codexResult = await sendForSource(config, 'codex');

  assert.equal(claudeResult.ok, true);
  assert.equal(codexResult.ok, true);
  assert.deepEqual(hosts, ['claude-only.test', 'codex-only.test']);
});

test('source settings URLs override the global environment URL', async (t) => {
  resetWebhookEnv(t);
  const hosts = mockHttpsRequests(t);
  process.env.WEBHOOK_URLS = 'https://global-env.test/hook';

  const result = await sendForSource(
    buildConfig(['https://global-config.test/hook'], {
      codex: ['https://codex-config.test/hook'],
    }),
    'codex',
  );

  assert.equal(result.ok, true);
  assert.deepEqual(hosts, ['codex-config.test']);
});

test('missing source URLs fall back to the existing global environment URL', async (t) => {
  resetWebhookEnv(t);
  const hosts = mockHttpsRequests(t);
  process.env.WEBHOOK_URLS = 'https://global-env.test/hook';

  const result = await sendForSource(buildConfig(['https://global-config.test/hook']), 'gemini');

  assert.equal(result.ok, true);
  assert.deepEqual(hosts, ['global-env.test']);
});

test('legacy calls without a source keep using global config URLs', async (t) => {
  resetWebhookEnv(t);
  const hosts = mockHttpsRequests(t);

  const result = await sendForSource(buildConfig(['https://global-config.test/hook']), undefined);

  assert.equal(result.ok, true);
  assert.deepEqual(hosts, ['global-config.test']);
});

test('config normalization preserves source URLs and fills defaults for older settings', () => {
  const { normalizeConfig } = require('../src/config');
  const config = normalizeConfig({
    version: 2,
    sources: {
      claude: {
        webhookUrls: ['https://claude-config.test/hook'],
      },
    },
  });

  assert.deepEqual(config.sources.claude.webhookUrls, ['https://claude-config.test/hook']);
  assert.deepEqual(config.sources.codex.webhookUrls, []);
  assert.deepEqual(config.sources.gemini.webhookUrls, []);
  assert.deepEqual(config.sources.opencode.webhookUrls, []);
});
