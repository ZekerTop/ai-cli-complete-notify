const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const packageMarker = 'deepseek-plugin:v1';
const fileMarker = 'ai-cli-complete-notify:deepseek-plugin:v1';
const managedFiles = ['package.json', 'index.js', 'cordis.patch.yml'];

function createSandbox(t) {
  const target = path.join(projectRoot, 'src-tauri', 'target');
  fs.mkdirSync(target, { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(target, 'deepseek-plugin-install-'));
  const home = path.join(sandbox, 'home');
  const dataDir = path.join(sandbox, 'data');
  const pluginDir = path.join(dataDir, 'deepseek-plugin');
  fs.mkdirSync(home);
  fs.mkdirSync(dataDir);
  const previousEnv = new Map(['HOME', 'USERPROFILE', 'APPDATA', 'AI_CLI_COMPLETE_NOTIFY_DATA_DIR', 'DSH_HOME']
    .map((name) => [name, process.env[name]]));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = home;
  process.env.AI_CLI_COMPLETE_NOTIFY_DATA_DIR = dataDir;
  process.env.DSH_HOME = path.join(home, '.dsh');
  const modulePath = require.resolve('../src/deepseek-plugin');
  const originalModule = require.cache[modulePath];
  delete require.cache[modulePath];
  t.after(() => {
    if (originalModule) require.cache[modulePath] = originalModule;
    else delete require.cache[modulePath];
    for (const [name, value] of previousEnv) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    fs.rmSync(sandbox, { recursive: true, force: true });
  });
  const exePath = path.join(sandbox, "notifier's source cli.js");
  fs.writeFileSync(exePath, '// Isolated executable path fixture; never run.\n');
  return {
    sandbox,
    home,
    dataDir,
    pluginDir,
    settingsPath: path.join(pluginDir, 'index.js'),
    exePath,
    api: require('../src/deepseek-plugin'),
  };
}

function readBundle(sb) {
  return Object.fromEntries(managedFiles.map((name) => [name, fs.readFileSync(path.join(sb.pluginDir, name), 'utf8')]));
}

function instructionsText(value) {
  return typeof value === 'string' ? value : JSON.stringify(value || '');
}

function assertRejected(result) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(typeof result.error, 'string');
  assert.ok(result.error.trim());
}

test('DeepSeek preview and status describe manual bundle installation without writing files', async (t) => {
  const sb = createSandbox(t);
  const preview = await sb.api.getDeepseekConfigPreview(sb.exePath);
  assert.equal(typeof preview, 'string');
  assert.ok(preview.trim());
  assert.match(preview, /dsh plugin/);
  assert.ok(preview.includes(sb.pluginDir));
  const status = await sb.api.getDeepseekHookStatus();
  assert.equal(status.installed, false);
  assert.equal(status.settingsPath, sb.settingsPath);
  assert.equal(status.pluginDir, sb.pluginDir);
  assert.equal(status.requiresManualInstall, true);
  assert.match(status.installCommand, /dsh plugin --profile YOUR_PROFILE add/);
  assert.match(status.removeCommand, /dsh plugin --profile YOUR_PROFILE remove/);
  assert.ok(status.installCommand.includes(sb.pluginDir));
  assert.ok(instructionsText(status.instructions).trim());
  assert.equal(fs.existsSync(sb.pluginDir), false);
  assert.deepEqual(fs.readdirSync(sb.home), []);
});

test('DeepSeek preserves its local files while registered in the macOS Desktop profile', { skip: process.platform !== 'darwin' }, (t) => {
  const sb = createSandbox(t);
  assert.equal(sb.api.installDeepseekHook(sb.exePath).ok, true);
  const before = readBundle(sb);
  const profile = path.join(process.env.DSH_HOME, 'profiles', 'desktop');
  fs.mkdirSync(path.join(profile, 'node_modules'), { recursive: true });
  fs.symlinkSync(sb.pluginDir, path.join(profile, 'node_modules', 'ai-cli-complete-notify-deepseek-plugin'));
  fs.writeFileSync(path.join(profile, 'package.json'), JSON.stringify({
    dependencies: { 'ai-cli-complete-notify-deepseek-plugin': `link:${sb.pluginDir}` },
    dsh: { profile: { bundles: ['ai-cli-complete-notify-deepseek-plugin'] } },
  }));
  const result = sb.api.uninstallDeepseekHook();
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'deepseek_bundle_registered');
  assert.deepEqual(readBundle(sb), before);
  fs.unlinkSync(sb.settingsPath);
  assert.equal(sb.api.getDeepseekHookStatus().installed, false);
  assert.equal(sb.api.uninstallDeepseekHook().errorCode, 'deepseek_bundle_registered');
  for (const name of managedFiles.filter(file => file !== 'index.js')) {
    assert.equal(fs.readFileSync(path.join(sb.pluginDir, name), 'utf8'), before[name]);
  }
});

