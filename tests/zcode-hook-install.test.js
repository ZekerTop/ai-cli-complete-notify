const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const cliPath = path.join(projectRoot, 'ai-reminder.js');

function createSandbox(t) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-notify-zcode-hooks-'));
  t.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));
  const home = path.join(sandbox, 'home');
  const zcodeDir = path.join(sandbox, 'zcode-cli');
  fs.mkdirSync(home, { recursive: true });
  return { sandbox, home, zcodeDir };
}

function cliEnv(sb) {
  return {
    ...process.env,
    HOME: sb.home,
    USERPROFILE: sb.home,
    ZCODE_CONFIG_DIR: sb.zcodeDir
  };
}

function configPath(sb) {
  return path.join(sb.zcodeDir, 'config.json');
}

function readConfig(sb) {
  return JSON.parse(fs.readFileSync(configPath(sb), 'utf8'));
}

function runHooks(sb, ...args) {
  return spawnSync(process.execPath, [cliPath, 'hooks', ...args], {
    cwd: projectRoot,
    env: cliEnv(sb),
    encoding: 'utf8'
  });
}

function isOurHook(hook) {
  return Boolean(
    hook
    && Array.isArray(hook.args)
    && hook.args.includes('--from-hook')
    && hook.args.includes('--source')
    && hook.args[hook.args.indexOf('--source') + 1] === 'zcode'
  );
}

function ourStopBlocks(config) {
  const stop = config.hooks && config.hooks.events && config.hooks.events.Stop;
  if (!Array.isArray(stop)) return [];
  return stop.filter((block) => block
    && Array.isArray(block.hooks)
    && block.hooks.some(isOurHook));
}

function expectedOurArgs() {
  return [cliPath, 'notify', '--source', 'zcode', '--from-hook'];
}

function seedConfig(sb, config) {
  fs.mkdirSync(sb.zcodeDir, { recursive: true });
  fs.writeFileSync(configPath(sb), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function mixedExistingConfig() {
  return {
    theme: 'dark',
    custom: { nested: { keep: true } },
    hooks: {
      timeoutMs: 20000,
      unknownField: 'keep-me',
      events: {
        PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] }],
        Stop: [
          { matcher: 'keep', hooks: [{ type: 'command', command: 'echo third-party' }] },
          { hooks: [{ type: 'process', command: 'other-tool', args: ['other-tool', 'watch'] }] },
          { hooks: [{ type: 'process', command: 'old-node', args: ['old.js', 'notify', '--source', 'zcode', '--from-hook', '--force'] }] }
        ]
      }
    }
  };
}

test('zcode hooks install writes a fresh user-level config with an enabled process Stop hook', (t) => {
  const sb = createSandbox(t);

  const result = runHooks(sb, 'install', '--target', 'zcode');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /已安装 zcode 集成/);

  const config = readConfig(sb);
  assert.equal(config.hooks.enabled, true, 'ZCode disables config-file hooks by default; install must enable the runner');

  assert.deepEqual(config.hooks.events.UserPromptSubmit[0].hooks[0].args, expectedOurArgs());
  const blocks = ourStopBlocks(config);
  assert.equal(blocks.length, 1);
  const hook = blocks[0].hooks.find(isOurHook);
  assert.equal(hook.type, 'process', 'Stop handler must be a shell-free process hook');
  assert.equal(hook.command, process.execPath);
  assert.deepEqual(hook.args, expectedOurArgs());
});

