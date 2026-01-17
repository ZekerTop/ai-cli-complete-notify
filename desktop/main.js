const path = require('path');

const electron = require('electron');
if (!electron || typeof electron !== 'object') {
  console.error('Electron APIs unavailable: please run via Electron runtime.');
  process.exit(1);
}

const { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage, screen } = electron;

if (process.platform === 'win32') {
  try {
    app.setAppUserModelId('com.aicli.complete.notify');
  } catch (_error) {
    // ignore
  }
}

const { bootstrapEnv } = require('../src/bootstrap');
bootstrapEnv();

const { runCli } = require('../src/cli');
const { loadConfig, saveConfig, getConfigPath } = require('../src/config');
const { getDataDir, PRODUCT_NAME } = require('../src/paths');
const { sendNotifications } = require('../src/engine');
const { startWatch } = require('../src/watch');

let mainWindow = null;
let watchStop = null;
let tray = null;
let isQuitting = false;
let closePromptOpen = false;

async function resolveTrayImage() {
  const iconIco = path.join(__dirname, 'assets', 'tray.ico');
  const iconPng = path.join(__dirname, 'assets', 'tray.png');

  function ensureValid(img) {
    if (!img) return null;
    try {
      if (img.isEmpty()) return null;
      const resized = img.resize({ width: 48, height: 48, quality: 'best' });
      return resized.isEmpty() ? null : resized;
    } catch (_error) {
      return null;
    }
  }

  let icon = ensureValid(nativeImage.createFromPath(iconIco));
  if (!icon) icon = ensureValid(nativeImage.createFromPath(iconPng));

  // Fallback: read embedded exe icon (packaged only).
  if (!icon && process.platform === 'win32' && app.isPackaged && typeof app.getFileIcon === 'function') {
    try {
      const fileIcon = await app.getFileIcon(process.execPath, { size: 'small' });
      icon = ensureValid(fileIcon) || icon;
    } catch (_error) {
      // ignore
    }
  }

  return icon || nativeImage.createEmpty();
}

function normalizeLanguage(value) {
  if (typeof value !== 'string') return 'zh-CN';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  if (normalized === 'zh' || normalized.startsWith('zh')) return 'zh-CN';
  return 'zh-CN';
}

function getUiLanguage() {
  const config = loadConfig();
  return normalizeLanguage(config && config.ui ? config.ui.language : 'zh-CN');
}

const UI_I18N = {
  'zh-CN': {
    'tray.open': '打开',
    'tray.quit': '退出',
    'tray.hidden': '已隐藏到右下角托盘（可能在“^”隐藏图标里），点击图标可重新打开。',
    'close.message': '关闭窗口后要怎么处理？',
    'close.detail': '“隐藏到托盘”会让程序继续在后台运行，可在右下角托盘图标重新打开。\n“退出”会彻底关闭程序并停止监听。',
    'close.hide': '隐藏到托盘',
    'close.quit': '退出',
    'close.cancel': '取消',
    'close.remember': '记住我的选择（可在“高级”里修改）'
  },
  en: {
    'tray.open': 'Open',
    'tray.quit': 'Quit',
    'tray.hidden': 'Minimized to the system tray (may be under the ^ hidden icons). Click the tray icon to restore.',
    'close.message': 'What would you like to do when closing the window?',
    'close.detail': '“Minimize to tray” keeps the app running in the system tray.\n“Quit” closes the app and stops watchers.',
    'close.hide': 'Minimize to tray',
    'close.quit': 'Quit',
    'close.cancel': 'Cancel',
    'close.remember': 'Remember my choice (change later in Advanced)'
  }
};

function tr(lang, key) {
  const pack = UI_I18N[lang] || UI_I18N['zh-CN'];
  return pack[key] || UI_I18N.en[key] || UI_I18N['zh-CN'][key] || key;
}

function getArgv() {
  const startIndex = process.defaultApp ? 2 : 1;
  return process.argv.slice(startIndex);
}

function isCliInvocation(argv) {
  const command = argv[0];
  return ['start', 'stop', 'notify', 'run', 'watch', 'config', 'help', '--help'].includes(command);
}

async function runCliAndExit(argv) {
  const result = await runCli(argv);
  if (typeof result.exitCode === 'number') {
    app.exit(result.exitCode);
    return;
  }
  app.exit(result.ok ? 0 : 1);
}

