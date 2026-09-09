const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');
const cliPath = path.join(projectRoot, 'ai-reminder.js');
const {
  getHerdrHookNotificationContext,
  getOpenCodeHookNotificationContext,
} = require('../src/hook-context');
const { getSourceLabel, buildTitle } = require('../src/format');

function createIsolatedDataDir(channelOverrides = {}, sourceOverrides = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-notify-herdr-source-'));
  fs.writeFileSync(path.join(dataDir, '.env'), '', 'utf8');
  fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify({
    version: 2,
    channels: {
      webhook: { enabled: false },
      telegram: { enabled: false },
      sound: { enabled: false },
      desktop: { enabled: false },
      email: { enabled: false },
      gotify: { enabled: false },
      ...channelOverrides,
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
          gotify: false,
          ...sourceOverrides,
        },
      },
    },
  }), 'utf8');
  return dataDir;
}

function invokeCli(dataDir, args, input, extraEnv = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      AI_CLI_COMPLETE_NOTIFY_DATA_DIR: dataDir,
      AI_CLI_COMPLETE_NOTIFY_ENV_PATH: path.join(dataDir, '.env'),
      ...extraEnv,
    },
    input: input ? JSON.stringify(input) : undefined,
    encoding: 'utf8',
  });
}

test('herdr hook context maps done (session.idle) to a completion notification', () => {
  const context = getHerdrHookNotificationContext({
    hook_source: 'herdr-plugin',
    hook_event_name: 'session.idle',
    cwd: '/tmp/project',
    task_info: '✅ claude done · my-project: fix bug',
    output_content: 'Fixed the bug.',
    assistant_message: 'Fixed the bug.',
  }, '✅ claude done · my-project: fix bug');

  assert.deepEqual(context, {
    taskInfo: '✅ claude done · my-project: fix bug',
    outputContent: 'Fixed the bug.',
    summaryContext: { assistantMessage: 'Fixed the bug.' },
    skipSummary: false,
    delayMs: 0,
  });
});

test('herdr hook context maps blocked (session.error) to an error notification', () => {
  const context = getHerdrHookNotificationContext({
    hook_source: 'herdr-plugin',
    hook_event_name: 'session.error',
    cwd: '/tmp/project',
    task_info: '⚠️ claude blocked · needs input',
    error_message: '⚠️ claude blocked · needs input',
  }, '⚠️ claude blocked · needs input');

  assert.equal(context.notifyKind, 'error');
  assert.equal(context.taskInfo, '⚠️ claude blocked · needs input');
  assert.equal(context.skipSummary, true);
});

test('herdr context is rejected when hook_source is not herdr-plugin', () => {
  const context = getHerdrHookNotificationContext({
    hook_source: 'opencode-plugin',
    hook_event_name: 'session.idle',
    task_info: 'task',
  }, 'task');
  assert.equal(context, null);
});

test('opencode context is rejected when hook_source is herdr-plugin', () => {
  const context = getOpenCodeHookNotificationContext({
    hook_source: 'herdr-plugin',
    hook_event_name: 'session.idle',
    task_info: 'task',
  }, 'task');
  assert.equal(context, null);
});

test('herdr source label renders as [Herdr] in notification titles', () => {
  assert.equal(getSourceLabel('herdr'), 'Herdr');
  const title = buildTitle({
    projectName: 'my-project',
    taskInfo: '✅ claude done · fix bug',
    sourceLabel: getSourceLabel('herdr'),
    includeSourcePrefixInTitle: true,
  });
  assert.match(title, /^\[Herdr\] my-project: /);
});

test('CLI notify --source herdr accepts herdr payload and sends a desktop alert', {
  skip: process.platform !== 'darwin',
}, (t) => {
  const dataDir = createIsolatedDataDir({ desktop: { enabled: true } }, { desktop: true });
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  const result = invokeCli(dataDir, [
    'notify',
    '--source', 'herdr',
    '--from-hook',
    '--force',
    '--skip-dedupe',
  ], {
    hook_source: 'herdr-plugin',
    hook_event_name: 'session.idle',
    cwd: projectRoot,
    task_info: '✅ claude done · demo: implemented feature',
    output_content: 'Implemented the feature.',
  }, {
    AI_CLI_COMPLETE_NOTIFY_DESKTOP_STDOUT: '1',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /__AI_CLI_COMPLETE_NOTIFY_DESKTOP__/);
  assert.match(result.stdout, /OK desktop/);
  // Desktop notification title is the task_info itself (no source prefix),
  // so it must preserve the herdr task description.
  const line = result.stdout.split('\n').find((l) => l.includes('__AI_CLI_COMPLETE_NOTIFY_DESKTOP__'));
  const payload = JSON.parse(line.slice('__AI_CLI_COMPLETE_NOTIFY_DESKTOP__'.length));
  assert.match(payload.title, /✅ claude done · demo: implemented feature/);
});

test('CLI notify --source herdr blocked payload maps to error notification', {
  skip: process.platform !== 'darwin',
}, (t) => {
  const dataDir = createIsolatedDataDir({ desktop: { enabled: true } }, { desktop: true });
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  const result = invokeCli(dataDir, [
    'notify',
    '--source', 'herdr',
    '--from-hook',
    '--force',
    '--skip-dedupe',
  ], {
    hook_source: 'herdr-plugin',
    hook_event_name: 'session.error',
    cwd: projectRoot,
    task_info: '⚠️ claude blocked · needs your input',
    error_message: '⚠️ claude blocked · needs your input',
  }, {
    AI_CLI_COMPLETE_NOTIFY_DESKTOP_STDOUT: '1',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK desktop/);
});