test('zcode hooks install merges into an existing config and preserves unrelated values', (t) => {
  const sb = createSandbox(t);
  seedConfig(sb, mixedExistingConfig());

  const result = runHooks(sb, 'install', '--target', 'zcode');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const config = readConfig(sb);

  assert.equal(config.theme, 'dark');
  assert.deepEqual(config.custom, { nested: { keep: true } });
  assert.equal(config.hooks.timeoutMs, 20000);
  assert.equal(config.hooks.unknownField, 'keep-me');
  assert.deepEqual(config.hooks.events.PreToolUse, [
    { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] }
  ]);

  const stop = config.hooks.events.Stop;
  assert.deepEqual(stop[0], { matcher: 'keep', hooks: [{ type: 'command', command: 'echo third-party' }] });
  assert.deepEqual(stop[1], { hooks: [{ type: 'process', command: 'other-tool', args: ['other-tool', 'watch'] }] });

  const blocks = ourStopBlocks(config);
  assert.equal(blocks.length, 1, 'a stale handler from this tool is replaced, third-party hooks kept');
  assert.deepEqual(blocks[0].hooks.find(isOurHook).args, expectedOurArgs());
});

test('zcode hooks install is idempotent', (t) => {
  const sb = createSandbox(t);
  seedConfig(sb, mixedExistingConfig());

  assert.equal(runHooks(sb, 'install', '--target', 'zcode').status, 0);
  const first = fs.readFileSync(configPath(sb), 'utf8');
  assert.equal(runHooks(sb, 'install', '--target', 'zcode').status, 0);
  assert.equal(fs.readFileSync(configPath(sb), 'utf8'), first);
  assert.equal(ourStopBlocks(readConfig(sb)).length, 1);
});

test('zcode hooks install enables a hooks runner the user had disabled', (t) => {
  const sb = createSandbox(t);
  seedConfig(sb, { hooks: { enabled: false, events: {} } });

  assert.equal(runHooks(sb, 'install', '--target', 'zcode').status, 0);
  assert.equal(readConfig(sb).hooks.enabled, true);
});

test('zcode hooks status reports installation state and runner flag', (t) => {
  const sb = createSandbox(t);

  const before = runHooks(sb, 'status');
  assert.equal(before.status, 0, before.stderr || before.stdout);
  const beforeStatus = JSON.parse(before.stdout).zcode;
  assert.equal(beforeStatus.installed, false);
  assert.equal(beforeStatus.settingsPath, configPath(sb));

  assert.equal(runHooks(sb, 'install', '--target', 'zcode').status, 0);
  const after = JSON.parse(runHooks(sb, 'status').stdout).zcode;
  assert.equal(after.installed, true);
  assert.equal(after.hooksEnabled, true);

  const legacy = readConfig(sb);
  delete legacy.hooks.events.UserPromptSubmit;
  seedConfig(sb, legacy);
  assert.equal(JSON.parse(runHooks(sb, 'status').stdout).zcode.installed, false, 'Old Stop-only installs need upgrading');
  assert.equal(runHooks(sb, 'install', '--target', 'zcode').status, 0);

  const seeded = readConfig(sb);
  seeded.hooks.enabled = false;
  seedConfig(sb, seeded);
  const inert = JSON.parse(runHooks(sb, 'status').stdout).zcode;
  assert.equal(inert.installed, true);
  assert.equal(inert.hooksEnabled, false, 'installed but inert when the runner is off');
});

test('zcode hooks uninstall removes only this tool\'s Stop handler', (t) => {
  const sb = createSandbox(t);
  seedConfig(sb, mixedExistingConfig());
  assert.equal(runHooks(sb, 'install', '--target', 'zcode').status, 0);

  const result = runHooks(sb, 'uninstall', '--target', 'zcode');
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /已卸载 zcode 集成/);

  const config = readConfig(sb);
  assert.equal(config.theme, 'dark');
  assert.deepEqual(config.custom, { nested: { keep: true } });
  assert.equal(config.hooks.timeoutMs, 20000);
  assert.deepEqual(config.hooks.events.PreToolUse, [
    { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] }
  ]);
  assert.deepEqual(config.hooks.events.Stop, [
    { matcher: 'keep', hooks: [{ type: 'command', command: 'echo third-party' }] },
    { hooks: [{ type: 'process', command: 'other-tool', args: ['other-tool', 'watch'] }] }
  ]);
  assert.equal(config.hooks.enabled, true, 'uninstall must not touch the runner switch');
});

