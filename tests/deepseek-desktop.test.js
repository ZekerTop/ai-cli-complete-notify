const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const packageName = 'ai-cli-complete-notify-deepseek-plugin';

function createSandbox(t, options = {}) {
  const target = path.join(projectRoot, 'src-tauri', 'target');
  fs.mkdirSync(target, { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(target, 'deepseek-desktop-'));
  const home = path.join(sandbox, 'home');
  const dataDir = path.join(sandbox, 'data');
  fs.mkdirSync(home);
  fs.mkdirSync(dataDir);
  const previousEnv = new Map(['HOME', 'USERPROFILE', 'APPDATA', 'AI_CLI_COMPLETE_NOTIFY_DATA_DIR']
    .map(name => [name, process.env[name]]));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  process.env.APPDATA = home;
  process.env.AI_CLI_COMPLETE_NOTIFY_DATA_DIR = dataDir;
  t.after(() => {
    for (const [name, value] of previousEnv) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  const appPath = path.join(sandbox, 'Applications', 'DeepSeek Harness.app');
  const dshPath = path.join(appPath, 'Contents', 'Resources', 'runtime', 'cli', 'bin', 'dsh');
  const appExecutable = path.join(appPath, 'Contents', 'MacOS', 'DeepSeek Harness');
  for (const file of [dshPath, appExecutable]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '#!/bin/sh\nexit 99\n', { mode: 0o755 });
  }
  const dshHome = options.dshHome || path.join(home, '.dsh');
  const profilePath = path.join(dshHome, 'profiles', 'desktop');
  const manifestPath = path.join(profilePath, 'package.json');
  const pluginDir = path.join(dataDir, 'deepseek-plugin');
  const exePath = path.join(sandbox, "notifier's cli.js");
  fs.writeFileSync(exePath, '// Never executed by this test.\n');
  const calls = [];
  const actions = [];
  const actualPluginApi = require('../src/deepseek-plugin');

  function writeProfile(overrides = {}) {
    fs.mkdirSync(profilePath, { recursive: true });
    const manifest = { name: 'dsh-profile-desktop', private: true, dsh: { profile: { bundles: [] } }, ...overrides };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    return manifest;
  }

  function register(targetDir = pluginDir) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.dependencies = { ...manifest.dependencies, [packageName]: `link:${targetDir}` };
    manifest.dsh.profile.bundles = [...new Set([...manifest.dsh.profile.bundles, packageName])];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    fs.mkdirSync(targetDir, { recursive: true });
    const nodeModules = path.join(profilePath, 'node_modules');
    fs.mkdirSync(nodeModules, { recursive: true });
    fs.symlinkSync(targetDir, path.join(nodeModules, packageName), process.platform === 'win32' ? 'junction' : 'dir');
  }

  if (options.initialize !== false) writeProfile();
  const pluginApi = {
    getDeepseekHookStatus: () => actualPluginApi.getDeepseekHookStatus(),
    installDeepseekHook: (entry) => {
      actions.push('install-local');
      if (options.localFailure) return { ok: false, pluginDir, error: 'Foreign local bundle' };
      return actualPluginApi.installDeepseekHook(entry);
    },
  };
  const run = (file, args, runOptions) => {
    calls.push({ file, args, options: runOptions });
    if (file === '/bin/ps') {
      actions.push('process-check');
      return options.processResult || { status: 0, stdout: '', stderr: '' };
    }
    actions.push('run-dsh');
    assert.equal(file, dshPath, 'Only the fixture Desktop CLI can be invoked');
    if (options.onRun) return options.onRun({ register, writeProfile, manifestPath, pluginDir, sandbox });
    register();
    return { status: 0, stdout: 'fixture install completed', stderr: '' };
  };
  const processList = () => {
    actions.push('process-check');
    if (options.processError) throw options.processError;
    return options.processResult || { status: 0, stdout: '', stderr: '' };
  };
  const { createDeepseekDesktopManager } = require('../src/deepseek-desktop');
  const manager = createDeepseekDesktopManager({
    platform: options.platform || 'darwin',
    home,
    env: { HOME: home, ...(options.env || {}) },
    appPaths: options.appPaths || [appPath],
    run,
    pluginApi,
    ...(options.kill ? { kill: options.kill } : {}),
    ...(options.defaultProcessList ? {} : { processList }),
  });
  return { sandbox, home, pluginDir, appPath, appExecutable, dshPath, profilePath, manifestPath, exePath, manager, actions, calls, writeProfile, register, pluginApi };
}

function assertFailure(result, code) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.errorCode, code, JSON.stringify(result));
}

