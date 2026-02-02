const { spawn } = require('child_process');
const path = require('path');

let electronNotification = null;
let electronApi = null;
let ipcHooked = false;
const toastCallbacks = new Map();
let activeToastWindow = null;

try {
  // Only available in Electron (desktop app). CLI will fall back to PowerShell.
  // eslint-disable-next-line global-require
  // eslint-disable-next-line global-require
  const electron = require('electron');
  electronApi = electron;
  const { Notification } = electron;
  if (Notification && typeof Notification.isSupported === 'function' && Notification.isSupported()) {
    electronNotification = Notification;
  }
} catch (_error) {
  electronNotification = null;
}

function ensureToastIpc() {
  if (ipcHooked || !electronApi || !electronApi.ipcMain) return;
  ipcHooked = true;
  electronApi.ipcMain.on('completeNotify:toastClick', (_event, payload) => {
    const id = payload && payload.id ? String(payload.id) : '';
    if (!id) return;
    const cb = toastCallbacks.get(id);
    if (cb) {
      toastCallbacks.delete(id);
      Promise.resolve(cb()).catch(() => {});
    }
  });
}

function showCustomToast({ title, message, hint, timeoutMs, onClick, kind, projectName }) {
  if (!electronApi || !electronApi.BrowserWindow || !electronApi.screen) return false;
  const { BrowserWindow, screen } = electronApi;

  ensureToastIpc();

  const id = String(Date.now()) + Math.random().toString(16).slice(2);
  if (typeof onClick === 'function') toastCallbacks.set(id, onClick);

  if (activeToastWindow && !activeToastWindow.isDestroyed()) {
    try { activeToastWindow.close(); } catch (_error) {}
  }

  const workArea = screen.getPrimaryDisplay().workArea;
  const width = 360;
  const titleLines = Math.min(2, Math.max(1, Math.ceil(String(title || '').length / 24)));
  const messageLines = message ? Math.min(3, Math.max(1, Math.ceil(String(message || '').length / 34))) : 0;
  const height = 110 + (titleLines - 1) * 18 + messageLines * 18 + (hint ? 24 : 0);
  const x = workArea.x + workArea.width - width - 16;
  const y = workArea.y + workArea.height - height - 16;

  const safeTimeoutMs = Math.max(1000, Number.isFinite(timeoutMs) ? timeoutMs : 6000);
  const createdAt = Date.now();
  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    resizable: false,
    frame: false,
    show: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  activeToastWindow = win;

  const filePath = path.join(electronApi.app.getAppPath(), 'desktop', 'renderer', 'notify.html');
  const kindValue = kind === 'confirm' ? 'confirm' : 'complete';
  win.loadFile(filePath, {
    query: {
      id,
      title: String(title || ''),
      message: String(message || ''),
      hint: String(hint || ''),
      timeoutMs: String(safeTimeoutMs),
      createdAt: String(createdAt),
      kind: kindValue,
      project: String(projectName || '')
    }
  });

  win.once('ready-to-show', () => {
    try {
      win.show();
      win.setAlwaysOnTop(true, 'screen-saver');
    } catch (_error) {}
  });

  const closeTimer = setTimeout(() => {
    try { win.close(); } catch (_error) {}
    toastCallbacks.delete(id);
  }, safeTimeoutMs);

  win.on('closed', () => {
    clearTimeout(closeTimer);
    toastCallbacks.delete(id);
    if (activeToastWindow === win) activeToastWindow = null;
  });

  return true;
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapePsSingle(value) {
  return String(value || '').replace(/'/g, "''");
}

function notifyDesktopBalloon({ title, message, timeoutMs, onClick, clickHint, kind, projectName }) {
  return new Promise((resolve) => {
    try {
      if (process.platform !== 'win32') {
        resolve({ ok: false, error: 'desktop notifications not supported on this platform' });
        return;
      }

      const finalTitle = projectName ? `${projectName} · ${title}` : title;
      const clickLine = clickHint ? `\n${String(clickHint)}` : '';
      const body = `${String(message || '')}${clickLine}`;

      // Prefer custom toast for better visual quality + reliable click.
      if (showCustomToast({ title, message, hint: clickHint, timeoutMs, onClick, kind, projectName })) {
        resolve({ ok: true, clicked: false });
        return;
      }

      if (electronNotification) {
        try {
          const notification = new electronNotification({
            title: String(finalTitle || ''),
            body
          });
          if (typeof onClick === 'function') {
            notification.on('click', () => {
              Promise.resolve(onClick()).catch(() => {});
            });
          }
          notification.show();
          resolve({ ok: true, clicked: false });
          return;
        } catch (_error) {
          // fall through to PowerShell
        }
      }

      const ms = Math.max(1000, Number.isFinite(timeoutMs) ? timeoutMs : 6000);
      const safeTitle = escapePsSingle(finalTitle);
      const safeMessage = escapePsSingle(body);
      const toastTitle = escapeXml(finalTitle);
      const toastMessage = escapeXml(message);
      const toastHint = clickHint ? escapeXml(clickHint) : '';
      const toastHintNode = toastHint ? `<text>${toastHint}</text>` : '';
      const toastXml = `<toast duration="short"><visual><binding template="ToastGeneric"><text>${toastTitle}</text><text>${toastMessage}</text>${toastHintNode}</binding></visual></toast>`;

      const psScript = [
        '$ErrorActionPreference = "SilentlyContinue";',
        '$global:clicked = $false; $global:dismissed = $false; $useBalloon = $false;',
        'try {',
        '  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null;',
        '  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null;',
        `  $xml = @'\n${toastXml}\n'@;`,
        '  $doc = New-Object Windows.Data.Xml.Dom.XmlDocument;',
        '  $doc.LoadXml($xml);',
        '  $toast = New-Object Windows.UI.Notifications.ToastNotification $doc;',
        '  Register-ObjectEvent -InputObject $toast -EventName Activated -Action { $global:clicked = $true } | Out-Null;',
        '  Register-ObjectEvent -InputObject $toast -EventName Dismissed -Action { $global:dismissed = $true } | Out-Null;',
        '  $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("AI CLI Complete Notify");',
        '  $notifier.Show($toast);',
        `  $timeout = ${ms}; $elapsed = 0;`,
        '  while ($elapsed -lt $timeout -and -not $global:clicked -and -not $global:dismissed) { Start-Sleep -Milliseconds 200; $elapsed += 200 }',
        '} catch { $useBalloon = $true }',
        'if ($useBalloon) {',
        '  Add-Type -AssemblyName System.Windows.Forms;',
        '  Add-Type -AssemblyName System.Drawing;',
        '  $n = New-Object System.Windows.Forms.NotifyIcon;',
        '  $n.Icon = [System.Drawing.SystemIcons]::Information;',
        `  $n.BalloonTipTitle = '${safeTitle}';`,
        `  $n.BalloonTipText = '${safeMessage}';`,
        '  Register-ObjectEvent -InputObject $n -EventName BalloonTipClicked -Action { $global:clicked = $true } | Out-Null;',
        '  $n.Visible = $true;',
        `  $n.ShowBalloonTip(${ms});`,
        '  $elapsed = 0;',
        `  while ($elapsed -lt ${ms} -and -not $global:clicked) { Start-Sleep -Milliseconds 200; $elapsed += 200 }`,
        '  $n.Dispose();',
        '}',
        'if ($global:clicked) { Write-Output "CLICKED" }'
      ].join(' ');

      const processRef = spawn('powershell', ['-Command', psScript], { shell: false });
      let output = '';
      processRef.stdout.on('data', (chunk) => { output += chunk.toString(); });
      processRef.on('error', (error) => resolve({ ok: false, error: error.message }));
      processRef.on('close', (code) => {
        const clicked = output.includes('CLICKED');
        if (clicked && typeof onClick === 'function') {
          Promise.resolve(onClick()).catch(() => {});
        }
        resolve({ ok: code === 0, clicked, error: code === 0 ? null : '桌面通知异常退出' });
      });
    } catch (error) {
      resolve({ ok: false, error: error.message });
    }
  });
}

module.exports = {
  notifyDesktopBalloon
};
