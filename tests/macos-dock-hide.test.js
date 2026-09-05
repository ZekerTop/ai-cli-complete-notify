const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('set_dock_hidden command is registered in invoke_handler', () => {
  const rustSource = fs.readFileSync(
    path.join(root, 'src-tauri', 'src', 'lib.rs'),
    'utf8'
  );

  assert.match(rustSource, /fn set_dock_hidden\(/, 'set_dock_hidden function must exist');
  assert.match(rustSource, /set_dock_hidden,/, 'set_dock_hidden must be registered in invoke_handler');
});

test('apply_dock_policy is cfg-gated to macOS only', () => {
  const rustSource = fs.readFileSync(
    path.join(root, 'src-tauri', 'src', 'lib.rs'),
    'utf8'
  );

  assert.match(
    rustSource,
    /#\[cfg\(target_os = "macos"\)\]\s*fn apply_dock_policy/,
    'apply_dock_policy must be macOS-only'
  );
});

test('startup applies initial dock policy from settings', () => {
  const rustSource = fs.readFileSync(
    path.join(root, 'src-tauri', 'src', 'lib.rs'),
    'utf8'
  );

  assert.match(rustSource, /read_hide_dock_icon_setting\(\)/, 'must read hideDockIcon on startup');
  assert.match(rustSource, /apply_dock_policy\(hide_dock\)/, 'must apply policy on startup');
});

test('setDockHidden is exported from window.ts and invokes set_dock_hidden', () => {
  const windowSource = fs.readFileSync(
    path.join(root, 'src-ui', 'lib', 'window.ts'),
    'utf8'
  );

  assert.match(windowSource, /export function setDockHidden/, 'setDockHidden must be exported');
  assert.match(windowSource, /invoke.*set_dock_hidden/, 'must invoke set_dock_hidden command');
});

test('AppConfig.ui includes hideDockIcon boolean field', () => {
  const typesSource = fs.readFileSync(
    path.join(root, 'src-ui', 'lib', 'types.ts'),
    'utf8'
  );

  assert.match(typesSource, /hideDockIcon:\s*boolean/, 'hideDockIcon must be typed as boolean');
});

test('default config sets hideDockIcon to false', () => {
  const defaultConfig = require(path.join(root, 'src', 'default-config.js'));

  assert.strictEqual(
    defaultConfig.DEFAULT_CONFIG.ui.hideDockIcon,
    false,
    'hideDockIcon default must be false'
  );
});

test('AdvancedPanel imports setDockHidden and uses hideDockIcon config', () => {
  const panelSource = fs.readFileSync(
    path.join(root, 'src-ui', 'components', 'AdvancedPanel.tsx'),
    'utf8'
  );

  assert.match(panelSource, /import.*setDockHidden.*from.*window/, 'must import setDockHidden');
  assert.match(panelSource, /config\.ui\.hideDockIcon/, 'must use config.ui.hideDockIcon');
  assert.match(panelSource, /setDockHidden\(/, 'must call setDockHidden on change');
});

test('i18n keys exist in zh-CN and en', () => {
  const zhSource = fs.readFileSync(
    path.join(root, 'src-ui', 'i18n', 'zh-CN.json'),
    'utf8'
  );
  const enSource = fs.readFileSync(
    path.join(root, 'src-ui', 'i18n', 'en.json'),
    'utf8'
  );

  assert.match(zhSource, /"advanced\.hideDockIcon"/, 'zh-CN must have hideDockIcon key');
  assert.match(zhSource, /"advanced\.hideDockIconHint"/, 'zh-CN must have hideDockIconHint key');
  assert.match(enSource, /"advanced\.hideDockIcon"/, 'en must have hideDockIcon key');
  assert.match(enSource, /"advanced\.hideDockIconHint"/, 'en must have hideDockIconHint key');
});
