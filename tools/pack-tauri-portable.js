const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { runPostdist } = require('./postdist');

function readPackageJson() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`[portable] missing build artifact: ${filePath}`);
  }
}

function cleanDir(dirPath) {
  fs.rmSync(dirPath, {
    recursive: true,
    force: true,
    maxRetries: 2,
    retryDelay: 150
  });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyRequired(src, dest) {
  ensureFile(src);
  fs.copyFileSync(src, dest);
}

function copyOptional(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.copyFileSync(src, dest);
}

function removeIfExists(filePath) {
  if (!fs.existsSync(filePath)) return;
  if (process.platform === 'win32') {
    const result = spawnSync('cmd.exe', ['/d', '/s', '/c', 'del', '/f', '/q', filePath], {
      stdio: 'ignore',
      windowsHide: true
    });
    if (result.status === 0 && !fs.existsSync(filePath)) {
      return;
    }
  }
  fs.unlinkSync(filePath);
}

function stripDocs(targetDir) {
  removeIfExists(path.join(targetDir, 'README.md'));
  removeIfExists(path.join(targetDir, 'README_zh.md'));
}

function quoteForPowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function createZip(sourceDir, zipPath) {
  if (process.platform !== 'win32') return;

  fs.rmSync(zipPath, { force: true });
  const parentDir = path.dirname(sourceDir);
  const folderName = path.basename(sourceDir);

  const tarResult = spawnSync(
    'tar.exe',
    ['-a', '-c', '-f', zipPath, '-C', parentDir, folderName],
    {
      stdio: 'inherit',
      windowsHide: true
    }
  );

  if (tarResult.status === 0) {
    return;
  }

  const command =
    `Compress-Archive -Path ${quoteForPowerShell(sourceDir)} ` +
    `-DestinationPath ${quoteForPowerShell(zipPath)} -Force`;

  const powershellResult = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    {
      stdio: 'inherit',
      windowsHide: true
    }
  );

  if (powershellResult.status !== 0) {
    console.warn(
      `[portable] zip creation skipped: tar exited with ${tarResult.status}, powershell exited with ${powershellResult.status}`,
    );
  }
}

function main() {
  const pkg = readPackageJson();
  const version = pkg && pkg.version ? String(pkg.version) : '0.0.0';
  const rootDir = path.join(__dirname, '..');
  const releaseDir = path.join(rootDir, 'src-tauri', 'target', 'release');
  const distDir = path.join(rootDir, 'dist');
  const portableName = `ai-cli-complete-notify-${version}-portable-win-x64`;
  const portableDir = path.join(distDir, portableName);
  const portableZip = path.join(distDir, `${portableName}.zip`);

  fs.mkdirSync(distDir, { recursive: true });
  cleanDir(portableDir);

  copyRequired(
    path.join(releaseDir, 'ai-cli-complete-notify.exe'),
    path.join(portableDir, 'ai-cli-complete-notify.exe')
  );
  copyRequired(
    path.join(releaseDir, 'ai-reminder.exe'),
    path.join(portableDir, 'ai-reminder.exe')
  );

  copyOptional(
    path.join(rootDir, 'config.example.json'),
    path.join(portableDir, 'config.example.json')
  );
  runPostdist(portableDir);
  stripDocs(portableDir);
  createZip(portableDir, portableZip);

  console.log(`[portable] ready: ${portableDir}`);
  if (fs.existsSync(portableZip)) {
    console.log(`[portable] zip: ${portableZip}`);
  }
}

main();
