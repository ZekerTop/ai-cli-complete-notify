const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createHash } = require('node:crypto');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function loadUiModule(relativePath, language = 'en', overrides = {}) {
  const translations = JSON.parse(fs.readFileSync(path.join(root, 'src-ui/i18n', `${language}.json`), 'utf8'));
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'react-i18next') return { useTranslation: () => ({
      t: (key, values = {}) => (translations[key] || key).replace(/\{\{(\w+)\}\}/g, (_, name) => values[name]),
      i18n: { exists: (key) => Object.hasOwn(translations, key) },
    }) };
    if (name === '@tauri-apps/plugin-dialog') return { message: () => { throw new Error('UI rendering must not open a dialog'); } };
    if (name === '@/lib/sidecar') return { sidecar: () => { throw new Error('UI rendering must not run a sidecar'); } };
    if (name === '@/lib/types') return loadUiModule('src-ui/lib/types.ts', language, overrides);
    if (name === './ui/Panel') return { default: ({ children }) => React.createElement('section', null, children) };
    if (name === './ui/SourceLogo') return loadUiModule('src-ui/components/ui/SourceLogo.tsx', language, overrides);
    if (name.startsWith('@/assets/')) return { default: path.basename(name) };
    return require(name);
  };
  new Function('require', 'module', 'exports', outputText)(localRequire, module, module.exports);
  return module.exports;
}

function hooksProps(installed, desktop) {
  return {
    config: { ui: { notificationMode: 'hooks' } },
    onUpdate: () => {},
    hooks: {
      status: { deepseek: {
        installed,
        settingsPath: '/fixture/deepseek-plugin/index.js',
        pluginDir: '/fixture/deepseek-plugin',
        requiresManualInstall: true,
        installCommand: 'dsh plugin --profile YOUR_PROFILE add /fixture/deepseek-plugin',
        removeCommand: 'dsh plugin --profile YOUR_PROFILE remove ai-cli-complete-notify-deepseek-plugin',
        instructions: 'Register the generated files in the actual Harness profile.',
        ...(desktop ? { desktop } : {}),
      } },
      preview: '',
      refreshStatus: async () => null,
      refreshPreview: async () => {},
      install: async () => { throw new Error('Rendering must not install plugins'); },
      uninstall: async () => { throw new Error('Rendering must not uninstall plugins'); },
      mount: async () => { throw new Error('Rendering must not mount plugins'); },
    },
  };
}

function renderHooks(installed, language, desktop, message = '') {
  const overrides = message ? {
    react: {
      useEffect: () => {},
      useState: (initial) => [initial && typeof initial.deepseek === 'string' ? { ...initial, deepseek: message } : initial, () => {}],
    },
  } : {};
  const HooksPanel = loadUiModule('src-ui/components/HooksPanel.tsx', language, overrides).default;
  return renderToStaticMarkup(React.createElement(HooksPanel, hooksProps(installed, desktop)));
}

