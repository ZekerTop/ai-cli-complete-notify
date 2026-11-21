const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PACKAGE_NAME = 'ai-cli-complete-notify-deepseek-plugin';

function createDeepseekDesktopManager(options = {}) {
  const platform = options.platform || process.platform;
  const home = options.home || os.homedir();
  const env = options.env || process.env;
  const run = options.run || spawnSync;
  const kill = options.kill || ((pid, signal) => process.kill(pid, signal));
  const pluginApi = options.pluginApi || require('./deepseek-plugin');
  const appPaths = options.appPaths || ['/Applications/DeepSeek Harness.app', path.join(home, 'Applications', 'DeepSeek Harness.app')];
  const configuredHome = typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() ? env.DSH_HOME : path.join(home, '.dsh');
  const dshHome = path.resolve(configuredHome === '~' ? home
    : configuredHome.startsWith('~/') || configuredHome.startsWith('~\\') ? path.join(home, configuredHome.slice(2)) : configuredHome);
  const profilePath = path.join(dshHome, 'profiles', 'desktop');

  function errorResult(errorCode, error, extra = {}) {
    return { ...extra, ok: false, errorCode, error };
  }

  function executable(file) {
    try {
      if (!fs.statSync(file).isFile()) return false;
      fs.accessSync(file, fs.constants.X_OK);
      return true;
    } catch (_error) { return false; }
  }

  function locateApp() {
    for (const appPath of appPaths) {
      const dshPath = path.join(appPath, 'Contents', 'Resources', 'runtime', 'cli', 'bin', 'dsh');
      if (executable(dshPath) && executable(path.join(appPath, 'Contents', 'MacOS', 'DeepSeek Harness'))) return { appPath, dshPath };
    }
    return { appPath: null, dshPath: null };
  }

  function registration() {
    const local = pluginApi.getDeepseekHookStatus();
    const info = { profilePath, pluginDir: local.pluginDir, activation: 'unknown' };
    const manifestPath = path.join(profilePath, 'package.json');
    let manifest;
    try {
      if (fs.statSync(manifestPath).size > 1024 * 1024) throw new Error('Profile manifest is too large');
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const bundles = manifest?.dsh?.profile?.bundles;
      const dependencies = manifest.dependencies;
      if (!Array.isArray(bundles) || !bundles.every((item) => typeof item === 'string')
        || (dependencies !== undefined && (!dependencies || typeof dependencies !== 'object' || Array.isArray(dependencies)))) {
        throw new Error('Invalid profile manifest');
      }
    } catch (error) {
      const missing = error.code === 'ENOENT';
      const operationTraces = ['package.json.lock', 'lock', path.join('.plugin-manager', 'run.json'), path.join('node_modules', PACKAGE_NAME)];
      const uncertain = missing && operationTraces.some((file) => {
        try { fs.lstatSync(path.join(profilePath, file)); return true; } catch (_error) { return false; }
      });
      return {
        ...info,
        registered: missing && !uncertain ? false : null,
        errorCode: missing && !uncertain ? 'desktop_profile_uninitialized' : 'desktop_profile_invalid',
        error: missing && !uncertain ? 'Open DeepSeek Harness Desktop once to initialize its profile' : 'DeepSeek Harness Desktop profile could not be verified',
      };
    }
    const dependency = manifest.dependencies?.[PACKAGE_NAME];
    const selected = manifest.dsh.profile.bundles.includes(PACKAGE_NAME);
    if (dependency === undefined && !selected) {
      const busy = ['package.json.lock', 'lock', path.join('.plugin-manager', 'run.json')]
        .some((file) => fs.existsSync(path.join(profilePath, file)));
      return busy ? {
        ...info, registered: null, errorCode: 'desktop_profile_invalid',
        error: 'A Desktop profile operation may still be updating plugin registration',
      } : { ...info, registered: false };
    }
    try {
      const target = fs.realpathSync(path.join(profilePath, 'node_modules', PACKAGE_NAME));
      if (typeof dependency === 'string' && selected && target === fs.realpathSync(local.pluginDir)) {
        return { ...info, registered: true };
      }
    } catch (_error) { /* An incomplete package operation cannot prove registration. */ }
    return {
      ...info,
      registered: null,
      errorCode: 'desktop_registration_mismatch',
      error: 'Desktop registration does not resolve to this notification plugin directory',
    };
  }

  function getDeepseekDesktopStatus() {
    if (platform !== 'darwin') {
      return { available: false, registered: null, activation: 'unknown', errorCode: 'unsupported_platform' };
    }
    const app = locateApp();
    const state = registration();
    return {
      ...state,
      ...app,
      available: Boolean(app.dshPath) && !['desktop_profile_uninitialized', 'desktop_profile_invalid'].includes(state.errorCode),
      ...(!app.dshPath ? { errorCode: 'desktop_not_found', error: 'DeepSeek Harness Desktop bundled command was not found' } : {}),
    };
  }

  function checkStopped() {
    let result;
    try {
      result = options.processList ? options.processList() : run('/bin/ps', ['-axo', 'pid=,comm='], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 2000, maxBuffer: 2 * 1024 * 1024,
      });
      if (Array.isArray(result)) result = { status: 0, stdout: result.join('\n') };
    } catch (_error) {
      return errorResult('desktop_process_check_failed', 'Could not verify that DeepSeek Harness Desktop has fully quit');
    }
    if (result?.error || result?.status !== 0 || typeof result.stdout !== 'string') {
      return errorResult('desktop_process_check_failed', 'Could not verify that DeepSeek Harness Desktop has fully quit');
    }
    const roots = appPaths.map((appPath) => `${path.resolve(appPath)}/Contents/`);
    const running = result.stdout.split('\n').some((line) => {
      const match = /^\s*\d+\s+(.+)$/.exec(line);
      if (!match) return false;
      return roots.some((root) => match[1].includes(root)) || match[1].includes('/DeepSeek Harness.app/Contents/');
    });
    return running ? errorResult('desktop_running', 'Fully quit DeepSeek Harness Desktop before mounting the plugin; closing its window only hides it') : { ok: true };
  }

  function mountDeepseekDesktop(exePath) {
    let status;
    try { status = getDeepseekDesktopStatus(); } catch (_error) {
      return errorResult('desktop_profile_invalid', 'DeepSeek Harness Desktop configuration could not be verified');
    }
    if (!status.available) return { ok: false, ...status };
    const stopped = checkStopped();
    if (!stopped.ok) return { ...status, ...stopped };
    let local;
    try { local = pluginApi.installDeepseekHook(exePath); } catch (_error) { /* Report through the stable error code below. */ }
    if (!local?.ok) return errorResult('local_bundle_failed', 'Could not generate the local DeepSeek notification plugin', status);
    let result;
    try {
      result = run(status.dshPath, ['plugin', '--profile', 'desktop', 'add', local.pluginDir], {
        cwd: local.pluginDir,
        env: { ...env, DSH_HOME: dshHome },
        encoding: 'utf8',
        stdio: 'ignore',
        detached: true,
        timeout: 30000,
        killSignal: 'SIGKILL',
      });
    } catch (_error) {
      return errorResult('desktop_install_failed', 'DeepSeek Harness Desktop plugin installation failed', status);
    }
    if (result?.error?.code === 'ETIMEDOUT') {
      if (Number.isInteger(result.pid) && result.pid > 0) {
        try { kill(-result.pid, 'SIGKILL'); } catch (_error) { /* The process group has already exited. */ }
      }
      return errorResult('desktop_install_timeout', 'DeepSeek Harness Desktop plugin installation timed out; check its profile before retrying', {
        ...status, registered: null,
      });
    }
    if (result?.error || result?.status !== 0) {
      return errorResult('desktop_install_failed', 'DeepSeek Harness Desktop plugin installation failed', { ...status, exitCode: result?.status ?? null });
    }
    const verified = registration();
    if (verified.registered !== true) return errorResult('desktop_registration_mismatch', 'Installation returned successfully but Desktop registration could not be verified', {
      ...status, ...verified,
    });
    const success = { ...status, ...local, ...verified, ok: true, requiresRestart: true };
    delete success.error;
    delete success.errorCode;
    return success;
  }

  function getDeepseekBundleRegistrations() {
    return platform === 'darwin' ? registration() : { registered: false, activation: 'unknown' };
  }

  return { getDeepseekDesktopStatus, mountDeepseekDesktop, getDeepseekBundleRegistrations };
}

module.exports = {
  createDeepseekDesktopManager,
  getDeepseekDesktopStatus: () => createDeepseekDesktopManager().getDeepseekDesktopStatus(),
  mountDeepseekDesktop: (exePath) => createDeepseekDesktopManager().mountDeepseekDesktop(exePath),
  getDeepseekBundleRegistrations: () => createDeepseekDesktopManager().getDeepseekBundleRegistrations(),
};
