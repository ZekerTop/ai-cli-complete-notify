const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawnSync } = require('node:child_process');
const { DEFAULT_CONFIG } = require('../src/default-config');
const { shouldSkipByNotificationMode } = require('../src/engine');

const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'ai-reminder.js');
const hookArgs = ['notify', '--source', 'deepseek', '--from-hook', '--force'];

function sandbox(t, { threshold = 0, enabled = true, summary = false, mode = 'hooks' } = {}) {
  const target = path.join(root, 'src-tauri', 'target');
  fs.mkdirSync(target, { recursive: true });
  const dir = fs.mkdtempSync(path.join(target, 'deepseek-cli-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const data = path.join(dir, 'data');
  const home = path.join(dir, 'home');
  fs.mkdirSync(data);
  fs.mkdirSync(home);
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(envPath, '');
  const config = structuredClone(DEFAULT_CONFIG);
  config.ui.notificationMode = mode;
  config.summary.enabled = summary;
  config.sources.deepseek.enabled = enabled;
  config.sources.deepseek.minDurationMinutes = threshold;
  for (const [name, channel] of Object.entries(config.channels)) {
    channel.enabled = name === 'webhook';
    config.sources.deepseek.channels[name] = name === 'webhook';
  }
  config.channels.webhook.urls = ['https://example.test/no-network'];
  fs.writeFileSync(path.join(data, 'settings.json'), JSON.stringify(config));
  const capture = path.join(dir, 'capture.jsonl');
  const preload = path.join(dir, 'preload.cjs');
  fs.writeFileSync(preload, `
const fs = require('node:fs');
const capture = (value) => fs.appendFileSync(${JSON.stringify(capture)}, JSON.stringify(value) + '\\n');
const fail = () => { throw new Error('Unexpected network request in DeepSeek test'); };
require('node:http').request = fail;
require('node:https').request = fail;
global.fetch = fail;
const webhook = require.resolve(${JSON.stringify(path.join(root, 'src/notifiers/webhook'))});
require.cache[webhook] = { id: webhook, filename: webhook, loaded: true, exports: {
  notifyWebhook: async ({ sourceName, sourceLabel, taskInfo, outputContent, summaryUsed, durationText }) => {
    capture({ type: 'webhook', sourceName, sourceLabel, taskInfo, outputContent, summaryUsed, durationText,
      desktopStdout: process.env.AI_CLI_COMPLETE_NOTIFY_DESKTOP_STDOUT });
    console.log('mock DeepSeek diagnostic');
    return { ok: process.env.DEEPSEEK_TEST_FAIL !== '1', results: [] };
  }
} };
const summary = require.resolve(${JSON.stringify(path.join(root, 'src/summary'))});
require.cache[summary] = { id: summary, filename: summary, loaded: true, exports: {
  summarizeTaskDetailed: async ({ config, summaryContext }) => {
    capture({ type: 'summary', summaryContext });
    return config.summary.enabled ? { ok: true, summary: '登录问题已修复' } : { ok: false };
  }
} };
`);
  return { dir, data, capture, preload, env: {
    PATH: process.env.PATH, HOME: home, USERPROFILE: home,
    AI_CLI_COMPLETE_NOTIFY_DATA_DIR: data, AI_CLI_COMPLETE_NOTIFY_ENV_PATH: envPath,
  } };
}

function payload(sb, overrides = {}) {
  return { hook_event_name: 'TurnEnd', reason: 'completed', session_id: 'session-a', turn_id: 1,
    cwd: sb.dir, started_at: 1000, completed_at: 61000, user_prompt: '修复登录',
    last_assistant_message: '已修复登录，测试通过', ...overrides };
}

function run(sb, value, extraEnv = {}) {
  const result = spawnSync(process.execPath, ['--require', sb.preload, cli, ...hookArgs], {
    cwd: sb.dir, env: { ...sb.env, ...extraEnv },
    input: typeof value === 'string' ? value : JSON.stringify(value), encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  assert.equal(result.stdout, '{}\n');
  return result;
}

function captured(sb, type) {
  if (!fs.existsSync(sb.capture)) return [];
  return fs.readFileSync(sb.capture, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter((v) => v.type === type);
}

test('DeepSeek CLI passes native reply and user prompt to AI summary while keeping stdout clean', (t) => {
  const sb = sandbox(t, { summary: true });
  const result = run(sb, payload(sb), { AI_CLI_COMPLETE_NOTIFY_DESKTOP_STDOUT: '1' });
  assert.match(result.stderr, /mock DeepSeek diagnostic/);
  assert.deepEqual(captured(sb, 'summary')[0].summaryContext,
    { userMessage: '修复登录', assistantMessage: '已修复登录，测试通过' });
  assert.deepEqual(captured(sb, 'webhook')[0], {
    type: 'webhook', sourceName: 'deepseek', sourceLabel: 'DeepSeek Harness', taskInfo: '登录问题已修复',
    outputContent: '已修复登录，测试通过', summaryUsed: true, durationText: '1m 0s', desktopStdout: '0',
  });
});

test('DeepSeek CLI rejects malformed and unrelated events before any summary or delivery', (t) => {
  const sb = sandbox(t);
  for (const value of ['', 'not-json', 'null', '[]', '{}', payload(sb, { reason: 'error' }),
    payload(sb, { hook_event_name: 'Stop' }), payload(sb, { session_id: '' }),
    payload(sb, { started_at: undefined })]) run(sb, value);
  assert.equal(captured(sb, 'webhook').length, 0);
  assert.equal(captured(sb, 'summary').length, 0);
});

test('DeepSeek CLI honors event duration threshold even when legacy force is passed', (t) => {
  const sb = sandbox(t, { threshold: 5 });
  assert.match(run(sb, payload(sb)).stderr, /below threshold/);
  assert.equal(captured(sb, 'webhook').length, 0);
  run(sb, payload(sb, { completed_at: 301000 }));
  assert.equal(captured(sb, 'webhook').length, 1);
});

test('DeepSeek CLI dedupes session-turn replays but sends identical replies in other turns and sessions', (t) => {
  const sb = sandbox(t);
  run(sb, payload(sb));
  assert.match(run(sb, payload(sb)).stderr, /duplicate notification suppressed/);
  run(sb, payload(sb, { turn_id: 2 }));
  run(sb, payload(sb, { session_id: 'session-b' }));
  assert.equal(captured(sb, 'webhook').length, 3);
});

test('concurrent DeepSeek hook processes send once and leave shared notifications and task timers intact', async (t) => {
  const sb = sandbox(t);
  const sharedState = path.join(sb.data, 'state.json');
  const initialState = JSON.stringify({
    tasks: { 'claude::/fixture': { source: 'claude', startedAt: Date.now() } },
    recentNotifications: [{ fingerprint: 'gemini::::fixture', timestamp: Date.now() }],
  });
  fs.writeFileSync(sharedState, initialState);

  const args = ['--require', sb.preload, cli, ...hookArgs];
  const results = await Promise.all(Array.from({ length: 4 }, () => new Promise((resolve, reject) => {
    const child = execFile(process.execPath, args, { cwd: sb.dir, env: sb.env, timeout: 10000 }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
    child.stdin.on('error', reject);
    child.stdin.end(JSON.stringify(payload(sb)));
  })));

  assert.ok(results.every(({ stdout }) => stdout === '{}\n'));
  assert.equal(results.filter(({ stderr }) => /duplicate notification suppressed for deepseek/.test(stderr)).length, 3);
  assert.equal(captured(sb, 'webhook').length, 1);
  assert.equal(fs.readFileSync(sharedState, 'utf8'), initialState);
  assert.equal(fs.readdirSync(path.join(sb.data, 'deepseek-notification-claims')).length, 1);
  assert.equal(fs.existsSync(path.join(sb.data, 'codex-notification-claims')), false);
});

test('DeepSeek failed delivery can retry without erasing a successful dedupe record', (t) => {
  const sb = sandbox(t);
  run(sb, payload(sb), { DEEPSEEK_TEST_FAIL: '1' });
  run(sb, payload(sb));
  assert.match(run(sb, payload(sb)).stderr, /duplicate notification suppressed/);
  assert.equal(captured(sb, 'webhook').length, 2);
});

test('DeepSeek defaults stay disabled and Watch mode leaves the native-only source available', (t) => {
  assert.equal(DEFAULT_CONFIG.sources.deepseek.enabled, false);
  assert.equal(shouldSkipByNotificationMode({ sourceName: 'deepseek', fromHook: true, notificationMode: 'watch' }), null);
  const disabled = sandbox(t, { enabled: false });
  assert.match(run(disabled, payload(disabled)).stderr, /source deepseek disabled/);
  assert.equal(captured(disabled, 'webhook').length, 0);
  const watchMode = sandbox(t, { mode: 'watch' });
  run(watchMode, payload(watchMode));
  assert.equal(captured(watchMode, 'webhook').length, 1);
});

test('DeepSeek local bundle generation through CLI prints the required manual install command', (t) => {
  const sb = sandbox(t);
  const result = spawnSync(process.execPath, [cli, 'hooks', 'install', '--target', 'deepseek'],
    { cwd: sb.dir, env: sb.env, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /已生成本地插件/);
  assert.match(result.stdout, /dsh plugin --profile YOUR_PROFILE add/);
  assert.match(result.stdout, /Desktop 内置的 dsh/);
  assert.doesNotMatch(result.stdout, /已安装 deepseek/);
  assert.ok(fs.existsSync(path.join(sb.data, 'deepseek-plugin', 'index.js')));
});

test('generated DeepSeek ESM plugin delivers completed native events through the real CLI and engine', (t) => {
  const sb = sandbox(t, { summary: true });
  const pluginPath = path.join(sb.dir, 'plugin.mjs');
  fs.writeFileSync(pluginPath, require('../src/deepseek-plugin').buildDeepseekPlugin(cli));
  const runner = path.join(sb.dir, 'runner.mjs');
  fs.writeFileSync(runner, `
import fs from 'node:fs';
import { apply } from './plugin.mjs';
const handlers = new Map();
let cleanup;
apply({
  workingDirectory: { get: () => ${JSON.stringify(sb.dir)} },
  get: () => undefined,
  on: (name, handler) => handlers.set(name, handler),
  effect: (setup) => { cleanup = setup(); },
});
const session = { id: 'real-plugin-session', header: { origin: 'main' } };
const emit = (type, data, time) => handlers.get('session/event')(session, { type, data, time });
emit('turn/start', { turn: 1 }, 1000);
emit('user/message', { source: { kind: 'user' }, content: [{ type: 'text', text: '修复登录' }] }, 1001);
emit('assistant/message', { turn: 1, message: { content: [
  { type: 'reasoning', text: 'Private reasoning must not be delivered' },
  { type: 'text', text: '已修复登录，测试通过' },
] } }, 60000);
emit('turn/end', { turn: 1, reason: { kind: 'completed' } }, 61000);
const deadline = Date.now() + 5000;
while (!fs.existsSync(${JSON.stringify(sb.capture)}) ||
  !fs.readFileSync(${JSON.stringify(sb.capture)}, 'utf8').includes('"type":"webhook"')) {
  if (Date.now() > deadline) throw new Error('Plugin did not reach the notification engine');
  await new Promise((resolve) => setTimeout(resolve, 20));
}
await cleanup();
`);
  const result = spawnSync(process.execPath, [runner], {
    cwd: sb.dir, env: { ...sb.env, NODE_OPTIONS: `--require ${JSON.stringify(sb.preload)}` },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  assert.equal(result.stdout, '');
  assert.equal(captured(sb, 'webhook').length, 1);
  assert.equal(captured(sb, 'webhook')[0].outputContent, '已修复登录，测试通过');
  assert.equal(captured(sb, 'webhook')[0].summaryUsed, true);
  assert.deepEqual(captured(sb, 'summary')[0].summaryContext,
    { userMessage: '修复登录', assistantMessage: '已修复登录，测试通过' });
});
