const fs = require('fs');
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
const { summarizeTask, summarizeTaskDetailed } = require('../src/summary');
const { startWatch } = require('../src/watch');

let mainWindow = null;
let watchStop = null;
let tray = null;
let isQuitting = false;
let closePromptOpen = false;
let closePromptSeq = 0;
const pendingClosePrompts = new Map();
let hasSingleInstanceLock = false;
let watchLogCleanupTimer = null;
const watchLogState = {
  currentDate: '',
  filePath: '',
  lastCleanupAt: 0
};

function formatDateKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}

function formatLogTimestamp(ts) {
  const date = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function getWatchLogRetentionDays() {
  const config = loadConfig();
  const raw = config && config.ui ? Number(config.ui.watchLogRetentionDays) : NaN;
  if (Number.isFinite(raw) && raw >= 1) return raw;
  return 7;
}

function getWatchLogDir() {
  return path.join(getDataDir(), 'watch-logs');
}

function ensureWatchLogFile() {
  const now = new Date();
  const dateKey = formatDateKey(now);
  if (watchLogState.currentDate === dateKey && watchLogState.filePath) return watchLogState.filePath;

  const dir = getWatchLogDir();
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (_error) {
    return '';
  }

  const filePath = path.join(dir, `watch-${dateKey}.log`);
  watchLogState.currentDate = dateKey;
  watchLogState.filePath = filePath;
  return filePath;
}

function cleanupWatchLogs(retentionDays) {
  const dir = getWatchLogDir();
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_error) {
    return;
  }

  const keepMs = Math.max(1, Number(retentionDays)) * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.log')) continue;
    const fullPath = path.join(dir, entry.name);
    try {
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > keepMs) fs.unlinkSync(fullPath);
    } catch (_error) {
      // ignore
    }
  }
}

function maybeCleanupWatchLogs() {
  const now = Date.now();
  if (now - watchLogState.lastCleanupAt < 6 * 60 * 60 * 1000) return;
  watchLogState.lastCleanupAt = now;
  cleanupWatchLogs(getWatchLogRetentionDays());
}

function startWatchLogCleanupTimer() {
  if (watchLogCleanupTimer) return;
  maybeCleanupWatchLogs();
  watchLogCleanupTimer = setInterval(() => {
    try {
      maybeCleanupWatchLogs();
    } catch (_error) {
      // ignore
    }
  }, 60 * 60 * 1000);
}

function stopWatchLogCleanupTimer() {
  if (!watchLogCleanupTimer) return;
  clearInterval(watchLogCleanupTimer);
  watchLogCleanupTimer = null;
}

function appendWatchLog(line) {
  const filePath = ensureWatchLogFile();
  if (!filePath) return;
  const stamped = `[${formatLogTimestamp(Date.now())}] ${String(line)}\n`;
  try {
    fs.appendFileSync(filePath, stamped, 'utf8');
  } catch (_error) {
    // ignore
  }
  maybeCleanupWatchLogs();
}

function emitWatchLog(win, line) {
  appendWatchLog(line);
  try {
    if (win && !win.isDestroyed()) win.webContents.send('completeNotify:watchLog', String(line));
  } catch (_error) {
    // ignore
  }
}

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
    'close.message': '关闭应用？',
    'close.detail': '可选择隐藏到托盘继续运行，或直接退出并停止监听。',
    'close.hide': '隐藏到托盘',
    'close.quit': '退出',
    'close.cancel': '取消',
    'close.remember': '记住我的选择（可在“高级”里修改）'
  },
  en: {
    'tray.open': 'Open',
    'tray.quit': 'Quit',
    'tray.hidden': 'Minimized to the system tray (may be under the ^ hidden icons). Click the tray icon to restore.',
    'close.message': 'Close the app?',
    'close.detail': 'Minimize to tray to keep running, or quit to stop watchers.',
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

function normalizeClosePromptAction(action) {
  if (action === 'tray' || action === 'exit') return action;
  return 'cancel';
}

async function showNativeClosePrompt(win) {
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

  if (result.response === 0) return { action: 'tray', remember: Boolean(result.checkboxChecked) };
  if (result.response === 1) return { action: 'exit', remember: Boolean(result.checkboxChecked) };
  return { action: 'cancel', remember: false };
}

function showRendererClosePrompt(win) {
  return new Promise((resolve) => {
    if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) {
      resolve({ action: 'cancel', remember: false });
      return;
    }

    const id = String(++closePromptSeq);
    pendingClosePrompts.set(id, (payload) => resolve(payload || { action: 'cancel', remember: false }));

    try {
      win.webContents.send('completeNotify:closePrompt', { id });
    } catch (_error) {
      pendingClosePrompts.delete(id);
      resolve({ action: 'cancel', remember: false });
    }
  });
}