test('zcode hooks uninstall on a plain install leaves no Stop entry behind', (t) => {
  const sb = createSandbox(t);
  assert.equal(runHooks(sb, 'install', '--target', 'zcode').status, 0);

  assert.equal(runHooks(sb, 'uninstall', '--target', 'zcode').status, 0);
  const config = readConfig(sb);
  assert.equal(config.hooks.events && config.hooks.events.Stop, undefined);
  assert.equal(config.hooks.events && config.hooks.events.UserPromptSubmit, undefined);
  assert.equal(ourStopBlocks(config).length, 0);
});

test('zcode hooks preview prints the config that would be written without side effects', (t) => {
  const sb = createSandbox(t);

  const result = runHooks(sb, 'preview', '--target', 'zcode');
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const preview = JSON.parse(result.stdout);
  assert.equal(preview.hooks.enabled, true);
  const hook = preview.hooks.events.Stop[0].hooks[0];
  assert.equal(hook.type, 'process');
  assert.deepEqual(hook.args, expectedOurArgs());

  assert.equal(fs.existsSync(configPath(sb)), false, 'preview must not write anything');
});

test('zcode installation never touches the default config location under HOME', (t) => {
  const sb = createSandbox(t);
  assert.equal(runHooks(sb, 'install', '--target', 'zcode').status, 0);
  assert.equal(runHooks(sb, 'uninstall', '--target', 'zcode').status, 0);
  assert.equal(fs.existsSync(path.join(sb.home, '.zcode')), false);
});

test('zcode hooks install refuses to clobber a corrupt config file', (t) => {
  const sb = createSandbox(t);
  seedConfig(sb, {});
  fs.writeFileSync(configPath(sb), '{ this is not json', 'utf8');

  const result = runHooks(sb, 'install', '--target', 'zcode');
  assert.equal(result.status, 1);
  assert.match(result.stderr + result.stdout, /not valid JSON/);
  assert.equal(fs.readFileSync(configPath(sb), 'utf8'), '{ this is not json', 'the corrupt file must be left untouched');
});

test('zcode hook detection never claims another source\'s command hook', (t) => {
  const sb = createSandbox(t);
  const foreignOurMarker = "node ai-reminder.js notify --source claude --from-hook --force";
  seedConfig(sb, {
    hooks: {
      events: {
        Stop: [
          { hooks: [{ type: 'command', command: foreignOurMarker }] },
          { hooks: [{ type: 'command', command: 'echo keep' }] }
        ]
      }
    }
  });

  assert.equal(runHooks(sb, 'install', '--target', 'zcode').status, 0);
  let stop = readConfig(sb).hooks.events.Stop;
  assert.equal(ourStopBlocks(readConfig(sb)).length, 1, 'our process hook is added');
  assert.ok(stop.some((block) => block.hooks.some((hook) => hook.command === foreignOurMarker)),
    'a marker hook for a different source is not treated as ours');

  assert.equal(runHooks(sb, 'uninstall', '--target', 'zcode').status, 0);
  stop = readConfig(sb).hooks.events.Stop;
  assert.deepEqual(stop, [
    { hooks: [{ type: 'command', command: foreignOurMarker }] },
    { hooks: [{ type: 'command', command: 'echo keep' }] }
  ]);
});

test('zcode appears in CLI help and in the valid hook targets', (t) => {
  const sb = createSandbox(t);

  const help = spawnSync(process.execPath, [cliPath], {
    cwd: projectRoot,
    env: cliEnv(sb),
    encoding: 'utf8'
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--target claude\|gemini\|opencode\|herdr\|zcode/);
  assert.match(help.stdout, /claude \/ codex \/ opencode \/ gemini \/ herdr \/ zcode/);

  const invalid = runHooks(sb, 'install', '--target', 'nope');
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr + invalid.stdout, /zcode/);
});