test('Desktop status finds only fixture entry points without running dsh or inspecting processes', async (t) => {
  const sb = createSandbox(t);
  const original = fs.readFileSync(sb.manifestPath, 'utf8');
  const status = await sb.manager.getDeepseekDesktopStatus();
  assert.equal(status.available, true);
  assert.equal(status.registered, false);
  assert.equal(status.activation, 'unknown');
  assert.equal(status.appPath, sb.appPath);
  assert.equal(status.dshPath, sb.dshPath);
  assert.equal(status.profilePath, sb.profilePath);
  assert.equal(status.pluginDir, sb.pluginDir);
  assert.deepEqual(sb.calls, []);
  assert.deepEqual(sb.actions, []);
  assert.equal(fs.readFileSync(sb.manifestPath, 'utf8'), original);
  assert.equal(fs.existsSync(sb.pluginDir), false);
});

test('Desktop status expands DSH_HOME tilde relative to the injected home', async (t) => {
  const target = path.join(projectRoot, 'src-tauri', 'target');
  const sb = createSandbox(t, { env: { DSH_HOME: '~/custom harness' } });
  const expected = path.join(sb.home, 'custom harness', 'profiles', 'desktop');
  fs.mkdirSync(expected, { recursive: true });
  fs.writeFileSync(path.join(expected, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }));
  const status = await sb.manager.getDeepseekDesktopStatus();
  assert.equal(status.profilePath, expected);
  assert.equal(status.registered, false);
  assert.ok(status.profilePath.startsWith(target + path.sep));
  assert.deepEqual(sb.calls, []);
});

test('Desktop registered state requires dependency, selected bundle and matching real path', async (t) => {
  const sb = createSandbox(t);
  assert.equal(sb.pluginApi.installDeepseekHook(sb.exePath).ok, true);
  sb.register();
  sb.actions.length = 0;
  const status = await sb.manager.getDeepseekDesktopStatus();
  assert.equal(status.registered, true);
  assert.equal(status.activation, 'unknown');
  const snapshot = await sb.manager.getDeepseekBundleRegistrations();
  assert.equal(snapshot.registered, true);
  assert.deepEqual(sb.calls, []);
  assert.deepEqual(sb.actions, []);
});

for (const missing of ['dependency', 'bundle']) {
  test(`Desktop status treats a partial registration without the ${missing} as unknown`, async (t) => {
    const sb = createSandbox(t);
    sb.register();
    const manifest = JSON.parse(fs.readFileSync(sb.manifestPath, 'utf8'));
    if (missing === 'dependency') delete manifest.dependencies[packageName];
    else manifest.dsh.profile.bundles = [];
    fs.writeFileSync(sb.manifestPath, JSON.stringify(manifest));
    assert.equal((await sb.manager.getDeepseekDesktopStatus()).registered, null);
    assert.deepEqual(sb.calls, []);
  });
}

test('Desktop status reports unknown when a declared registration cannot be resolved', async (t) => {
  const sb = createSandbox(t);
  sb.writeProfile({ dependencies: { [packageName]: `link:${sb.pluginDir}` }, dsh: { profile: { bundles: [packageName] } } });
  const status = await sb.manager.getDeepseekDesktopStatus();
  assert.equal(status.registered, null);
  assert.deepEqual(sb.calls, []);
});