test('DeepSeek preserves local files when macOS Desktop registration is unknown', { skip: process.platform !== 'darwin' }, (t) => {
  const sb = createSandbox(t);
  assert.equal(sb.api.installDeepseekHook(sb.exePath).ok, true);
  const before = readBundle(sb);
  const profile = path.join(process.env.DSH_HOME, 'profiles', 'desktop');
  fs.mkdirSync(profile, { recursive: true });
  fs.writeFileSync(path.join(profile, 'package.json'), '{ invalid profile');
  const result = sb.api.uninstallDeepseekHook();
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'deepseek_registration_unknown');
  assert.deepEqual(readBundle(sb), before);
});

test('DeepSeek does not delete its bundle when a Desktop package operation temporarily hides the manifest', { skip: process.platform !== 'darwin' }, (t) => {
  const sb = createSandbox(t);
  assert.equal(sb.api.installDeepseekHook(sb.exePath).ok, true);
  const before = readBundle(sb);
  const profile = path.join(process.env.DSH_HOME, 'profiles', 'desktop');
  fs.mkdirSync(profile, { recursive: true });
  fs.writeFileSync(path.join(profile, 'package.json.lock'), `${process.pid}\n`);
  const result = sb.api.uninstallDeepseekHook();
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'deepseek_registration_unknown');
  assert.deepEqual(readBundle(sb), before);
  fs.writeFileSync(path.join(profile, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }));
  const pending = sb.api.uninstallDeepseekHook();
  assert.equal(pending.ok, false);
  assert.equal(pending.errorCode, 'deepseek_registration_unknown');
  assert.deepEqual(readBundle(sb), before);
});

test('DeepSeek installation produces an owned official bundle with absolute Node and script paths', async (t) => {
  const sb = createSandbox(t);
  const result = await sb.api.installDeepseekHook(sb.exePath);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.settingsPath, sb.settingsPath);
  assert.equal(result.pluginDir, sb.pluginDir);
  const bundle = readBundle(sb);
  const manifest = JSON.parse(bundle['package.json']);
  assert.equal(manifest.aiCliCompleteNotify, packageMarker);
  assert.equal(manifest.type, 'module');
  assert.equal(manifest.main, 'index.js');
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(typeof manifest.name, 'string');
  assert.ok(manifest.name.trim());
  assert.ok(bundle['index.js'].includes(fileMarker));
  assert.ok(bundle['cordis.patch.yml'].includes(fileMarker));
  assert.match(bundle['index.js'], /export\s+function\s+apply\s*\(/);
  assert.ok(bundle['index.js'].includes(JSON.stringify(process.execPath)));
  assert.ok(bundle['index.js'].includes(JSON.stringify(sb.exePath)));
  for (const argument of ['notify', '--source', 'deepseek', '--from-hook']) {
    assert.ok(bundle['index.js'].includes(argument), `missing generated argument ${argument}`);
  }
  assert.doesNotMatch(bundle['index.js'], /--force/);
  assert.match(bundle['cordis.patch.yml'], /- insert:/);
  assert.ok(bundle['cordis.patch.yml'].includes(manifest.name));
  const status = await sb.api.getDeepseekHookStatus();
  assert.equal(status.installed, true);
  assert.equal(status.requiresManualInstall, true);
  assert.match(status.installCommand, /dsh plugin --profile \S+ add/);
  assert.ok(status.installCommand.includes(sb.pluginDir));
  assert.match(instructionsText(result.instructions), /dsh|profile|插件|plugin/i);
  assert.deepEqual(fs.readdirSync(sb.home), []);
});

test('DeepSeek packaged executables are invoked directly rather than through Node', async (t) => {
  const sb = createSandbox(t);
  const exePath = path.join(sb.sandbox, "Notifier Tool's binary.exe");
  fs.writeFileSync(exePath, 'Isolated executable path fixture; never run.');
  const result = await sb.api.installDeepseekHook(exePath);
  assert.equal(result.ok, true, JSON.stringify(result));
  const plugin = fs.readFileSync(sb.settingsPath, 'utf8');
  assert.ok(plugin.includes(JSON.stringify(exePath)));
  assert.equal(plugin.includes(JSON.stringify(process.execPath)), false);
  for (const argument of ['notify', '--source', 'deepseek', '--from-hook']) {
    assert.ok(plugin.includes(argument));
  }
});

test('DeepSeek reinstallation is idempotent and keeps unrelated files inside the bundle directory', async (t) => {
  const sb = createSandbox(t);
  assert.equal((await sb.api.installDeepseekHook(sb.exePath)).ok, true);
  const original = readBundle(sb);
  const foreignPath = path.join(sb.pluginDir, 'my-notes.txt');
  fs.writeFileSync(foreignPath, 'Keep my additional file.\n');
  const result = await sb.api.installDeepseekHook(sb.exePath);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(readBundle(sb), original);
  assert.equal(fs.readFileSync(foreignPath, 'utf8'), 'Keep my additional file.\n');
  assert.equal((await sb.api.getDeepseekHookStatus()).installed, true);
});

