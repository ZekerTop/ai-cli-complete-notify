const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const { normalizeConfig } = require('../src/config');
const {
  getClaudeHookNotificationContext,
  getClaudeSessionOrigin,
} = require('../src/hook-context');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(predicate, { timeoutMs = 4000, intervalMs = 40 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await sleep(intervalMs);
  }
  assert.ok(predicate(), 'condition was not reached before timeout');
}

function writeJsonl(filePath, entries) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`, 'utf8');
  const now = Date.now() / 1000;
  fs.utimesSync(filePath, now, now);
}

function appendJsonl(filePath, entries) {
  fs.appendFileSync(filePath, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`, 'utf8');
  const now = Date.now() / 1000;
  fs.utimesSync(filePath, now, now);
}

test('Claude SDK-derived Stop hooks are skipped while interactive hooks keep existing behavior', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-notify-claude-origin-'));
  const previousDelay = process.env.CLAUDE_HOOK_NOTIFY_DELAY_MS;
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  t.after(() => {
    if (previousDelay === undefined) delete process.env.CLAUDE_HOOK_NOTIFY_DELAY_MS;
    else process.env.CLAUDE_HOOK_NOTIFY_DELAY_MS = previousDelay;
  });
  delete process.env.CLAUDE_HOOK_NOTIFY_DELAY_MS;

  const sdkTranscript = path.join(tempDir, 'sdk.jsonl');
  writeJsonl(sdkTranscript, [
    { type: 'system', entrypoint: 'sdk-cli', promptSource: 'sdk', isSidechain: false },
    {
      type: 'assistant',
      isSidechain: false,
      message: { content: [{ type: 'text', text: 'SDK child completed' }] },
    },
  ]);

  assert.equal(getClaudeSessionOrigin({ transcript_path: sdkTranscript }), 'sdk');
  assert.deepEqual(
    getClaudeHookNotificationContext({
      hook_event_name: 'Stop',
      transcript_path: sdkTranscript,
    }, '任务已完成', { onlyInteractive: true }),
    {
      skip: true,
      reason: 'Claude SDK-derived session skipped by onlyInteractive',
    },
  );

  const allowedSdk = getClaudeHookNotificationContext({
    hook_event_name: 'Stop',
    transcript_path: sdkTranscript,
  }, '任务已完成', { onlyInteractive: false });
  assert.equal(allowedSdk.taskInfo, 'Claude 完成');
  assert.equal(allowedSdk.outputContent, 'SDK child completed');

  const interactive = getClaudeHookNotificationContext({
    hook_event_name: 'Stop',
    entrypoint: 'cli',
    promptSource: 'typed',
    last_assistant_message: { content: [{ type: 'text', text: 'Interactive task completed' }] },
  }, '任务已完成', { onlyInteractive: true });
  assert.equal(interactive.taskInfo, 'Claude 完成');
  assert.equal(interactive.outputContent, 'Interactive task completed');
  assert.equal(interactive.delayMs, 1200);

  const transcriptFallback = getClaudeHookNotificationContext({
    hook_event_name: 'Stop',
    transcript_path: sdkTranscript,
  }, '任务已完成', { onlyInteractive: false });
  assert.equal(transcriptFallback.outputContent, 'SDK child completed');
  assert.equal(transcriptFallback.delayMs, 1200);

  const failed = getClaudeHookNotificationContext({
    hook_event_name: 'Stop',
    entrypoint: 'cli',
    promptSource: 'typed',
    last_assistant_message: 'API Error: 500 {"error":{"message":"overloaded"}}',
  }, '任务已完成', { onlyInteractive: true });
  assert.equal(failed.notifyKind, 'error');
  assert.equal(failed.taskInfo, 'Claude 失败: API Error 500: overloaded');
  assert.equal(failed.skipSummary, true);
  assert.equal(failed.delayMs, 0);

  const unknown = getClaudeHookNotificationContext({
    hook_event_name: 'Stop',
    transcript_path: path.join(tempDir, 'missing.jsonl'),
    last_assistant_message: { content: [{ type: 'text', text: 'Unknown origin completed' }] },
  }, '任务已完成', { onlyInteractive: true });
  assert.equal(unknown.taskInfo, 'Claude 完成');
  assert.equal(unknown.outputContent, 'Unknown origin completed');
  assert.equal(unknown.delayMs, 1200);
});

test('Claude onlyInteractive defaults on and explicit false is preserved', () => {
  const defaulted = normalizeConfig({ version: 2 });
  assert.equal(defaulted.sources.claude.onlyInteractive, true);

  const disabled = normalizeConfig({
    version: 2,
    sources: { claude: { onlyInteractive: false } },
  });
  assert.equal(disabled.sources.claude.onlyInteractive, false);
});