test('Desktop mount checks processes before generating or invoking the local bundle', async (t) => {
  const sb = createSandbox(t);
  const result = await sb.manager.mountDeepseekDesktop(sb.exePath);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.registered, true);
  assert.equal(result.activation, 'unknown');
  assert.equal(result.requiresRestart, true);
  assert.deepEqual(sb.actions, ['process-check', 'install-local', 'run-dsh']);
  assert.equal(sb.calls.length, 1);
  const invocation = sb.calls[0];
  assert.equal(invocation.file, sb.dshPath);
  assert.deepEqual(invocation.args, ['plugin', '--profile', 'desktop', 'add', sb.pluginDir]);
  assert.equal(invocation.options.timeout, 30000);
  assert.equal(invocation.options.encoding, 'utf8');
  assert.equal(invocation.options.stdio, 'ignore');
  assert.equal(invocation.options.cwd, sb.pluginDir);
  assert.equal(invocation.options.env.DSH_HOME, path.join(sb.home, '.dsh'));
  assert.equal((await sb.manager.getDeepseekDesktopStatus()).registered, true);
});

for (const kind of ['main', 'helper', 'host']) {
  test(`Desktop mount refuses a running ${kind} before writing local files`, async (t) => {
    const sb = createSandbox(t);
    const suffix = kind === 'main'
      ? 'Contents/MacOS/DeepSeek Harness'
      : kind === 'helper'
        ? 'Contents/Frameworks/DeepSeek Harness Helper (Renderer).app/Contents/MacOS/DeepSeek Harness Helper (Renderer)'
        : 'Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/index.js';
    const command = kind === 'host' ? `/usr/bin/node ${path.join(sb.appPath, suffix)}` : path.join(sb.appPath, suffix);
    const { createDeepseekDesktopManager } = require('../src/deepseek-desktop');
    const manager = createDeepseekDesktopManager({
      platform: 'darwin', home: sb.home, env: {}, appPaths: [sb.appPath],
      run: () => { throw new Error('A running Desktop must not invoke dsh'); },
      processList: () => ({ status: 0, stdout: `714 ${command}\n` }),
      pluginApi: sb.pluginApi,
    });
    const result = await manager.mountDeepseekDesktop(sb.exePath);
    assertFailure(result, 'desktop_running');
    assert.deepEqual(sb.actions, []);
    assert.equal(fs.existsSync(sb.pluginDir), false);
  });
}

for (const processFailure of ['nonzero', 'throw']) {
  test(`Desktop mount fails closed when process discovery reports ${processFailure}`, async (t) => {
    const sb = createSandbox(t, processFailure === 'throw'
      ? { processError: new Error('Process listing unavailable') }
      : { processResult: { status: 1, stdout: '', stderr: 'Process listing unavailable' } });
    assertFailure(await sb.manager.mountDeepseekDesktop(sb.exePath), 'desktop_process_check_failed');
    assert.deepEqual(sb.calls, []);
    assert.deepEqual(sb.actions, ['process-check']);
    assert.equal(fs.existsSync(sb.pluginDir), false);
  });
}

test('Desktop mount refuses an uninitialized profile without creating it', async (t) => {
  const sb = createSandbox(t, { initialize: false });
  assertFailure(await sb.manager.mountDeepseekDesktop(sb.exePath), 'desktop_profile_uninitialized');
  assert.equal(fs.existsSync(sb.profilePath), false);
  assert.deepEqual(sb.calls, []);
  assert.equal(sb.actions.includes('install-local'), false);
});

for (const raw of ['{ invalid JSON', '{"dsh":{"profile":{"bundles":{}}}}', '{"dependencies":[],"dsh":{"profile":{"bundles":[]}}}']) {
  test(`Desktop mount refuses an invalid profile without overwriting it: ${raw}`, async (t) => {
    const sb = createSandbox(t);
    fs.writeFileSync(sb.manifestPath, raw);
    assertFailure(await sb.manager.mountDeepseekDesktop(sb.exePath), 'desktop_profile_invalid');
    assert.equal(fs.readFileSync(sb.manifestPath, 'utf8'), raw);
    assert.deepEqual(sb.calls, []);
    assert.equal(sb.actions.includes('install-local'), false);
  });
}

