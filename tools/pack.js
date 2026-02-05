const fs = require('fs');
const path = require('path');
const packager = require('electron-packager');

function readPackageVersion() {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const raw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  return pkg && pkg.version ? String(pkg.version) : '0.0.0';
}

async function main() {
  const version = readPackageVersion();
  const name = `ai-cli-complete-notify-${version}`;

  await packager({
    dir: path.join(__dirname, '..'),
    out: path.join(__dirname, '..', 'dist'),
    name,
    platform: 'win32',
    arch: 'x64',
    overwrite: true,
    prune: true,
    icon: path.join(__dirname, '..', 'desktop', 'assets', 'tray.ico'),
    ignore: /\\.env$|\\.env\\.example$|package-zip\\.ps1$/
  });

  require('./postdist');
}

main().catch((error) => {
  console.error('[pack] failed:', error && error.message ? error.message : error);
  process.exit(1);
});
