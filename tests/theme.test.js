const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('theme modes resolve, persist and tolerate unavailable storage', () => {
  let saved = null;
  const root = { dataset: {}, style: {} };
  const context = {
    exports: {}, document: { documentElement: root },
    localStorage: { getItem: () => saved, setItem: (_, value) => { saved = value; } },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src-ui/lib/theme.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, context);
  const { readTheme, saveTheme, applyTheme } = context.exports;
  assert.equal(readTheme(), 'system');
  for (const mode of ['light', 'dark', 'system']) {
    saveTheme(mode);
    assert.equal(readTheme(), mode);
    for (const dark of [false, true]) {
      applyTheme(mode, dark);
      const expected = mode === 'system' ? (dark ? 'dark' : 'light') : mode;
      assert.equal(root.dataset.theme, expected);
      assert.equal(root.style.colorScheme, expected);
    }
  }
  saved = 'invalid';
  assert.equal(readTheme(), 'system');
  context.localStorage.getItem = () => { throw new Error('blocked'); };
  context.localStorage.setItem = () => { throw new Error('blocked'); };
  assert.equal(readTheme(), 'system');
  assert.doesNotThrow(() => saveTheme('light'));
});
