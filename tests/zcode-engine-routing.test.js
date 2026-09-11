const assert = require('node:assert/strict');
const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const cliPath = path.join(projectRoot, 'ai-reminder.js');
const { DEFAULT_CONFIG } = require('../src/default-config');
const { shouldSkipByNotificationMode } = require('../src/engine');
const { getZcodeHookNotificationContext } = require('../src/hook-context');

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function mockZcodeConfig(overrides = {}) {
  const config = cloneDefaults();
  const channels = {};
  for (const name of Object.keys(config.channels)) {
    config.channels[name].enabled = name === 'webhook';
    channels[name] = name === 'webhook';
  }
  config.channels.webhook.urls = ['https://example.test/webhook'];
  config.sources.zcode = {
    enabled: true,
    minDurationMinutes: 0,
    webhookUrls: [],
    channels,
    ...overrides,
  };
  return config;
}

function withMockedEngine(t, { config, checkDedupe } = {}) {
  const enginePath = require.resolve('../src/engine');
  const configPath = require.resolve('../src/config');
  const webhookPath = require.resolve('../src/notifiers/webhook');
  const statePath = require.resolve('../src/state');
  const originals = { engine: require.cache[enginePath], config: require.cache[configPath], webhook: require.cache[webhookPath], state: require.cache[statePath] };
  const calls = [];
  const remembered = [];

  delete require.cache[enginePath];
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: { loadConfig: () => config },
  };
  require.cache[webhookPath] = {
    id: webhookPath,
    filename: webhookPath,
    loaded: true,
    exports: {
      notifyWebhook: async (args) => {
        calls.push(args);
        return { ok: true, results: [{ ok: true }] };
      },
    },
  };
  require.cache[statePath] = {
    id: statePath,
    filename: statePath,
    loaded: true,
    exports: {
      checkAndRememberNotification: ({ source, cwd, text }) => {
        const key = `${source}::${cwd}::${String(text || '').trim().toLowerCase()}`;
        if (remembered.includes(key)) return true;
        remembered.push(key);
        return false;
      },
    },
  };

  t.after(() => {
    for (const [name, cached] of Object.entries(originals)) {
      const modulePath = { engine: enginePath, config: configPath, webhook: webhookPath, state: statePath }[name];
      if (cached) require.cache[modulePath] = cached;
      else delete require.cache[modulePath];
    }
  });

  return { calls, remembered, engine: require('../src/engine') };
}

test('watch-only notification mode does not suppress zcode hook alerts', () => {
  assert.equal(
    shouldSkipByNotificationMode({ sourceName: 'zcode', fromHook: true, notificationMode: 'watch' }),
    null,
    'zcode has no watch path; watch-only mode must not silence its only completion path',
  );
  assert.equal(
    shouldSkipByNotificationMode({ sourceName: 'zcode', fromHook: true, notificationMode: 'hooks' }),
    null,
  );
});

test('default config ships zcode disabled and the engine sends nothing for it', async (t) => {
  const { calls, engine } = withMockedEngine(t, { config: cloneDefaults() });

  const result = await engine.sendNotifications({
    source: 'zcode',
    taskInfo: 'ZCode 完成',
    durationMs: 1000,
    cwd: '/repo/demo',
    force: true,
    fromHook: true,
    skipSummary: true,
    outputContent: 'done',
  });

  assert.equal(result.skipped, true);
  assert.match(String(result.reason), /source zcode disabled/);
  assert.equal(calls.length, 0);
});

test('an enabled zcode source with a met threshold sends through its channels', async (t) => {
  const { calls, engine } = withMockedEngine(t, { config: mockZcodeConfig() });

  const result = await engine.sendNotifications({
    source: 'zcode',
    taskInfo: 'ZCode 完成',
    durationMs: 60000,
    cwd: '/repo/demo',
    force: true,
    fromHook: true,
    skipSummary: true,
    outputContent: 'done',
  });

  assert.equal(result.skipped, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sourceName, 'zcode');
  assert.equal(calls[0].sourceLabel, 'ZCode');
});

test('zcode duration threshold blocks quick turns unless forced', async (t) => {
  const { calls, engine } = withMockedEngine(t, { config: mockZcodeConfig({ minDurationMinutes: 5 }) });

  const below = await engine.sendNotifications({
    source: 'zcode',
    taskInfo: 'quick answer',
    durationMs: 1000,
    cwd: '/repo/demo',
    fromHook: true,
    skipSummary: true,
    outputContent: 'quick',
  });
  assert.equal(below.skipped, true);
  assert.match(String(below.reason), /below threshold/);

  // The registered hook always passes --force, so real hook alerts bypass the gate.
  const forced = await engine.sendNotifications({
    source: 'zcode',
    taskInfo: 'quick answer',
    durationMs: 1000,
    cwd: '/repo/demo',
    force: true,
    fromHook: true,
    skipSummary: true,
    outputContent: 'quick',
  });
  assert.equal(forced.skipped, false);
  assert.equal(calls.length, 1);
});