test('Claude Hook CLI reads onlyInteractive from settings', (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-notify-claude-cli-'));
  t.after(() => fs.rmSync(tempHome, { recursive: true, force: true }));
  const settingsDir = path.join(tempHome, '.ai-cli-complete-notify');
  fs.mkdirSync(settingsDir, { recursive: true });
  const settingsPath = path.join(settingsDir, 'settings.json');
  const cliPath = path.join(__dirname, '..', 'ai-reminder.js');
  const payload = JSON.stringify({
    hook_event_name: 'Stop',
    entrypoint: 'sdk-cli',
    promptSource: 'sdk',
    cwd: tempHome,
    last_assistant_message: { content: [{ type: 'text', text: 'SDK CLI completed' }] },
  });
  const baseConfig = {
    version: 2,
    channels: {
      webhook: { enabled: false },
      telegram: { enabled: false },
      desktop: { enabled: false },
      sound: { enabled: false },
      email: { enabled: false },
      gotify: { enabled: false },
    },
    sources: { claude: { onlyInteractive: true } },
  };

  function run(onlyInteractive) {
    fs.writeFileSync(settingsPath, JSON.stringify({
      ...baseConfig,
      sources: { claude: { onlyInteractive } },
    }), 'utf8');
    return spawnSync(process.execPath, [
      cliPath,
      'notify',
      '--source', 'claude',
      '--from-hook',
      '--force',
    ], {
      cwd: tempHome,
      env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
      input: payload,
      encoding: 'utf8',
    });
  }

  const filtered = run(true);
  assert.equal(filtered.status, 0, filtered.stderr || filtered.stdout);
  assert.match(filtered.stdout, /SDK-derived session skipped by onlyInteractive/);

  const allowed = run(false);
  assert.equal(allowed.status, 0, allowed.stderr || allowed.stdout);
  assert.doesNotMatch(allowed.stdout, /SDK-derived session skipped by onlyInteractive/);
  assert.match(allowed.stdout, /No notification channels enabled/);
});

test('Claude Watch filters SDK sessions, supports opt-out, and still notifies for interactive sessions', async (t) => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-notify-claude-watch-'));
  const previousEnv = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
  };
  const notifications = [];
  const logs = [];
  let onlyInteractive = true;
  const enginePath = require.resolve('../src/engine');
  const watchPath = require.resolve('../src/watch');
  const originalEngineCache = require.cache[enginePath];
  const originalWatchCache = require.cache[watchPath];

  t.after(() => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (originalEngineCache) require.cache[enginePath] = originalEngineCache;
    else delete require.cache[enginePath];
    if (originalWatchCache) require.cache[watchPath] = originalWatchCache;
    else delete require.cache[watchPath];
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  process.env.HOME = tempHome;
  process.env.USERPROFILE = tempHome;
  require.cache[enginePath] = {
    id: enginePath,
    filename: enginePath,
    loaded: true,
    exports: {
      sendNotifications: async (args) => {
        notifications.push(args);
        return { results: [{ ok: true }] };
      },
    },
  };
  delete require.cache[watchPath];
  const { startWatch } = require('../src/watch');

  const projectDir = path.join(tempHome, '.claude', 'projects', 'project');
  const sdkFile = path.join(projectDir, 'sdk.jsonl');
  const now = Date.now();
  writeJsonl(sdkFile, [
    { type: 'system', entrypoint: 'sdk-cli', promptSource: 'sdk', timestamp: new Date(now - 2000).toISOString() },
    { type: 'user', message: { content: 'SDK task' }, timestamp: new Date(now - 1000).toISOString(), cwd: tempHome },
  ]);

  const stop = startWatch({
    sources: 'claude',
    intervalMs: 60,
    claudeQuietMs: 500,
    claudeOnlyInteractive: () => onlyInteractive,
    log: (line) => logs.push(line),
    confirmAlert: { enabled: false },
  });
  t.after(() => stop());

  await sleep(250);
  appendJsonl(sdkFile, [{
    type: 'assistant',
    message: { content: [{ type: 'text', text: 'SDK child completed' }] },
    timestamp: new Date().toISOString(),
    cwd: tempHome,
  }]);
  await sleep(900);
  assert.equal(notifications.length, 0);
  assert.ok(logs.some((line) => line.includes('SDK-derived session ignored')));

  onlyInteractive = false;
  appendJsonl(sdkFile, [
    { type: 'user', message: { content: 'Headless task requested by user' }, timestamp: new Date().toISOString(), cwd: tempHome },
    {
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Headless task completed' }] },
      timestamp: new Date(Date.now() + 10).toISOString(),
      cwd: tempHome,
    },
  ]);
  await waitFor(() => notifications.length === 1);
  assert.equal(notifications[0].outputContent, 'Headless task completed');

  onlyInteractive = true;
  const interactiveFile = path.join(projectDir, 'interactive.jsonl');
  writeJsonl(interactiveFile, [
    { type: 'system', entrypoint: 'cli', promptSource: 'typed', timestamp: new Date().toISOString() },
    { type: 'user', message: { content: 'Interactive task' }, timestamp: new Date(Date.now() + 10).toISOString(), cwd: tempHome },
  ]);
  await sleep(700);
  appendJsonl(interactiveFile, [{
    type: 'assistant',
    message: { content: [{ type: 'text', text: 'Interactive task completed' }] },
    timestamp: new Date().toISOString(),
    cwd: tempHome,
  }]);
  await waitFor(() => notifications.length === 2);
  assert.equal(notifications[1].outputContent, 'Interactive task completed');
});

test('Claude source UI exposes the onlyInteractive switch and localized copy', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src-ui', 'components', 'SourcesPanel.tsx'), 'utf8');
  const zh = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src-ui', 'i18n', 'zh-CN.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src-ui', 'i18n', 'en.json'), 'utf8'));

  assert.match(source, /sources\.claude\.onlyInteractive/);
  assert.match(source, /onlyInteractive:\s*c\.sources\.claude\.onlyInteractive === false/);
  assert.equal(typeof zh['sources.claude.onlyInteractive.desc'], 'string');
  assert.equal(typeof en['sources.claude.onlyInteractive.desc'], 'string');
});
