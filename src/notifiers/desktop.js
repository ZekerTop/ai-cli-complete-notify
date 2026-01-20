const { spawn } = require('child_process');

function notifyDesktopBalloon({ title, message, timeoutMs }) {
  return new Promise((resolve) => {
    try {
      if (process.platform !== 'win32') {
        resolve({ ok: false, error: 'desktop notifications not supported on this platform' });
        return;
      }

      const safeTitle = String(title).replace(/"/g, "'");
      const safeMessage = String(message).replace(/"/g, "'");
      const ms = Number.isFinite(timeoutMs) ? timeoutMs : 6000;
      const psScript = [
        'Add-Type -AssemblyName System.Windows.Forms;',
        'Add-Type -AssemblyName System.Drawing;',
        '$n = New-Object System.Windows.Forms.NotifyIcon;',
        '$n.Icon = [System.Drawing.SystemIcons]::Information;',
        `$n.BalloonTipTitle = "${safeTitle}";`,
        `$n.BalloonTipText = "${safeMessage}";`,
        '$n.Visible = $true;',
        `$n.ShowBalloonTip(${Math.max(1000, ms)});`,
        `Start-Sleep -Milliseconds ${Math.max(1000, ms) + 1000};`,
        '$n.Dispose();'
      ].join(' ');

      const processRef = spawn('powershell', ['-Command', psScript], { stdio: 'ignore', shell: false });
      processRef.on('error', (error) => resolve({ ok: false, error: error.message }));
      processRef.on('close', (code) => resolve({ ok: code === 0, error: code === 0 ? null : '桌面通知异常退出' }));
    } catch (error) {
      resolve({ ok: false, error: error.message });
    }
  });
}

module.exports = {
  notifyDesktopBalloon
};