test('integration details are collapsed and a saved Watch mode is visible above them', () => {
  const titles = ['Claude Code', 'Codex', 'Gemini CLI', 'ZCode', 'OpenCode', 'DeepSeek Harness'];
  const keys = ['claude', 'codex', 'gemini', 'zcode', 'opencode', 'deepseek'];
  for (const language of ['en', 'zh-CN']) {
    const labels = JSON.parse(fs.readFileSync(path.join(root, 'src-ui/i18n', `${language}.json`), 'utf8'));
    const props = hooksProps(true, { available: true, registered: true, activation: 'unknown' });
    props.config.ui.notificationMode = 'watch';
    props.onUpdate = () => assert.fail('Rendering must preserve the saved notification mode');
    for (const key of keys.slice(0, -1)) {
      props.hooks.status[key] = { installed: true, settingsPath: `/fixture/${key}/config` };
    }
    props.hooks.preview = 'Fixture command for the preview';
    const HooksPanel = loadUiModule('src-ui/components/HooksPanel.tsx', language).default;
    const html = renderToStaticMarkup(React.createElement(HooksPanel, props));
    const details = [...html.matchAll(/<details\b([^>]*)>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)];
    assert.equal(details.length, 8);
    for (const detail of details) assert.doesNotMatch(detail[1], /\bopen(?:=|\s|$)/);
    assert.ok(details[0][2].includes(labels['hooks.mode.watch']));
    assert.ok(!details[0][2].includes(labels['hooks.mode.hooks']));
    assert.match(details[0][3], /<input\b[^>]*type="radio"(?=[^>]*\bchecked="")(?=[^>]*\bvalue="watch")[^>]*>/);
    const { SOURCES } = loadUiModule('src-ui/lib/types.ts', language);
    keys.forEach((key, index) => {
      const detail = details[index + 1];
      const start = index === 0 ? details[0].index + details[0][0].length : details[index].index + details[index][0].length;
      const card = html.slice(start, detail.index);
      assert.ok(card.includes(titles[index]));
      assert.ok(card.includes(`src="${SOURCES.find(source => source.key === key).logo}"`));
      assert.ok(detail[2].includes(labels['hooks.configDetails']));
      assert.ok(detail[3].includes(props.hooks.status[key].settingsPath));
      assert.ok(!card.includes(props.hooks.status[key].settingsPath));
      if (key === 'codex') assert.ok(detail[3].includes(labels['hooks.codex.trustHint']));
      if (key === 'deepseek') assert.ok(card.includes(labels['hooks.deepseek.desktopRegistered']));
    });
    assert.ok(details.at(-1)[2].includes(labels['hooks.configPreview']));
    assert.ok(details.at(-1)[3].includes(props.hooks.preview));
  }
});

test('the mode picker allows switching back to hybrid without changing other settings', () => {
  const HooksPanel = loadUiModule('src-ui/components/HooksPanel.tsx', 'en', {
    react: { useEffect: () => {}, useState: (initial) => [initial, () => {}] },
  }).default;
  const props = hooksProps(false);
  props.config = { ui: { notificationMode: 'watch', language: 'en' }, sources: { codex: { enabled: true } } };
  let updated;
  props.onUpdate = update => { updated = update(props.config); };
  const inputs = [];
  function collect(node) {
    if (Array.isArray(node)) return node.forEach(collect);
    if (!node || typeof node !== 'object') return;
    if (node.type === 'input' && node.props.type === 'radio') inputs.push(node.props);
    collect(node.props?.children);
  }
  collect(HooksPanel(props));
  assert.equal(updated, undefined);
  const hybrid = inputs.find(input => input.value === 'hooks');
  assert.ok(hybrid && !hybrid.checked);
  hybrid.onChange({ target: { checked: true, value: 'hooks' } });
  assert.deepEqual(updated, { ...props.config, ui: { ...props.config.ui, notificationMode: 'hooks' } });
  assert.equal(props.config.ui.notificationMode, 'watch');
});

test('DeepSeek has its own disabled source, channels, label and official logo', () => {
  const { DEFAULT_CONFIG } = require('../src/default-config');
  const { getSourceLabel } = require('../src/format');
  const source = DEFAULT_CONFIG.sources.deepseek;
  assert.equal(source.enabled, false);
  assert.equal(source.minDurationMinutes, 0);
  assert.deepEqual(source.webhookUrls, []);
  assert.deepEqual(source.channels, DEFAULT_CONFIG.sources.zcode.channels);
  assert.equal(getSourceLabel('deepseek'), 'DeepSeek Harness');
  const { SOURCES } = loadUiModule('src-ui/lib/types.ts');
  assert.equal(SOURCES.find(item => item.key === 'deepseek').logo, 'deepseek.svg');
  const logo = fs.readFileSync(path.join(root, 'src-ui/assets/sources/deepseek.svg'));
  const blobHash = createHash('sha1').update(`blob ${logo.length}\0`).update(logo).digest('hex');
  assert.equal(blobHash, '754615a37acaf1d24973b4e757ccdb16b9b8f003');
});