function createWindow() {
  const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1200, workAreaSize.width);
  const height = Math.min(860, workAreaSize.height); // taller to avoid sidebar scroll
  const minWidth = Math.min(900, workAreaSize.width);
  const minHeight = Math.min(700, workAreaSize.height);
  const windowIcon = path.join(__dirname, 'assets', process.platform === 'win32' ? 'tray.ico' : 'tray.png');

  const win = new BrowserWindow({
    width,
    height,
    minWidth,
    minHeight,
    center: true,
    icon: windowIcon,
    autoHideMenuBar: true,
    title: `${PRODUCT_NAME} v${app.getVersion()}`,
    backgroundColor: '#0b1022',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  try {
    win.setMenuBarVisibility(false);
  } catch (_error) {
    // ignore
  }
  win.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    void handleCloseRequest(win);
  });
  return win;
}

function getCloseBehavior() {
  const config = loadConfig();
  const behavior = config && config.ui && typeof config.ui.closeBehavior === 'string' ? config.ui.closeBehavior : 'ask';
  return behavior === 'tray' || behavior === 'exit' ? behavior : 'ask';
}

function saveCloseBehavior(behavior) {
  const config = loadConfig();
  config.ui = config.ui || {};
  config.ui.closeBehavior = behavior;
  saveConfig(config);
}

function stopWatchIfRunning() {
  if (!watchStop) return;
  try {
    watchStop();
  } catch (_error) {
    // ignore
  } finally {
    watchStop = null;
  }
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  mainWindow.setSkipTaskbar(false);
  mainWindow.focus();
}

function refreshTrayMenu() {
  if (!tray) return;
  const lang = getUiLanguage();
  tray.setToolTip(PRODUCT_NAME);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: tr(lang, 'tray.open'),
        click: () => showMainWindow()
      },
      {
        type: 'separator'
      },
      {
        label: tr(lang, 'tray.quit'),
        click: () => {
          isQuitting = true;
          stopWatchIfRunning();
          app.quit();
        }
      }
    ])
  );
}

function ensureTray() {
  if (tray) {
    refreshTrayMenu();
    return tray;
  }

  tray = new Tray(nativeImage.createEmpty());
  refreshTrayMenu();
  // Set icon asynchronously to tolerate slow disk / antivirus.
  resolveTrayImage()
    .then((img) => {
      try {
        if (tray && img && !img.isEmpty()) tray.setImage(img);
      } catch (_error) {
        // ignore
      }
    })
    .catch(() => {});

  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());

  return tray;
}

function hideToTray(win) {
  ensureTray();
  win.hide();
  win.setSkipTaskbar(true);

  try {
    if (tray && typeof tray.displayBalloon === 'function') {
      const lang = getUiLanguage();
      tray.displayBalloon({
        title: PRODUCT_NAME,
        content: tr(lang, 'tray.hidden')
      });
    }
  } catch (_error) {
    // ignore
  }
}

async function handleCloseRequest(win) {
  const behavior = getCloseBehavior();

  if (behavior === 'tray') {
    hideToTray(win);
    return;
  }

  if (behavior === 'exit') {
    isQuitting = true;
    stopWatchIfRunning();
    app.quit();
    return;
  }

  if (closePromptOpen) return;
  closePromptOpen = true;
  try {
    const lang = getUiLanguage();
    const result = await dialog.showMessageBox(win, {
      type: 'question',
      title: PRODUCT_NAME,
      message: tr(lang, 'close.message'),
      detail: tr(lang, 'close.detail'),
      buttons: [tr(lang, 'close.hide'), tr(lang, 'close.quit'), tr(lang, 'close.cancel')],
      defaultId: 0,
      cancelId: 2,
      checkboxLabel: tr(lang, 'close.remember'),
      checkboxChecked: false
    });

    if (result.response === 0) {
      if (result.checkboxChecked) saveCloseBehavior('tray');
      hideToTray(win);
      return;
    }

    if (result.response === 1) {
      if (result.checkboxChecked) saveCloseBehavior('exit');
      isQuitting = true;
      stopWatchIfRunning();
      app.quit();
      return;
    }
  } finally {
    closePromptOpen = false;
  }
}

