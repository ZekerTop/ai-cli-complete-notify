const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const cliPath = path.join(projectRoot, 'ai-reminder.js');

const PLUGIN_ID = '8liang.herdr-ai-notify';
const PLUGIN_REPO = '8liang/herdr-ai-notify';

function createSandbox(t) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-notify-herdr-hooks-'));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

  const home = path.join(sandbox, 'home');
  const binDir = path.join(sandbox, 'bin');
  const configDir = path.join(sandbox, 'herdr-config', PLUGIN_ID);
  const stateFile = path.join(sandbox, 'state.json');
  const logFile = path.join(sandbox, 'herdr-calls.log');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify({ installed: false, enabled: false }), 'utf8');

  // A mock `herdr` binary that records calls and simulates the plugin registry.
  const mockBin = path.join(binDir, 'herdr');
  const mockSource = `#!/usr/bin/env node
const fs = require('node:fs');
const logFile = process.env.MOCK_HERDR_LOG;
const stateFile = process.env.MOCK_HERDR_STATE;
const configDir = process.env.MOCK_HERDR_CONFIG_DIR;
if (logFile) fs.appendFileSync(logFile, JSON.stringify(process.argv.slice(2)) + '\\n');
const [cmd, sub] = process.argv.slice(2);
function readState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (_e) { return {}; }
}
function writeState(state) { fs.writeFileSync(stateFile, JSON.stringify(state), 'utf8'); }
if (cmd === 'plugin' && sub === 'list') {
  const state = readState();
  const plugins = state.installed
    ? [{ plugin_id: '${PLUGIN_ID}', enabled: Boolean(state.enabled) }]
    : [];
  process.stdout.write(JSON.stringify({ id: 'cli:plugin', result: { plugins } }) + '\\n');
  process.exit(0);
}
if (cmd === 'plugin' && sub === 'install') {
  writeState({ installed: true, enabled: false });
  process.exit(0);
}
if (cmd === 'plugin' && sub === 'config-dir') {
  process.stdout.write(configDir + '\\n');
  process.exit(0);
}
if (cmd === 'plugin' && sub === 'enable') {
  const state = readState();
  writeState({ installed: state.installed !== false, enabled: true });
  process.exit(0);
}
if (cmd === 'plugin' && sub === 'uninstall') {
  writeState({ installed: false, enabled: false });
  process.exit(0);
}
process.exit(1);
`;
  fs.writeFileSync(mockBin, mockSource, 'utf8');
  fs.chmodSync(mockBin, 0o755);

  const env = {
    ...process.env,
    HOME: home,
    HERDR_BIN_PATH: mockBin,
    MOCK_HERDR_LOG: logFile,
    MOCK_HERDR_STATE: stateFile,
    MOCK_HERDR_CONFIG_DIR: configDir,
  };

  return { home, configDir, stateFile, logFile, env };
}

function readState(stateFile) {
  return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}

function readCalls(logFile) {
  if (!fs.existsSync(logFile)) return [];
  return fs.readFileSync(logFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function runHooks(env, ...args) {
  const result = spawnSync(process.execPath, [cliPath, 'hooks', ...args], {
    cwd: projectRoot,
    env,
    encoding: 'utf8'
  });
  return result;
}

test('herdr hooks install installs the plugin and writes config.env', (t) => {
  const sb = createSandbox(t);

  const result = runHooks(sb.env, 'install', '--target', 'herdr');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /已安装 herdr 集成/);

  // The plugin registry should now be installed + enabled.
  const state = readState(sb.stateFile);
  assert.equal(state.installed, true);
  assert.equal(state.enabled, true);

  // herdr must have been called in the expected order.
  const calls = readCalls(sb.logFile);
  assert.deepEqual(
    calls.map((c) => c[1]),
    ['install', 'config-dir', 'enable']
  );
  assert.deepEqual(calls[0], ['plugin', 'install', PLUGIN_REPO, '--yes']);
  assert.deepEqual(calls[1], ['plugin', 'config-dir', PLUGIN_ID]);
  assert.deepEqual(calls[2], ['plugin', 'enable', PLUGIN_ID]);

  // config.env should be written into the plugin config dir with the
  // auto-detected ai-reminder.js path.
  const configPath = path.join(sb.configDir, 'config.env');
  assert.equal(fs.existsSync(configPath), true);
  const configText = fs.readFileSync(configPath, 'utf8');
  assert.match(configText, new RegExp(`AI_REMINDER_PATH=${cliPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('herdr hooks status reports installed + enabled after install', (t) => {
  const sb = createSandbox(t);

  const before = runHooks(sb.env, 'status');
  assert.equal(before.status, 0, before.stderr || before.stdout);
  const beforeStatus = JSON.parse(before.stdout);
  assert.equal(beforeStatus.herdr.installed, false);
  assert.equal(beforeStatus.herdr.enabled, false);
  assert.equal(beforeStatus.herdr.available, true);

  const install = runHooks(sb.env, 'install', '--target', 'herdr');
  assert.equal(install.status, 0, install.stderr || install.stdout);

  const after = runHooks(sb.env, 'status');
  assert.equal(after.status, 0, after.stderr || after.stdout);
  const afterStatus = JSON.parse(after.stdout);
  assert.equal(afterStatus.herdr.installed, true);
  assert.equal(afterStatus.herdr.enabled, true);
  assert.equal(afterStatus.herdr.plugin.plugin_id, PLUGIN_ID);
});

test('herdr hooks uninstall unregisters the plugin', (t) => {
  const sb = createSandbox(t);

  const install = runHooks(sb.env, 'install', '--target', 'herdr');
  assert.equal(install.status, 0, install.stderr || install.stdout);

  const uninstall = runHooks(sb.env, 'uninstall', '--target', 'herdr');
  assert.equal(uninstall.status, 0, uninstall.stderr || uninstall.stdout);
  assert.match(uninstall.stdout, /已卸载 herdr 集成/);

  const state = readState(sb.stateFile);
  assert.equal(state.installed, false);

  const calls = readCalls(sb.logFile);
  assert.deepEqual(calls.at(-1), ['plugin', 'uninstall', PLUGIN_REPO]);
});

test('herdr hooks preview prints commands and config.env without side effects', (t) => {
  const sb = createSandbox(t);

  const result = runHooks(sb.env, 'preview', '--target', 'herdr');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, new RegExp(`plugin install ${PLUGIN_REPO} --yes`));
  assert.match(result.stdout, new RegExp(`plugin config-dir ${PLUGIN_ID}`));
  assert.match(result.stdout, new RegExp(`plugin enable ${PLUGIN_ID}`));
  assert.match(result.stdout, /AI_REMINDER_PATH=/);

  // Preview must not call the herdr binary at all.
  const calls = readCalls(sb.logFile);
  assert.equal(calls.length, 0);
});

test('herdr hooks install fails gracefully when herdr is unavailable', (t) => {
  const sb = createSandbox(t);
  const brokenBin = path.join(sb.home, 'herdr-missing');
  const env = { ...sb.env, HERDR_BIN_PATH: brokenBin };

  const result = runHooks(env, 'install', '--target', 'herdr');
  assert.equal(result.status, 1);
  assert.match(result.stderr + result.stdout, /herdr plugin install failed/);
});

test('herdr hooks status reports unavailable when herdr cannot run', (t) => {
  const sb = createSandbox(t);
  const env = { ...sb.env, HERDR_BIN_PATH: path.join(sb.home, 'no-herdr-here') };

  const result = runHooks(env, 'status');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const status = JSON.parse(result.stdout);
  assert.equal(status.herdr.installed, false);
  assert.equal(status.herdr.available, false);
});