test('DeepSeek plugin UI distinguishes generated files and keeps manual setup available', () => {
  for (const language of ['en', 'zh-CN']) {
    const text = JSON.parse(fs.readFileSync(path.join(root, 'src-ui/i18n', `${language}.json`), 'utf8'));
    const empty = renderHooks(false, language);
    const generated = renderHooks(true, language);
    assert.ok(empty.includes(text['hooks.deepseek.notGenerated']));
    assert.ok(empty.includes(text['hooks.deepseek.generate']));
    assert.ok(!empty.includes(text['hooks.openFile']));
    assert.ok(generated.includes(text['hooks.deepseek.generated']));
    assert.ok(generated.includes(text['hooks.deepseek.manualHint']));
    assert.ok(generated.includes(text['hooks.openFile']));
    const updateButton = generated.match(/<button\b[^>]*>[^<]*<\/button>/g)
      .find(button => button.includes(text['hooks.deepseek.update']));
    assert.ok(updateButton, 'A generated bundle must remain updateable');
    assert.doesNotMatch(updateButton, /\bdisabled=/);
    assert.ok(generated.includes(text['hooks.deepseek.remove']));
  }
});

test('Desktop mount is available only when detected and registered files cannot be removed', () => {
  for (const language of ['en', 'zh-CN']) {
    const text = JSON.parse(fs.readFileSync(path.join(root, 'src-ui/i18n', `${language}.json`), 'utf8'));
    const manual = renderHooks(true, language, { available: false, registered: null, activation: 'unknown' });
    assert.ok(!manual.includes(`>${text['hooks.deepseek.mount']}<`));
    assert.ok(manual.includes(text['hooks.deepseek.update']));
    const ready = renderHooks(false, language, { available: true, registered: false, activation: 'unknown' });
    assert.ok(ready.includes(text['hooks.deepseek.mount']));
    assert.ok(ready.includes(text['hooks.deepseek.generate']));
    assert.ok(ready.includes(text['hooks.deepseek.desktopHint']));
    const registered = renderHooks(true, language, { available: true, registered: true, activation: 'unknown' });
    assert.ok(registered.includes(text['hooks.deepseek.mountUpdate']));
    assert.ok(registered.includes(text['hooks.deepseek.desktopRegistered']));
    const remove = registered.match(/<button\b[^>]*>[^<]*<\/button>/g)
      .find(button => button.includes(text['hooks.deepseek.remove']));
    assert.match(remove, /\bdisabled=/);
    assert.ok(remove.includes(`title="${text['hooks.deepseek.removeBlocked']}"`));
    assert.ok(!registered.replace(/<[^>]*>/g, '').includes(text['hooks.deepseek.removeBlocked']));
    const unknown = renderHooks(true, language, { available: true, registered: null, activation: 'unknown' });
    assert.ok(unknown.includes(text['hooks.deepseek.desktopUnknown']));
    assert.ok(!unknown.replace(/<details\b[\s\S]*?<\/details>/g, '').includes(text['hooks.deepseek.desktopHint']));
  }
});

test('DeepSeek cards use green registered, amber generated and gray missing badges with one replaceable hint', () => {
  const badgeClass = (html, label) => {
    const badge = html.match(/<div class="[^"]+">[^<]*<\/div>/g).find(item => item.endsWith(`>${label}</div>`));
    assert.ok(badge, label);
    return badge.match(/class="([^"]+)"/)[1];
  };
  for (const language of ['en', 'zh-CN']) {
    const text = JSON.parse(fs.readFileSync(path.join(root, 'src-ui/i18n', `${language}.json`), 'utf8'));
    const desktop = { available: true, registered: true, activation: 'unknown' };
    const registered = renderHooks(true, language, desktop);
    const incomplete = renderHooks(false, language, desktop);
    const generated = renderHooks(true, language, { ...desktop, registered: false });
    const empty = renderHooks(false, language, { ...desktop, registered: false });
    assert.ok(badgeClass(registered, text['hooks.deepseek.registered']).includes('text-[rgba(139,219,166,0.92)]'));
    assert.ok(badgeClass(incomplete, text['hooks.deepseek.needsRepair']).includes('text-amber-200'));
    assert.ok(incomplete.includes(text['hooks.deepseek.repairMount']));
    assert.ok(incomplete.includes(text['hooks.deepseek.mountUpdate']));
    assert.ok(!incomplete.includes(text['hooks.deepseek.desktopRegistered']));
    assert.ok(!incomplete.includes(text['hooks.openFile']));
    assert.ok(!incomplete.includes(text['hooks.deepseek.remove']));
    const incompleteManual = renderHooks(false, language, { ...desktop, available: false });
    assert.ok(incompleteManual.includes(text['hooks.deepseek.repairLocal']));
    assert.ok(incompleteManual.includes(text['hooks.deepseek.update']));
    assert.ok(badgeClass(generated, text['hooks.deepseek.generated']).includes('text-amber-200'));
    assert.ok(badgeClass(empty, text['hooks.deepseek.notGenerated']).includes('text-muted'));
    const visibleRegistered = registered.replace(/<details\b[\s\S]*?<\/details>/g, '');
    assert.equal(visibleRegistered.split(text['hooks.deepseek.desktopRegistered']).length - 1, 1);
    assert.ok(!visibleRegistered.includes(text['hooks.deepseek.desktopHint']));
    assert.ok(!visibleRegistered.includes(text['hooks.deepseek.manualHint']));
    const error = text['hooks.deepseek.error.desktop_running'];
    const failed = renderHooks(true, language, desktop, error);
    const visibleFailed = failed.replace(/<details\b[\s\S]*?<\/details>/g, '');
    assert.equal(visibleFailed.split(error).length - 1, 1);
    assert.ok(!visibleFailed.includes(text['hooks.deepseek.desktopRegistered']));
    assert.ok(!visibleFailed.includes(text['hooks.deepseek.desktopHint']));
    assert.ok(visibleFailed.includes('role="status"'));
  }
});

