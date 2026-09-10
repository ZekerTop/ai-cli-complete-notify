const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const cliPath = process.env.HERDR_TEST_CLI || path.join(projectRoot, 'ai-reminder.js');

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
  assert.ok(configText.includes("AI_REMINDER_PATH='"));
  assert.ok(configText.includes('ai-cli-complete-notify-bridge'));
  const bridge = fs.readFileSync(path.join(sb.configDir, 'ai-cli-complete-notify-bridge'), 'utf8');
  assert.ok(bridge.includes(process.execPath));
  assert.ok(bridge.includes(fs.realpathSync(cliPath)));
  assert.match(bridge, /unset AI_CLI_COMPLETE_NOTIFY_DESKTOP_STDOUT/);
});

test('herdr hooks status reports installed + enabled after install', (t) => {
  const sb = createSandbox(t);

  const before = runHooks(sb.env, 'status', '--target', 'herdr');
  assert.equal(before.status, 0, before.stderr || before.stdout);
  const beforeStatus = JSON.parse(before.stdout);
  assert.equal(beforeStatus.herdr.installed, false);
  assert.equal(beforeStatus.herdr.enabled, false);
  assert.equal(beforeStatus.herdr.available, true);

  const install = runHooks(sb.env, 'install', '--target', 'herdr');
  assert.equal(install.status, 0, install.stderr || install.stdout);

  const after = runHooks(sb.env, 'status', '--target', 'herdr');
  assert.equal(after.status, 0, after.stderr || after.stdout);
  const afterStatus = JSON.parse(after.stdout);
  assert.equal(afterStatus.herdr.installed, true);
  assert.equal(afterStatus.herdr.configured, true);
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

  const result = runHooks(env, 'status', '--target', 'herdr');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const status = JSON.parse(result.stdout);
  assert.equal(status.herdr.installed, false);
  assert.equal(status.herdr.available, false);
});

test('ordinary hooks status never executes Herdr and retains a capability marker', (t) => {
  const sb = createSandbox(t);
  const result = runHooks(sb.env, 'status');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).herdr, { supported: true });
  assert.deepEqual(readCalls(sb.logFile), []);
});

test('configuration preserves custom values, quotes paths, and uses bundled runtime without PATH node', (t) => {
  const sb = createSandbox(t);
  const configDir = path.join(sb.configDir, "space ' $() `value` ");
  fs.mkdirSync(configDir);
  const configPath = path.join(configDir, 'config.env');
  const custom = '# custom settings\nALSO_HERDR_NOTIFY=true\nPYTHON_BIN=python3\n';
  fs.writeFileSync(configPath, custom + 'export AI_REMINDER_PATH="old"\n');
  const env = { ...sb.env, MOCK_HERDR_CONFIG_DIR: configDir,
    AI_CLI_COMPLETE_NOTIFY_DATA_DIR: path.join(sb.home, 'app-data'),
    AI_CLI_COMPLETE_NOTIFY_PACKAGED: '1', AI_CLI_COMPLETE_NOTIFY_DESKTOP_STDOUT: '1' };
  const install = runHooks(env, 'install', '--target', 'herdr');
  assert.equal(install.status, 0, install.stdout + install.stderr);
  const configured = fs.readFileSync(configPath, 'utf8');
  assert.ok(configured.startsWith(custom));
  const readPath = spawnSync('/bin/bash', ['-c', 'source "$1"; printf "%s" "$AI_REMINDER_PATH"', '_', configPath], { env, encoding: 'utf8' });
  assert.equal(readPath.status, 0, readPath.stderr);
  assert.equal(readPath.stdout, path.join(configDir, 'ai-cli-complete-notify-bridge'));
  const bridge = spawnSync(readPath.stdout, ['hooks', 'status'], { env: { ...env, PATH: '/usr/bin:/bin' }, encoding: 'utf8' });
  assert.equal(bridge.status, 0, bridge.stderr);
  assert.deepEqual(JSON.parse(bridge.stdout).herdr, { supported: true });
  const notify = spawnSync(readPath.stdout, ['notify', '--source', 'herdr', '--force', '--skip-dedupe', '--from-hook'], { env, encoding: 'utf8', input: '{}' });
  assert.equal(notify.status, 0, notify.stderr);
  assert.match(notify.stdout, /source herdr disabled/);
  const again = runHooks(env, 'install', '--target', 'herdr');
  assert.equal(again.status, 0);
  assert.equal(fs.readFileSync(configPath, 'utf8'), configured);
});

