const { spawn } = require('child_process');

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