test('DeepSeek command preview uses the display language and disables file opening until generated', () => {
  for (const [language, instructions] of [
    ['en', 'Replace YOUR_PROFILE with your Harness profile.'],
    ['zh-CN', '将 YOUR_PROFILE 替换为实际使用的 Harness profile。'],
  ]) {
    const HooksPanel = loadUiModule('src-ui/components/HooksPanel.tsx', language, {
      react: {
        useEffect: () => {},
        useState: (initial) => [initial === 'claude' ? 'deepseek' : initial, () => {}],
      },
    }).default;
    const props = hooksProps(false);
    const html = renderToStaticMarkup(React.createElement(HooksPanel, props));
    const commandPreview = html.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/)[1];
    assert.ok(commandPreview.includes(instructions));
    assert.ok(commandPreview.includes(props.hooks.status.deepseek.installCommand));
    assert.ok(commandPreview.includes(props.hooks.status.deepseek.removeCommand));
    if (language === 'en') assert.doesNotMatch(commandPreview, /[\u4e00-\u9fff]/);
    const text = JSON.parse(fs.readFileSync(path.join(root, 'src-ui/i18n', `${language}.json`), 'utf8'));
    assert.ok(!html.includes(text['hooks.openFile']));
  }
});

test('opening a generated DeepSeek file surfaces a sidecar error and refreshes bundle status', async (t) => {
  const calls = [];
  const HooksPanel = loadUiModule('src-ui/components/HooksPanel.tsx', 'en', {
    react: { useEffect: () => {}, useState: (initial) => [initial, () => {}] },
    '@/lib/sidecar': { sidecar: async (args) => {
      calls.push(args);
      return { code: 1, stderr: 'file was deleted' };
    } },
    '@tauri-apps/plugin-dialog': { message: async (text, options) => calls.push([text, options.kind]) },
  }).default;
  t.mock.method(console, 'error', () => {});
  const props = hooksProps(true);
  props.hooks.refreshStatus = async () => calls.push('status');
  const buttons = [];
  function collect(node) {
    if (Array.isArray(node)) return node.forEach(collect);
    if (!node || typeof node !== 'object') return;
    if (node.type === 'button') buttons.push(node.props);
    collect(node.props?.children);
  }
  collect(HooksPanel(props));
  const labels = require('../src-ui/i18n/en.json');
  const open = buttons.find(button => button.children === labels['hooks.openFile']);
  assert.ok(open);
  await open.onClick();
  assert.deepEqual(calls, [
    ['open-file', props.hooks.status.deepseek.settingsPath, '--text'],
    'status',
    [labels['hooks.deepseek.openFail'], 'error'],
  ]);
});

test('opening integration refreshes status so newly initialized Desktop is detected', () => {
  const effects = [];
  const calls = [];
  const HooksPanel = loadUiModule('src-ui/components/HooksPanel.tsx', 'en', {
    react: { useState: (value) => [value, () => {}], useEffect: (effect) => effects.push(effect) },
  }).default;
  const props = hooksProps(true);
  props.hooks.refreshStatus = async () => { calls.push('status'); };
  props.hooks.refreshPreview = async (target) => { calls.push(target); };
  HooksPanel(props);
  effects.forEach(effect => effect());
  assert.deepEqual(calls, ['claude', 'status']);
});

