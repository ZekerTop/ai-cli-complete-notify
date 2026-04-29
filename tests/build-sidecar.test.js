const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { resolveSidecarBuild } = require('../tools/build-sidecar');

test('resolves macOS arm64 sidecar name expected by Tauri', () => {
  assert.deepEqual(resolveSidecarBuild('darwin', 'arm64'), {
    pkgTarget: 'node18-macos-arm64',
    outputPath: path.join('src-tauri', 'binaries', 'ai-reminder-aarch64-apple-darwin'),
  });
});

test('resolves Windows x64 sidecar name with exe extension', () => {
  assert.deepEqual(resolveSidecarBuild('win32', 'x64'), {
    pkgTarget: 'node18-win-x64',
    outputPath: path.join('src-tauri', 'binaries', 'ai-reminder-x86_64-pc-windows-msvc.exe'),
  });
});
