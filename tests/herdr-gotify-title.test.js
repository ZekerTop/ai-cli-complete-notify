const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');

// config.js resolves its settings path at module load time from the
// environment, so tests that switch data dirs must drop every src/ module
// from the require cache before re-requiring the engine.
function clearSrcCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes(`${path.sep}src${path.sep}`) || key.includes(`${path.sep}src${path.sep}notifiers${path.sep}`)) {
      delete require.cache[key];
    }
  }
}

function createDataDir() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-notify-herdr-gotify-'));
  fs.writeFileSync(path.join(dataDir, '.env'), '', 'utf8');
  fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify({
    version: 2,
    ui: { language: 'zh-CN', notificationMode: 'hooks' },
    channels: {
      webhook: { enabled: false },
      telegram: { enabled: false },
      sound: { enabled: false },
      desktop: { enabled: false },
      email: { enabled: false },
      gotify: { enabled: true, url: 'http://localhost:8081', appToken: 'test-token' },
    },
    sources: {
      herdr: {
        enabled: true,
        minDurationMinutes: 0,
        webhookUrls: [],
        channels: {
          webhook: false,
          telegram: false,
          sound: false,
          desktop: false,
          email: false,
          gotify: true,
        },
      },
    },
  }), 'utf8');
  return dataDir;
}

test('engine sends herdr notification to Gotify with [Herdr] title prefix', async (t) => {
  const dataDir = createDataDir();
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  const originalHttpRequest = http.request;
  let capturedPayload = null;
  t.after(() => {
    http.request = originalHttpRequest;
  });

  http.request = (options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      capturedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from('{}'));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };

  process.env.AI_CLI_COMPLETE_NOTIFY_DATA_DIR = dataDir;
  process.env.AI_CLI_COMPLETE_NOTIFY_ENV_PATH = path.join(dataDir, '.env');
  clearSrcCache();

  const { sendNotifications } = require('../src/engine');
  const result = await sendNotifications({
    source: 'herdr',
    taskInfo: '✅ claude done · demo: implemented feature',
    cwd: '/tmp/demo-project',
    force: true,
    fromHook: true,
    outputContent: 'Implemented the feature.',
    skipSummary: true,
  });

  assert.equal(result.skipped, false, result.reason);
  assert.ok(capturedPayload, 'gotify should have received a payload');
  assert.match(capturedPayload.title, /^\[Herdr\] /);
  assert.match(capturedPayload.message, /✅ claude done · demo: implemented feature/);
});

test('engine still labels opencode notifications [OpenCode] (no regression)', async (t) => {
  const dataDir = createDataDir();
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  // give opencode its own enabled source with gotify channel
  const settings = JSON.parse(fs.readFileSync(path.join(dataDir, 'settings.json'), 'utf8'));
  settings.sources.opencode = {
    enabled: true,
    minDurationMinutes: 0,
    webhookUrls: [],
    channels: {
      webhook: false,
      telegram: false,
      sound: false,
      desktop: false,
      email: false,
      gotify: true,
    },
  };
  fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify(settings), 'utf8');

  const originalHttpRequest = http.request;
  let capturedPayload = null;
  t.after(() => {
    http.request = originalHttpRequest;
  });

  http.request = (options, callback) => {
    let body = '';
    const req = new EventEmitter();
    req.write = (chunk) => {
      body += chunk.toString();
    };
    req.end = () => {
      capturedPayload = JSON.parse(body);
      const res = new EventEmitter();
      res.statusCode = 200;
      callback(res);
      res.emit('data', Buffer.from('{}'));
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };

  process.env.AI_CLI_COMPLETE_NOTIFY_DATA_DIR = dataDir;
  process.env.AI_CLI_COMPLETE_NOTIFY_ENV_PATH = path.join(dataDir, '.env');
  clearSrcCache();

  const { sendNotifications } = require('../src/engine');
  const result = await sendNotifications({
    source: 'opencode',
    taskInfo: 'opencode task done',
    cwd: '/tmp/opencode-project',
    force: true,
    fromHook: true,
    outputContent: 'done',
    skipSummary: true,
  });

  assert.equal(result.skipped, false, result.reason);
  assert.ok(capturedPayload, 'gotify should have received a payload');
  assert.match(capturedPayload.title, /^\[OpenCode\] /);
});