function setupIpc(win) {
  ipcMain.handle('completeNotify:getMeta', () => {
    return {
      productName: PRODUCT_NAME,
      dataDir: getDataDir(),
      configPath: getConfigPath(),
      version: app.getVersion()
    };
  });

  ipcMain.handle('completeNotify:getConfig', () => loadConfig());
  ipcMain.handle('completeNotify:saveConfig', (_event, next) => saveConfig(next));
  ipcMain.handle('completeNotify:setUiLanguage', (_event, language) => {
    const lang = normalizeLanguage(String(language || ''));
    const config = loadConfig();
    config.ui = config.ui || {};
    config.ui.language = lang;
    saveConfig(config);
    refreshTrayMenu();
    return { ok: true, language: lang };
  });

  ipcMain.handle('completeNotify:setCloseBehavior', (_event, behavior) => {
    const next = String(behavior || '').trim().toLowerCase();
    const normalized = next === 'tray' || next === 'exit' ? next : 'ask';
    saveCloseBehavior(normalized);
    return { ok: true, closeBehavior: normalized };
  });

  ipcMain.handle('completeNotify:setAutostart', (_event, enabled) => {
    const value = Boolean(enabled);
    try {
      if (process.platform === 'win32' || process.platform === 'darwin') {
        app.setLoginItemSettings({ openAtLogin: value, openAsHidden: true });
      }
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : String(error) };
    }
    const cfg = loadConfig();
    cfg.ui = cfg.ui || {};
    cfg.ui.autostart = value;
    saveConfig(cfg);
    return { ok: true, autostart: value };
  });

  ipcMain.handle('completeNotify:getAutostart', () => {
    const cfg = loadConfig();
    const autostart = cfg && cfg.ui ? Boolean(cfg.ui.autostart) : false;
    let system = null;
    try {
      if (process.platform === 'win32' || process.platform === 'darwin') {
        const settings = app.getLoginItemSettings();
        system = { openAtLogin: Boolean(settings.openAtLogin) };
      }
    } catch (_error) {
      // ignore
    }
    return { ok: true, autostart, system };
  });

  ipcMain.handle('completeNotify:openPath', async (_event, targetPath) => {
    if (typeof targetPath !== 'string' || !targetPath) return { ok: false };
    const result = await shell.openPath(targetPath);
    return { ok: result === '' };
  });

  ipcMain.handle('completeNotify:openExternal', async (_event, targetUrl) => {
    if (typeof targetUrl !== 'string' || !targetUrl.trim()) return { ok: false, error: 'invalid url' };
    try {
      await shell.openExternal(targetUrl);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : String(error) };
    }
  });

  ipcMain.handle('completeNotify:testNotify', async (_event, payload) => {
    const source = payload && typeof payload.source === 'string' ? payload.source : 'claude';
    const taskInfo = payload && typeof payload.taskInfo === 'string' ? payload.taskInfo : '测试提醒';
    const durationMinutes = payload && Number.isFinite(Number(payload.durationMinutes)) ? Number(payload.durationMinutes) : null;
    const durationMs = durationMinutes != null ? durationMinutes * 60 * 1000 : null;
    const result = await sendNotifications({ source, taskInfo, durationMs, cwd: process.cwd(), force: true });
    return result;
  });

  ipcMain.handle('completeNotify:watchStatus', () => {
    return { running: Boolean(watchStop) };
  });

  ipcMain.handle('completeNotify:watchStart', async (_event, payload) => {
    if (watchStop) return { ok: true, running: true };
    const sources = payload && payload.sources ? String(payload.sources) : 'all';
    const intervalMs = payload && Number.isFinite(Number(payload.intervalMs)) ? Number(payload.intervalMs) : 1000;
    const geminiQuietMs = payload && Number.isFinite(Number(payload.geminiQuietMs)) ? Number(payload.geminiQuietMs) : 3000;
    const claudeQuietMs = payload && Number.isFinite(Number(payload.claudeQuietMs)) ? Number(payload.claudeQuietMs) : 60000;

    watchStop = startWatch({
      sources,
      intervalMs,
      geminiQuietMs,
      claudeQuietMs,
      log: (line) => {
        try {
          if (win && !win.isDestroyed()) win.webContents.send('completeNotify:watchLog', String(line));
        } catch (_error) {
          // ignore
        }
      }
    });

    try {
      if (win && !win.isDestroyed()) win.webContents.send('completeNotify:watchLog', '[watch] started');
    } catch (_error) {
      // ignore
    }
    return { ok: true, running: true };
  });

  ipcMain.handle('completeNotify:watchStop', async () => {
    if (!watchStop) return { ok: true, running: false };
    try {
      watchStop();
    } finally {
      watchStop = null;
    }
    try {
      if (win && !win.isDestroyed()) win.webContents.send('completeNotify:watchLog', '[watch] stopped');
    } catch (_error) {
      // ignore
    }
    return { ok: true, running: false };
  });
}

async function main() {
  const argv = getArgv();

  if (argv.length > 0 && isCliInvocation(argv)) {
    await app.whenReady();
    await runCliAndExit(argv);
    return;
  }

  await app.whenReady();
  try {
    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  } catch (_error) {
    // ignore
  }
  app.on('before-quit', () => {
    isQuitting = true;
    stopWatchIfRunning();
    try {
      if (tray) tray.destroy();
    } catch (_error) {
      // ignore
    } finally {
      tray = null;
    }
  });

  const win = createWindow();
  mainWindow = win;
  setupIpc(win);
}

main().catch((error) => {
  console.error('启动失败:', error && error.message ? error.message : error);
  app.exit(1);
});