test('invalid Herdr status is not reported as available', (t) => {
  const sb = createSandbox(t);
  fs.writeFileSync(sb.env.HERDR_BIN_PATH, '#!/bin/sh\necho not-json\n');
  const result = runHooks(sb.env, 'status', '--target', 'herdr');
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).herdr.available, false);
});

test('explicit Herdr status times out while ordinary status stays independent', (t) => {
  const sb = createSandbox(t);
  fs.writeFileSync(sb.env.HERDR_BIN_PATH, '#!/bin/sh\nexec sleep 30\n');
  const start = Date.now();
  const result = runHooks(sb.env, 'status', '--target', 'herdr');
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).herdr.available, false);
  assert.ok(Date.now() - start < 10000, 'explicit status must have a bounded wait');
});

test('Herdr bridge dispatches desktop notifications outside Tauri stdout without changing native sources', (t) => {
  const sb = createSandbox(t);
  const dataDir = path.join(sb.home, 'notify-data');
  fs.mkdirSync(dataDir);
  const desktopLog = path.join(dataDir, 'desktop.log');
  const osascript = path.join(path.dirname(sb.env.HERDR_BIN_PATH), 'osascript');
  fs.writeFileSync(osascript, '#!/bin/sh\nprintf "%s\\n" "$@" >> "$MOCK_DESKTOP_LOG"\n', {mode:0o755});
  const env = {...sb.env, PATH:path.dirname(osascript) + path.delimiter + sb.env.PATH,
    AI_CLI_COMPLETE_NOTIFY_DATA_DIR:dataDir, AI_CLI_COMPLETE_NOTIFY_DESKTOP_STDOUT:'1', MOCK_DESKTOP_LOG:desktopLog};
  const settings = {version:2, summary:{enabled:false}, ui:{autoFocusOnNotify:false},
    channels:Object.fromEntries(['webhook','telegram','sound','desktop','email','gotify'].map(name=>[name,{enabled:name==='desktop'}])),
    sources:{claude:{enabled:false},codex:{enabled:true},herdr:{enabled:true,channels:{desktop:true}}}};
  const settingsPath = path.join(dataDir, 'settings.json');
  fs.writeFileSync(settingsPath,JSON.stringify(settings));
  const before = fs.readFileSync(settingsPath,'utf8');
  assert.equal(runHooks(env,'install','--target','herdr').status,0);
  assert.equal(fs.readFileSync(settingsPath,'utf8'),before);
  const result = spawnSync(path.join(sb.configDir,'ai-cli-complete-notify-bridge'),
    ['notify','--source','herdr','--task','Herdr desktop bridge check','--force','--skip-dedupe','--skip-summary'],
    {env,encoding:'utf8',cwd:projectRoot});
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(fs.readFileSync(desktopLog,'utf8'),/Herdr desktop bridge check/);
  assert.doesNotMatch(result.stdout,/AI_CLI_DESKTOP_NOTIFY/);
  assert.equal(fs.readFileSync(settingsPath,'utf8'),before);
});

test('an installed plugin with a stale bridge needs configuration before enabling in the UI', (t) => {
  const sb = createSandbox(t);
  fs.writeFileSync(sb.stateFile, JSON.stringify({installed:true,enabled:true}));
  const result = runHooks(sb.env, 'status', '--target', 'herdr');
  const status = JSON.parse(result.stdout).herdr;
  assert.equal(status.installed, true);
  assert.equal(status.configured, false);
});

test('watch hook reminders ignore optional Herdr without external discovery', (t) => {
  const sb = createSandbox(t);
  const modulePath = path.join(path.dirname(cliPath), 'src', 'hook-reminder.js');
  const result = spawnSync(process.execPath, ['-e', `const result = require(${JSON.stringify(modulePath)}).checkAndRemindHooks('herdr', {quiet:true}); console.log(JSON.stringify(result));`], {env:sb.env,encoding:'utf8',cwd:projectRoot});
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).uninstalled,[]);
  assert.deepEqual(readCalls(sb.logFile),[]);
});