test('mount uses the sidecar JSON result and refreshes status without running real Harness', async () => {
  for (const reply of [
    { code: 0, body: { ok: true, registered: true, activation: 'unknown', requiresRestart: true } },
    { code: 1, body: { ok: false, errorCode: 'desktop_running', error: 'fixture process is running' } },
  ]) {
    const calls = [];
    const { useHooks } = loadUiModule('src-ui/hooks/useHooks.ts', 'en', {
      react: { useState: () => [null, () => {}], useCallback: (fn) => fn },
      '@/lib/sidecar': { sidecar: async (args) => {
        calls.push(args);
        return args[1] === 'status'
          ? { code: 0, stdout: '{}', stderr: '' }
          : { code: reply.code, stdout: JSON.stringify(reply.body), stderr: '' };
      } },
    });
    const result = await useHooks().mount('deepseek');
    assert.deepEqual(calls, [['hooks', 'mount', '--target', 'deepseek', '--json'], ['hooks', 'status']]);
    assert.equal(result.ok, reply.code === 0);
    assert.equal(result.errorCode, reply.body.errorCode);
    if (!result.ok) assert.equal(result.output, reply.body.error);
  }
});

test('DeepSeek removal preserves backend protection codes and other hook calls keep their arguments', async () => {
  const calls = [];
  const { useHooks } = loadUiModule('src-ui/hooks/useHooks.ts', 'en', {
    react: { useState: () => [null, () => {}], useCallback: (fn) => fn },
    '@/lib/sidecar': { sidecar: async (args) => {
      calls.push(args);
      if (args[1] === 'status') return { code: 0, stdout: '{}', stderr: '' };
      return args.at(-1) === '--json'
        ? { code: 1, stdout: JSON.stringify({ ok: false, errorCode: 'deepseek_bundle_registered', error: 'fixture plugin is registered' }), stderr: '' }
        : { code: 0, stdout: 'uninstalled', stderr: '' };
    } },
  });
  const hooks = useHooks();
  const result = await hooks.uninstall('deepseek');
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'deepseek_bundle_registered');
  assert.equal(result.output, 'fixture plugin is registered');
  assert.equal((await hooks.uninstall('claude')).ok, true);
  assert.deepEqual(calls, [
    ['hooks', 'uninstall', '--target', 'deepseek', '--json'], ['hooks', 'status'],
    ['hooks', 'uninstall', '--target', 'claude'], ['hooks', 'status'],
  ]);
});

test('Desktop mount errors use actionable bilingual messages with a backend fallback', async () => {
  for (const language of ['en', 'zh-CN']) {
    for (const errorCode of ['desktop_running', 'future_backend_error']) {
      const state = [];
      let slot = 0;
      const HooksPanel = loadUiModule('src-ui/components/HooksPanel.tsx', language, {
        react: {
          useEffect: () => {},
          useState: (initial) => {
            const index = slot++;
            state[index] = initial;
            return [initial, (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
          },
        },
      }).default;
      const props = hooksProps(true, { available: true, registered: false, activation: 'unknown' });
      const calls = [];
      props.hooks.mount = async (target) => {
        calls.push(target);
        return { ok: false, errorCode, output: 'fixture mount error' };
      };
      const text = JSON.parse(fs.readFileSync(path.join(root, 'src-ui/i18n', `${language}.json`), 'utf8'));
      const buttons = [];
      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        if (node.type === 'button') buttons.push(node);
        walk(node.props?.children);
      };
      walk(HooksPanel(props));
      const mount = buttons.find(button => button.props.children === text['hooks.deepseek.mount']);
      assert.ok(mount);
      await mount.props.onClick();
      assert.deepEqual(calls, ['deepseek']);
      assert.equal(state[2].deepseek, false);
      if (errorCode === 'desktop_running') {
        assert.equal(state[1].deepseek, text['hooks.deepseek.error.desktop_running']);
        assert.ok(state[1].deepseek.includes('⌘Q'));
      } else {
        assert.ok(state[1].deepseek.includes('fixture mount error'));
      }
    }
  }
});