test('two identical zcode completions inside the dedupe window collapse to one alert', async (t) => {
  const { calls, remembered, engine } = withMockedEngine(t, { config: mockZcodeConfig() });

  for (let i = 0; i < 2; i += 1) {
    const result = await engine.sendNotifications({
      source: 'zcode',
      taskInfo: 'ZCode 完成',
      durationMs: 60000,
      cwd: '/repo/demo',
      force: true,
      fromHook: true,
      skipSummary: true,
      outputContent: 'same response',
    });
    if (i === 0) assert.equal(result.skipped, false);
    else {
      assert.equal(result.skipped, true);
      assert.match(String(result.reason), /duplicate notification suppressed/);
    }
  }

  assert.equal(calls.length, 1);
  assert.equal(remembered.length, 1);
});

test('ZCODE_WEBHOOK_URLS routes zcode webhook delivery', async (t) => {
  const envNames = ['ZCODE_WEBHOOK_URLS', 'WEBHOOK_URLS'];
  const previous = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  const originalRequest = https.request;
  const hosts = [];
  t.after(() => {
    https.request = originalRequest;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  process.env.ZCODE_WEBHOOK_URLS = 'https://zcode-env.test/hook';
  process.env.WEBHOOK_URLS = 'https://global-env.test/hook';
  https.request = (options, callback) => {
    hosts.push(options.hostname);
    const req = new (require('node:events').EventEmitter)();
    req.write = () => {};
    req.end = () => {
      const res = new (require('node:events').EventEmitter)();
      res.statusCode = 200;
      callback(res);
      res.emit('end');
    };
    req.setTimeout = () => {};
    req.destroy = () => {};
    return req;
  };

  const webhookModulePath = require.resolve('../src/notifiers/webhook');
  const originalWebhookModule = require.cache[webhookModulePath];
  t.after(() => {
    if (originalWebhookModule) require.cache[webhookModulePath] = originalWebhookModule;
    else delete require.cache[webhookModulePath];
  });
  delete require.cache[webhookModulePath];
  const { notifyWebhook } = require('../src/notifiers/webhook');
  const result = await notifyWebhook({
    config: {
      channels: { webhook: { enabled: true, urls: ['https://global-config.test/hook'] } },
      sources: { zcode: { enabled: true, webhookUrls: [], channels: { webhook: true } } },
    },
    sourceName: 'zcode',
    sourceLabel: 'ZCode',
    title: 'ZCode routing test',
    contentText: 'Completed',
    projectName: 'demo',
    timestamp: '2026/9/11 10:00:00',
    taskInfo: 'ZCode routing test',
    summaryUsed: false,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(hosts, ['zcode-env.test']);
});

function createCliSandbox(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-notify-zcode-engine-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  const config = cloneDefaults();
  for (const channel of Object.values(config.channels)) channel.enabled = false;
  config.sources.zcode.enabled = true;
  fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify(config), 'utf8');
  fs.writeFileSync(path.join(dataDir, '.env'), '', 'utf8');

  return {
    dataDir,
    env: {
      ...process.env,
      AI_CLI_COMPLETE_NOTIFY_DATA_DIR: dataDir,
      AI_CLI_COMPLETE_NOTIFY_ENV_PATH: path.join(dataDir, '.env'),
    },
  };
}

test('hook-invoked zcode notifications write nothing to stdout and dedupe across runs', (t) => {
  const sb = createCliSandbox(t);
  const payload = JSON.stringify({
    hook_event_name: 'Stop',
    session_id: 'cli-sess-1',
    cwd: projectRoot,
    response: 'cli dedupe probe',
  });

  const first = spawnSync(process.execPath, [cliPath, 'notify', '--source', 'zcode', '--from-hook', '--force'], {
    cwd: projectRoot,
    env: sb.env,
    input: payload,
    encoding: 'utf8',
  });
  assert.equal(first.status, 0, first.stderr || first.stdout);
  assert.equal(first.stdout, '', 'ZCode validates hook stdout as strict JSON; nothing may be printed');

  const second = spawnSync(process.execPath, [cliPath, 'notify', '--source', 'zcode', '--from-hook', '--force'], {
    cwd: projectRoot,
    env: sb.env,
    input: payload,
    encoding: 'utf8',
  });
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.equal(second.stdout, '');
  assert.match(second.stderr, /duplicate notification suppressed/);
});

test('zcode is absent from the watch all-source set', () => {
  const watchSource = fs.readFileSync(path.join(projectRoot, 'src', 'watch.js'), 'utf8');
  assert.match(watchSource, /includes\('all'\)\) return \['claude', 'codex', 'gemini'\]/);
});