async function requestCloseDecision(win) {
  if (!win || win.isDestroyed()) return { action: 'cancel', remember: false };
  if (!win.webContents || win.webContents.isDestroyed() || win.webContents.isLoading()) {
    return await showNativeClosePrompt(win);
  }

  return await showRendererClosePrompt(win);
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
    const result = await requestCloseDecision(win);
    const action = normalizeClosePromptAction(result && result.action);
    const remember = Boolean(result && result.remember);

    if (action === 'tray') {
      if (remember) saveCloseBehavior('tray');
      hideToTray(win);
      return;
    }

    if (action === 'exit') {
      if (remember) saveCloseBehavior('exit');
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

  ipcMain.on('completeNotify:closePromptResponse', (_event, payload) => {
    if (!payload || typeof payload !== 'object') return;
    const id = String(payload.id || '');
    if (!id) return;
    const resolver = pendingClosePrompts.get(id);
    if (!resolver) return;
    pendingClosePrompts.delete(id);
    resolver({
      action: normalizeClosePromptAction(String(payload.action || '')),
      remember: Boolean(payload.remember)
    });
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

  ipcMain.handle('completeNotify:openWatchLog', async () => {
    const filePath = ensureWatchLogFile();
    if (!filePath) return { ok: false };
    try {
      fs.closeSync(fs.openSync(filePath, 'a'));
    } catch (_error) {
      return { ok: false };
    }
    maybeCleanupWatchLogs();
    const result = await shell.openPath(filePath);
    return { ok: result === '', path: filePath };
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

  ipcMain.handle('completeNotify:testSummary', async (_event, payload) => {
    const config = loadConfig();
    const summaryPayload = payload && typeof payload.summary === 'object' ? payload.summary : {};

    config.summary = config.summary && typeof config.summary === 'object' ? { ...config.summary } : {};
    config.summary.enabled = true;
    if (typeof summaryPayload.provider === 'string') config.summary.provider = summaryPayload.provider;
    if (typeof summaryPayload.apiUrl === 'string') config.summary.apiUrl = summaryPayload.apiUrl;
    if (typeof summaryPayload.apiKey === 'string') config.summary.apiKey = summaryPayload.apiKey;
    if (typeof summaryPayload.model === 'string') config.summary.model = summaryPayload.model;
    if (Number.isFinite(Number(summaryPayload.timeoutMs))) {
      config.summary.timeoutMs = Number(summaryPayload.timeoutMs);
    }

    const taskInfo = payload && typeof payload.taskInfo === 'string' && payload.taskInfo.trim()
      ? payload.taskInfo
      : '摘要测试';
    const contentText = payload && typeof payload.contentText === 'string' ? payload.contentText : '';
    const summaryContext = payload && typeof payload.summaryContext === 'object' ? payload.summaryContext : undefined;

    try {
      const result = await summarizeTaskDetailed({ config, taskInfo, contentText, summaryContext });
      if (result && result.ok) return { ok: true, summary: result.summary || '', status: result.status || 0 };
      return {
        ok: false,
        error: result && result.error ? result.error : 'empty_summary',
        status: result && typeof result.status === 'number' ? result.status : 0,
        detail: result && result.detail ? String(result.detail) : ''
      };
    } catch (error) {
      return { ok: false, error: 'unexpected_error', detail: error && error.message ? error.message : String(error) };
    }
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
      log: (line) => emitWatchLog(win, line)
    });

    emitWatchLog(win, '[watch] started');
    return { ok: true, running: true };
  });

  ipcMain.handle('completeNotify:watchStop', async () => {
    if (!watchStop) return { ok: true, running: false };
    try {
      watchStop();
    } finally {
      watchStop = null;
    }
    emitWatchLog(win, '[watch] stopped');
    return { ok: true, running: false };
  });
}

async function main() {
  hasSingleInstanceLock = app.requestSingleInstanceLock();
  if (!hasSingleInstanceLock) {
    app.quit();
    return;
  }

  app.on('second-instance', async (_event, argv) => {
    const args = argv.slice(process.defaultApp ? 2 : 1);
    if (args.length > 0 && isCliInvocation(args)) {
      try {
        await runCli(args);
      } catch (error) {
        console.error('CLI invocation failed:', error && error.message ? error.message : error);
      }
      return;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      showMainWindow();
      return;
    }

    await app.whenReady();
    const win = createWindow();
    mainWindow = win;
    setupIpc(win);
  });

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
  startWatchLogCleanupTimer();
  app.on('before-quit', () => {
    isQuitting = true;
    stopWatchIfRunning();
    stopWatchLogCleanupTimer();
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
