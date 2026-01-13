const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function tryPackageName(cwd) {
  const packageJsonPath = path.join(cwd, 'package.json');
  const pkg = safeReadJson(packageJsonPath);
  if (pkg && typeof pkg.name === 'string' && pkg.name.trim()) return pkg.name.trim();
  return null;
}

function tryGitRepoName(cwd) {
  try {
    const gitRemote = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    const matches = gitRemote.match(/\/([^\/]+)\.git$/);
    if (matches && matches[1]) return matches[1];
  } catch (error) {
    // ignore
  }
  return null;
}

function getProjectName(cwd = process.cwd()) {
  return (
    tryPackageName(cwd) ||
    tryGitRepoName(cwd) ||
    path.basename(cwd) ||
    '未知项目'
  );
}

module.exports = {
  getProjectName
};

