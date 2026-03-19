const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function prependPath(env, value) {
  const current = env.PATH || env.Path || '';
  env.PATH = `${value}${path.delimiter}${current}`;
  env.Path = env.PATH;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveWindowsRustEnv(rootDir) {
  const env = { ...process.env };

  if (process.platform !== 'win32') {
    return env;
  }

  const candidateCargoHome = [
    env.CARGO_HOME,
    'D:\\cargo',
    path.join(process.env.USERPROFILE || '', '.cargo')
  ].filter(Boolean);
  const candidateRustupHome = [
    env.RUSTUP_HOME,
    'D:\\rustup',
    path.join(process.env.USERPROFILE || '', '.rustup')
  ].filter(Boolean);

  const cargoHome = candidateCargoHome.find((dir) =>
    fs.existsSync(path.join(dir, 'bin', 'cargo.exe'))
  );
  const rustupHome = candidateRustupHome.find((dir) => fs.existsSync(dir));

  if (!cargoHome) {
    throw new Error(
      'Rust toolchain not found. Install Rust or set CARGO_HOME so `cargo.exe` is available.'
    );
  }

  env.CARGO_HOME = cargoHome;
  if (rustupHome) {
    env.RUSTUP_HOME = rustupHome;
  }
  prependPath(env, path.join(cargoHome, 'bin'));

  const tempDir = env.AI_NOTIFY_TMP_DIR || 'D:\\tmp';
  ensureDir(tempDir);
  env.TEMP = tempDir;
  env.TMP = tempDir;

  const npmCacheDir = env.npm_config_cache || 'D:\\npm-cache';
  ensureDir(npmCacheDir);
  env.npm_config_cache = npmCacheDir;

  return env;
}

function main() {
  const rootDir = path.join(__dirname, '..');
  const args = process.argv.slice(2);

  let env;
  try {
    env = resolveWindowsRustEnv(rootDir);
  } catch (error) {
    console.error(`[tauri-build] ${error.message}`);
    process.exit(1);
  }

  const result = spawnSync('npx', ['tauri', 'build', ...args], {
    cwd: rootDir,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  console.error('[tauri-build] Failed to start Tauri build process.');
  process.exit(1);
}

main();
