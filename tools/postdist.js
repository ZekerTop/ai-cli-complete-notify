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
  const distRoot = path.join(process.cwd(), 'dist');
  let distDir = path.join(distRoot, name);
  if (!fs.existsSync(distDir)) {
    const placeholder = path.join(distRoot, 'ai-cli-complete-notify-%npm_package_version%-win32-x64');
    if (fs.existsSync(placeholder)) {
      distDir = placeholder;
      console.warn(`[postdist] target dir fallback: ${distDir}`);
    } else {
      let fallback = '';
      try {
        const entries = fs.readdirSync(distRoot, { withFileTypes: true });
        const candidates = entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .filter((name) => name.startsWith('ai-cli-complete-notify-') && name.endsWith('-win32-x64'))
          .map((name) => ({ name, full: path.join(distRoot, name) }));

        let latest = null;
        for (const item of candidates) {
          try {
            const stat = fs.statSync(item.full);
            if (!latest || stat.mtimeMs > latest.mtimeMs) {
              latest = { ...item, mtimeMs: stat.mtimeMs };
            }
          } catch (_error) {
            // ignore
          }
        }
        if (latest) fallback = latest.full;
      } catch (_error) {
        // ignore
      }

      if (!fallback) {
        console.warn(`[postdist] target dir not found: ${distDir}`);
        return;
      }
      distDir = fallback;
      console.warn(`[postdist] target dir fallback: ${distDir}`);
    }
  }

  copyEnvExample(distDir);
  removeDeepEnv(distDir);
}

main();