test('DeepSeek uninstall removes only owned bundle files and preserves unrelated files', async (t) => {
  const sb = createSandbox(t);
  assert.equal((await sb.api.installDeepseekHook(sb.exePath)).ok, true);
  const foreignPath = path.join(sb.pluginDir, 'my-notes.txt');
  fs.writeFileSync(foreignPath, 'Keep after uninstall.\n');
  const result = await sb.api.uninstallDeepseekHook();
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.pluginDir, sb.pluginDir);
  assert.equal(result.settingsPath, sb.settingsPath);
  for (const name of managedFiles) assert.equal(fs.existsSync(path.join(sb.pluginDir, name)), false);
  assert.deepEqual(fs.readdirSync(sb.pluginDir), ['my-notes.txt']);
  assert.equal(fs.readFileSync(foreignPath, 'utf8'), 'Keep after uninstall.\n');
  assert.equal((await sb.api.getDeepseekHookStatus()).installed, false);
});

for (const [name, content] of [
  ['package.json', '{"name":"someone-elses-plugin","type":"module"}\n'],
  ['index.js', 'export function apply() { console.log("foreign plugin"); }\n'],
  ['cordis.patch.yml', '- insert: []\n'],
]) {
  test(`DeepSeek preserves foreign ${name} while removing owned bundle files`, async (t) => {
    const sb = createSandbox(t);
    fs.mkdirSync(sb.pluginDir);
    const foreignPath = path.join(sb.pluginDir, name);
    fs.writeFileSync(foreignPath, content);
    assertRejected(await sb.api.installDeepseekHook(sb.exePath));
    assert.equal(fs.readFileSync(foreignPath, 'utf8'), content);
    assert.deepEqual(fs.readdirSync(sb.pluginDir), [name]);
    assertRejected(await sb.api.uninstallDeepseekHook());
    assert.equal(fs.readFileSync(foreignPath, 'utf8'), content);
    assert.deepEqual(fs.readdirSync(sb.pluginDir), [name]);
    assert.equal((await sb.api.getDeepseekHookStatus()).installed, false);
  });
}

for (const content of ['{ invalid json', '[]', 'null']) {
  test(`DeepSeek preserves a malformed or incompatible manifest: ${content}`, async (t) => {
    const sb = createSandbox(t);
    assert.equal((await sb.api.installDeepseekHook(sb.exePath)).ok, true);
    const manifestPath = path.join(sb.pluginDir, 'package.json');
    fs.writeFileSync(manifestPath, content);
    const before = readBundle(sb);
    assertRejected(await sb.api.installDeepseekHook(sb.exePath));
    assert.deepEqual(readBundle(sb), before);
    assertRejected(await sb.api.uninstallDeepseekHook());
    assert.equal(fs.readFileSync(manifestPath, 'utf8'), content);
    assert.deepEqual(fs.readdirSync(sb.pluginDir), ['package.json']);
    assert.equal((await sb.api.getDeepseekHookStatus()).installed, false);
  });
}

for (const name of managedFiles) {
  test(`DeepSeek refuses a symlinked ${name} even when the linked file has our marker`, async (t) => {
    const sb = createSandbox(t);
    assert.equal((await sb.api.installDeepseekHook(sb.exePath)).ok, true);
    const targetPath = path.join(sb.pluginDir, name);
    const foreignPath = path.join(sb.sandbox, `linked-${name}`);
    fs.renameSync(targetPath, foreignPath);
    fs.symlinkSync(foreignPath, targetPath, 'file');
    const before = readBundle(sb);
    const linkedContent = fs.readFileSync(foreignPath, 'utf8');
    assertRejected(await sb.api.installDeepseekHook(sb.exePath));
    assert.equal(fs.lstatSync(targetPath).isSymbolicLink(), true);
    assert.deepEqual(readBundle(sb), before);
    assertRejected(await sb.api.uninstallDeepseekHook());
    assert.equal(fs.lstatSync(targetPath).isSymbolicLink(), true);
    assert.deepEqual(fs.readdirSync(sb.pluginDir), [name]);
    assert.equal(fs.readFileSync(foreignPath, 'utf8'), linkedContent);
    assert.equal((await sb.api.getDeepseekHookStatus()).installed, false);
  });
}

test('DeepSeek refuses a symlinked plugin directory without changing the linked bundle', async (t) => {
  const sb = createSandbox(t);
  assert.equal((await sb.api.installDeepseekHook(sb.exePath)).ok, true);
  const before = readBundle(sb);
  const foreignDir = path.join(sb.sandbox, 'linked-bundle');
  fs.renameSync(sb.pluginDir, foreignDir);
  fs.symlinkSync(foreignDir, sb.pluginDir, process.platform === 'win32' ? 'junction' : 'dir');
  assertRejected(await sb.api.installDeepseekHook(sb.exePath));
  assert.equal(fs.lstatSync(sb.pluginDir).isSymbolicLink(), true);
  assert.deepEqual(readBundle(sb), before);
  assertRejected(await sb.api.uninstallDeepseekHook());
  assert.equal(fs.lstatSync(sb.pluginDir).isSymbolicLink(), true);
  assert.deepEqual(readBundle(sb), before);
  assert.equal((await sb.api.getDeepseekHookStatus()).installed, false);
});
