const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const TARGETS = {
  'win32:x64': {
    pkgTarget: 'node18-win-x64',
    targetTriple: 'x86_64-pc-windows-msvc',
    extension: '.exe',
  },
  'darwin:x64': {
    pkgTarget: 'node18-macos-x64',
    targetTriple: 'x86_64-apple-darwin',
    extension: '',
  },
  'darwin:arm64': {
    pkgTarget: 'node18-macos-arm64',
    targetTriple: 'aarch64-apple-darwin',
    extension: '',
  },
  'linux:x64': {
    pkgTarget: 'node18-linux-x64',
    targetTriple: 'x86_64-unknown-linux-gnu',
    extension: '',
  },
  'linux:arm64': {
    pkgTarget: 'node18-linux-arm64',
    targetTriple: 'aarch64-unknown-linux-gnu',
    extension: '',
  },
};

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--platform') {
      out.platform = argv[index + 1];
      index += 1;
    } else if (arg === '--arch') {
      out.arch = argv[index + 1];
      index += 1;
    } else if (arg === '--dry-run') {
      out.dryRun = true;
    }
  }
  return out;
}

function resolvePkgBin(rootDir) {
  const binDir = path.join(rootDir, 'node_modules', '.bin');
  const names = process.platform === 'win32'
    ? ['pkg.cmd', 'pkg.exe', 'pkg']
    : ['pkg'];

  for (const name of names) {
    const candidate = path.join(binDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error('pkg not found. Run `npm install` first.');
}

function cleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Required path not found: ${src}`);
  }
  fs.cpSync(src, dest, { recursive: true });
}

function copyRuntimeDependency(rootDir, resourcesDir, name) {
  copyDir(
    path.join(rootDir, 'node_modules', name),
    path.join(resourcesDir, 'ai-reminder', 'node_modules', name)
  );
}

function formatMacEnvExample(content) {
  const windowsPathExample = [
    '# 可选：数据目录/环境文件路径（便于 EXE 版固定存放位置）',
    '# AI_CLI_COMPLETE_NOTIFY_DATA_DIR=C:\\Users\\YourName\\AppData\\Roaming\\ai-cli-complete-notify',
    '# AI_CLI_COMPLETE_NOTIFY_ENV_PATH=C:\\Users\\YourName\\AppData\\Roaming\\ai-cli-complete-notify\\.env'
  ].join('\n');
  const macosPathExample = [
    '# 可选：数据目录/环境文件路径（macOS 打包版默认使用下面这个目录）',
    '# AI_CLI_COMPLETE_NOTIFY_DATA_DIR=/Users/yourname/.ai-cli-complete-notify',
    '# AI_CLI_COMPLETE_NOTIFY_ENV_PATH=/Users/yourname/.ai-cli-complete-notify/.env'
  ].join('\n');

  return content.replace(windowsPathExample, macosPathExample);
}

function writeMacSidecarScript(output) {
  const script = `#!/bin/sh
set -eu

SELF="$0"
while [ -L "$SELF" ]; do
  LINK="$(readlink "$SELF")"
  case "$LINK" in
    /*) SELF="$LINK" ;;
    *) SELF="$(dirname "$SELF")/$LINK" ;;
  esac
done

BIN_DIR="$(CDPATH= cd -- "$(dirname -- "$SELF")" && pwd)"

# Packaged .app: binary is in Contents/MacOS, resources in Contents/Resources
# Dev mode: binary and resources/ are siblings in the same target directory
for BASE in "$BIN_DIR/../Resources/resources" "$BIN_DIR/../Resources" "$BIN_DIR/resources"; do
  NODE_BIN="$BASE/node/bin/node"
  ENTRY="$BASE/ai-reminder/ai-reminder.js"
  if [ -x "$NODE_BIN" ] && [ -f "$ENTRY" ]; then
    export AI_CLI_COMPLETE_NOTIFY_PACKAGED=1
    export AI_CLI_COMPLETE_NOTIFY_DESKTOP_STDOUT=1
    exec "$NODE_BIN" "$ENTRY" "$@"
  fi
done

echo "Unable to locate bundled ai-reminder runtime." >&2
exit 127
`;

  fs.writeFileSync(output, script, 'utf8');
  fs.chmodSync(output, 0o755);
}

function buildMacSidecar(rootDir, output) {
  const resourcesDir = path.join(rootDir, 'src-tauri', 'resources');
  const appResourceDir = path.join(resourcesDir, 'ai-reminder');
  const nodeResourceDir = path.join(resourcesDir, 'node', 'bin');
  const nodePath = fs.realpathSync(process.execPath);

  cleanDir(appResourceDir);
  cleanDir(nodeResourceDir);

  fs.copyFileSync(path.join(rootDir, 'ai-reminder.js'), path.join(appResourceDir, 'ai-reminder.js'));
  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(appResourceDir, 'package.json'));
  fs.writeFileSync(
    path.join(appResourceDir, '.env.example'),
    formatMacEnvExample(fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8')),
    'utf8'
  );
  copyDir(path.join(rootDir, 'src'), path.join(appResourceDir, 'src'));
  fs.mkdirSync(path.join(appResourceDir, 'node_modules'), { recursive: true });
  copyRuntimeDependency(rootDir, resourcesDir, 'dotenv');
  copyRuntimeDependency(rootDir, resourcesDir, 'nodemailer');

  fs.copyFileSync(nodePath, path.join(nodeResourceDir, 'node'));
  fs.chmodSync(path.join(nodeResourceDir, 'node'), 0o755);

  writeMacSidecarScript(output);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.join(__dirname, '..');
  const platform = String(args.platform || process.env.AI_NOTIFY_SIDECAR_PLATFORM || process.platform);
  const arch = String(args.arch || process.env.AI_NOTIFY_SIDECAR_ARCH || process.arch);
  const config = TARGETS[`${platform}:${arch}`];

  if (!config) {
    const supported = Object.keys(TARGETS).join(', ');
    throw new Error(`Unsupported sidecar target: ${platform}:${arch}. Supported: ${supported}`);
  }

  const binariesDir = path.join(rootDir, 'src-tauri', 'binaries');
  const output = path.join(
    binariesDir,
    `ai-reminder-${config.targetTriple}${config.extension}`
  );

  if (args.dryRun) {
    console.log(`[sidecar] dry-run ${platform}:${arch}`);
    if (platform === 'darwin') {
      console.log('[sidecar] strategy: bundled Node.js runtime + shell sidecar');
    } else {
      console.log(`[sidecar] pkg target: ${config.pkgTarget}`);
    }
    console.log(`[sidecar] output: ${path.relative(rootDir, output)}`);
    return;
  }

  if (platform === 'darwin') {
    fs.mkdirSync(binariesDir, { recursive: true });
    buildMacSidecar(rootDir, output);
    console.log(`[sidecar] ${platform}:${arch} -> ${path.relative(rootDir, output)}`);
    return;
  }

  const pkgBin = resolvePkgBin(rootDir);

  fs.mkdirSync(binariesDir, { recursive: true });

  const result = spawnSync(
    pkgBin,
    ['ai-reminder.js', '--target', config.pkgTarget, '-o', output],
    {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32' && pkgBin.endsWith('.cmd'),
    }
  );

  if (typeof result.status === 'number') {
    if (result.status === 0) {
      console.log(`[sidecar] ${platform}:${arch} -> ${path.relative(rootDir, output)}`);
    }
    process.exit(result.status);
  }

  throw new Error('Failed to start pkg.');
}

try {
  main();
} catch (error) {
  console.error(`[sidecar] ${error.message}`);
  process.exit(1);
}