for (const platform of ['win32', 'linux']) {
  test(`Desktop mount retains the manual route on unsupported ${platform}`, async (t) => {
    const sb = createSandbox(t, { platform });
    const status = await sb.manager.getDeepseekDesktopStatus();
    assert.equal(status.available, false);
    assert.equal(status.errorCode, 'unsupported_platform');
    assertFailure(await sb.manager.mountDeepseekDesktop(sb.exePath), 'unsupported_platform');
    assert.deepEqual(sb.actions, []);
    assert.deepEqual(sb.calls, []);
  });
}

test('Desktop discovery refuses a non-executable app entry even when the dsh file exists', async (t) => {
  const sb = createSandbox(t);
  fs.chmodSync(sb.appExecutable, 0o644);
  assert.equal((await sb.manager.getDeepseekDesktopStatus()).available, false);
  assertFailure(await sb.manager.mountDeepseekDesktop(sb.exePath), 'desktop_not_found');
  assert.deepEqual(sb.actions, []);
  assert.deepEqual(sb.calls, []);
});

test('Desktop mount does not invoke dsh when local bundle generation fails', async (t) => {
  const sb = createSandbox(t, { localFailure: true });
  assertFailure(await sb.manager.mountDeepseekDesktop(sb.exePath), 'local_bundle_failed');
  assert.deepEqual(sb.calls, []);
  assert.deepEqual(sb.actions, ['process-check', 'install-local']);
});

for (const failure of ['timeout', 'nonzero']) {
  test(`Desktop mount reports a dsh ${failure} without claiming registration`, async (t) => {
    const sb = createSandbox(t, { onRun: () => failure === 'timeout'
      ? { status: null, error: Object.assign(new Error('Fixture timed out'), { code: 'ETIMEDOUT' }), stdout: '', stderr: '' }
      : { status: 1, stdout: '', stderr: 'Fixture package operation failed' } });
    const result = await sb.manager.mountDeepseekDesktop(sb.exePath);
    assertFailure(result, failure === 'timeout' ? 'desktop_install_timeout' : 'desktop_install_failed');
    assert.notEqual(result.registered, true);
    assert.equal(sb.calls.length, 1);
  });
}

test('Desktop installation timeout cancels only its injected child process group', async (t) => {
  const kills = [];
  const sb = createSandbox(t, {
    kill: (pid, signal) => kills.push({ pid, signal }),
    onRun: () => ({
      status: null,
      pid: 271828,
      error: Object.assign(new Error('Fixture timed out'), { code: 'ETIMEDOUT' }),
    }),
  });
  assertFailure(await sb.manager.mountDeepseekDesktop(sb.exePath), 'desktop_install_timeout');
  assert.deepEqual(kills, [{ pid: -271828, signal: 'SIGKILL' }]);
  assert.equal(sb.calls.length, 1);
});

for (const mismatch of ['missing-registration', 'foreign-link']) {
  test(`Desktop mount verifies registration after a successful dsh exit: ${mismatch}`, async (t) => {
    const sb = createSandbox(t, { onRun: ({ register, sandbox }) => {
      if (mismatch === 'foreign-link') register(path.join(sandbox, 'someone-elses-bundle'));
      return { status: 0, stdout: 'Fixture dsh reported success', stderr: '' };
    } });
    const result = await sb.manager.mountDeepseekDesktop(sb.exePath);
    assertFailure(result, 'desktop_registration_mismatch');
    assert.notEqual(result.registered, true);
    assert.equal(sb.calls.length, 1);
  });
}

test('Desktop default process discovery uses the injected runner for ps before dsh', async (t) => {
  const sb = createSandbox(t, { defaultProcessList: true });
  const result = await sb.manager.mountDeepseekDesktop(sb.exePath);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(sb.calls.length, 2);
  assert.equal(sb.calls[0].file, '/bin/ps');
  assert.deepEqual(sb.calls[0].args, ['-axo', 'pid=,comm=']);
  assert.equal(sb.calls[1].file, sb.dshPath);
  assert.deepEqual(sb.actions, ['process-check', 'install-local', 'run-dsh']);
});
