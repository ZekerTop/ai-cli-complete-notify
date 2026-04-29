const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const TARGETS = {
  darwin: {
    x64: {
      pkgTarget: 'node18-macos-x64',
      tauriTriple: 'x86_64-apple-darwin',
    },
    arm64: {
      pkgTarget: 'node18-macos-arm64',
      tauriTriple: 'aarch64-apple-darwin',
    },
  },
  win32: {
    x64: {
      pkgTarget: 'node18-win-x64',
      tauriTriple: 'x86_64-pc-windows-msvc',
      extension: '.exe',
    },
    arm64: {
      pkgTarget: 'node18-win-arm64',
      tauriTriple: 'aarch64-pc-windows-msvc',
      extension: '.exe',
    },
  },
  linux: {
    x64: {
      pkgTarget: 'node18-linux-x64',
      tauriTriple: 'x86_64-unknown-linux-gnu',
    },
    arm64: {
      pkgTarget: 'node18-linux-arm64',
      tauriTriple: 'aarch64-unknown-linux-gnu',
    },
  },
};

function resolveSidecarBuild(platform = process.platform, arch = process.arch) {
  const target = TARGETS[platform] && TARGETS[platform][arch];
  if (!target) {
    throw new Error(`Unsupported sidecar build target: ${platform}/${arch}`);
  }

  return {
    pkgTarget: target.pkgTarget,
    outputPath: path.join(
      'src-tauri',
      'binaries',
      `ai-reminder-${target.tauriTriple}${target.extension || ''}`,
    ),
  };
}

function main() {
  const rootDir = path.join(__dirname, '..');
  const { pkgTarget, outputPath } = resolveSidecarBuild();
  const absoluteOutputPath = path.join(rootDir, outputPath);
  const pkgBinPath = require.resolve('pkg/lib-es5/bin.js', { paths: [rootDir] });

  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });

  console.log(`[sidecar] target: ${pkgTarget}`);
  console.log(`[sidecar] output: ${outputPath}`);

  const result = spawnSync(
    process.execPath,
    [pkgBinPath, 'ai-reminder.js', '--target', pkgTarget, '-o', absoluteOutputPath],
    {
      cwd: rootDir,
      stdio: 'inherit',
      shell: false,
    },
  );

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  console.error('[sidecar] Failed to start pkg.');
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  resolveSidecarBuild,
};
