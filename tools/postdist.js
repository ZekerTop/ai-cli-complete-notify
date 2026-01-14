const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

function copyEnvExample(targetDir) {
  const envExample = path.join(process.cwd(), '.env.example');
  if (!fs.existsSync(envExample)) return;

  const destExample = path.join(targetDir, '.env.example');
  if (fs.existsSync(destExample)) return;

  fs.copyFileSync(envExample, destExample);
  console.log(`[postdist] copied .env.example -> ${destExample}`);
}

function removeDeepEnv(targetDir) {
  // Ensure no stray .env under resources/app
  const targets = [
    path.join(targetDir, 'resources', 'app', '.env'),
    path.join(targetDir, 'resources', 'app', '.env.example'),
    path.join(targetDir, 'resources', 'app', 'package-zip.ps1')
  ];
  for (const t of targets) {
    if (fs.existsSync(t)) {
      fs.rmSync(t, { force: true });
      console.log(`[postdist] removed ${t}`);
    }
  }
}

function main() {
  const name = `ai-cli-complete-notify-${pkg.version}-win32-x64`;
  const distDir = path.join(process.cwd(), 'dist', name);
  if (!fs.existsSync(distDir)) {
    console.warn(`[postdist] target dir not found: ${distDir}`);
    return;
  }

  copyEnvExample(distDir);
  removeDeepEnv(distDir);
}

main();
