const fs = require('fs');
const os = require('os');
const path = require('path');
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

function getDesktopNotifyMode() {
  const forced = String(process.env.DESKTOP_NOTIFY_MODE || '').trim().toLowerCase();
  if (forced === 'popup' || forced === 'balloon' || forced === 'toast') return forced;
  return process.pkg ? 'popup' : 'toast';
}

function getBalloonIcon(kind) {
  if (kind === 'error') return 'Error';
  if (kind === 'confirm') return 'Warning';
  return 'Info';
}

function getPopupAccent(kind) {
  if (kind === 'error') return '#D96B6B';
  if (kind === 'confirm') return '#E0B15B';
  return '#6E7BFF';
}

function getPopupTint(kind) {
  if (kind === 'error') return '#E8696B';
  if (kind === 'confirm') return '#E0A832';
  return '#7B8CFF';
}

function parseNotifyMode(output) {
  const match = String(output || '').match(/MODE:([A-Z]+)/);
  return match ? String(match[1] || '').toLowerCase() : '';
}

function removeIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_error) {
    // ignore cleanup errors
  }
}

function buildWpfPopupScript({ timeoutMs, tintHex, clickFile, readyFile, tagVis, msgVis, hintVis }) {
  const ms = Math.max(1200, Number(timeoutMs) || 6000);

  // Text content is passed via environment variables to avoid encoding issues
  return `Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NotifyWin32 {
  public const int GWL_EXSTYLE = -20;
  public const long WS_EX_NOACTIVATE = 0x08000000L;

  [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr", SetLastError = true)]
  private static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);

  [DllImport("user32.dll", EntryPoint = "SetWindowLongPtr", SetLastError = true)]
  private static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

  [DllImport("user32.dll", EntryPoint = "GetWindowLong", SetLastError = true)]
  private static extern IntPtr GetWindowLongPtr32(IntPtr hWnd, int nIndex);

  [DllImport("user32.dll", EntryPoint = "SetWindowLong", SetLastError = true)]
  private static extern IntPtr SetWindowLongPtr32(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

  public static IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex) {
    return IntPtr.Size == 8 ? GetWindowLongPtr64(hWnd, nIndex) : GetWindowLongPtr32(hWnd, nIndex);
  }

  public static IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong) {
    return IntPtr.Size == 8 ? SetWindowLongPtr64(hWnd, nIndex, dwNewLong) : SetWindowLongPtr32(hWnd, nIndex, dwNewLong);
  }
}
"@

$clickFile = $env:NOTIFY_CLICK_FILE
$readyFile = $env:NOTIFY_READY_FILE
$global:clicked = $false

$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        Title="AI Notify" WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        Topmost="True" ShowInTaskbar="False" ShowActivated="False" Width="352" SizeToContent="Height" MaxHeight="200"
        WindowStartupLocation="Manual">
  <Border CornerRadius="10" Background="#F7F7F8" Margin="4"
          BorderBrush="#E0E0E0" BorderThickness="0.5">
    <Border.Effect>
      <DropShadowEffect BlurRadius="8" ShadowDepth="2" Opacity="0.18" Color="#000000"/>
    </Border.Effect>
    <Grid>
      <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="*"/>
      </Grid.RowDefinitions>
      <Canvas Grid.Row="0" Height="4" ClipToBounds="True">
        <Rectangle Canvas.Left="0" Canvas.Top="0" Width="344" Height="4" Fill="#E0E0E0"/>
        <Rectangle Name="TimerBar" Canvas.Left="0" Canvas.Top="0" Width="344" Height="4" Fill="${tintHex}"/>
      </Canvas>
      <StackPanel Grid.Row="1" Margin="16,12,16,14">
        <TextBlock Name="TagBlock" FontSize="9.5" FontWeight="SemiBold" Foreground="#AAA" Margin="0,0,0,5" Visibility="${tagVis}"/>
        <TextBlock Name="TitleBlock" TextWrapping="Wrap" FontSize="14" FontWeight="Bold" Foreground="#1A1A1A" FontFamily="Microsoft YaHei UI" LineHeight="20"/>
        <TextBlock Name="MsgBlock" TextWrapping="Wrap" FontSize="12" Foreground="#777" Margin="0,3,0,0" FontFamily="Microsoft YaHei UI" LineHeight="18" Visibility="${msgVis}"/>
        <Border Name="HintBorder" Margin="0,8,0,0" Padding="0,6,0,0" BorderThickness="0,0.5,0,0" BorderBrush="#E5E5E5" Visibility="${hintVis}">
          <TextBlock Name="HintBlock" FontSize="10.5" Foreground="#AAA" FontWeight="Medium" FontFamily="Microsoft YaHei UI"/>
        </Border>
      </StackPanel>
    </Grid>
  </Border>
</Window>
'@

$global:w = [System.Windows.Markup.XamlReader]::Parse($xaml)
$global:bar = $global:w.FindName('TimerBar')

$global:w.Add_SourceInitialized({
  try {
    $interop = New-Object System.Windows.Interop.WindowInteropHelper($global:w)
    $style = [NotifyWin32]::GetWindowLongPtr($interop.Handle, [NotifyWin32]::GWL_EXSTYLE)
    $noActivateStyle = [IntPtr]($style.ToInt64() -bor [NotifyWin32]::WS_EX_NOACTIVATE)
    [NotifyWin32]::SetWindowLongPtr($interop.Handle, [NotifyWin32]::GWL_EXSTYLE, $noActivateStyle) | Out-Null
  } catch {}
})

$tb = $global:w.FindName('TagBlock')
if ($tb) { $tb.Text = $env:NOTIFY_PROJECT }
$tb2 = $global:w.FindName('TitleBlock')
if ($tb2) { $tb2.Text = $env:NOTIFY_TITLE }
$tb3 = $global:w.FindName('MsgBlock')
if ($tb3) { $tb3.Text = $env:NOTIFY_MESSAGE }
$tb4 = $global:w.FindName('HintBlock')
if ($tb4) { $tb4.Text = $env:NOTIFY_HINT }

$screen = [System.Windows.SystemParameters]::WorkArea
$global:w.Left = $screen.Right - 370
$global:w.Top = $screen.Bottom - 160

$global:w.Add_ContentRendered({
  [System.IO.File]::WriteAllText($readyFile, '1')
  $screen2 = [System.Windows.SystemParameters]::WorkArea
  $global:w.Left = $screen2.Right - $global:w.ActualWidth - 12
  $global:w.Top = $screen2.Bottom - $global:w.ActualHeight - 12

  $anim = New-Object System.Windows.Media.Animation.DoubleAnimation
  $anim.From = 344
  $anim.To = 0
  $anim.Duration = New-Object System.Windows.Duration([TimeSpan]::FromMilliseconds(${ms}))
  $anim.FillBehavior = [System.Windows.Media.Animation.FillBehavior]::HoldEnd
  $anim.Add_Completed({ $global:w.Close() })
  $global:bar.BeginAnimation([System.Windows.FrameworkElement]::WidthProperty, $anim)
})

$global:w.Add_MouseLeftButtonDown({
  $global:clicked = $true
  try { [System.IO.File]::WriteAllText($clickFile, '1') } catch {}
  $global:w.Close()
})

$global:w.Add_Closed({
  try {
    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.BeginInvokeShutdown([System.Windows.Threading.DispatcherPriority]::Background) | Out-Null
  } catch {}
})

$null = $global:w.Show()
[System.Windows.Threading.Dispatcher]::Run()
if ($global:clicked) { Write-Output 'CLICKED' }
Write-Output 'MODE:POPUP'
`;
}

function showPopupWpf({ title, message, timeoutMs, onClick, clickHint, kind, projectName }) {
  return new Promise((resolve) => {
    try {
      const baseDir = path.join(os.tmpdir(), 'ai-cli-complete-notify');
      fs.mkdirSync(baseDir, { recursive: true });

      const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const clickPath = path.join(baseDir, `notify-${token}.click`);
      const readyPath = path.join(baseDir, `notify-${token}.ready`);
      const ps1Path = path.join(baseDir, `notify-${token}.ps1`);

      const plainProject = String(projectName || '');
      const plainTitle = String(title || '');
      const plainMessage = String(message || '');
      const plainHint = String(clickHint || '');

      const psScript = buildWpfPopupScript({
        timeoutMs,
        tintHex: getPopupTint(kind),
        clickFile: clickPath,
        readyFile: readyPath,
        tagVis: plainProject ? 'Visible' : 'Collapsed',
        msgVis: plainMessage ? 'Visible' : 'Collapsed',
        hintVis: plainHint ? 'Visible' : 'Collapsed',
      });

      fs.writeFileSync(ps1Path, psScript, 'ascii');

      const env = {
        ...process.env,
        NOTIFY_PROJECT: plainProject,
        NOTIFY_TITLE: plainTitle,
        NOTIFY_MESSAGE: plainMessage,
        NOTIFY_HINT: plainHint,
        NOTIFY_CLICK_FILE: clickPath,
        NOTIFY_READY_FILE: readyPath,
      };

      const child = spawn(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Sta', '-File', ps1Path],
        { shell: false, windowsHide: true, env }
      );

      let output = '';
      child.stdout.on('data', (chunk) => { output += chunk.toString(); });

      child.on('close', (code) => {
        const clicked = fs.existsSync(clickPath);
        const ready = fs.existsSync(readyPath);
        if (clicked && typeof onClick === 'function') {
          Promise.resolve(onClick()).catch(() => {});
        }
        removeIfExists(clickPath);
        removeIfExists(readyPath);
        removeIfExists(ps1Path);
        resolve({
          ok: ready,
          clicked,
          mode: ready ? 'popup' : '',
          popupError: ready ? null : 'wpf popup did not signal ready',
          error: ready ? null : 'desktop notification exited abnormally',
        });
      });

      child.on('error', (error) => {
        removeIfExists(ps1Path);
        resolve({
          ok: false,
          clicked: false,
          mode: '',
          popupError: error && error.message ? error.message : 'wpf startup failed',
          error: error && error.message ? error.message : 'desktop notification exited abnormally',
        });
      });
    } catch (error) {
      resolve({
        ok: false,
        clicked: false,
        mode: '',
        popupError: error && error.message ? error.message : 'popup build failed',
        error: error && error.message ? error.message : 'desktop notification exited abnormally',
      });
    }
  });
}

function notifyDesktopViaPowerShell({ finalTitle, body, timeoutMs, onClick, kind, clickHint }) {
  return new Promise((resolve) => {
    try {
      const ms = Math.max(1200, Number.isFinite(timeoutMs) ? timeoutMs : 6000);
      const safeTitle = escapePsSingle(finalTitle);
      const safeMessage = escapePsSingle(body);
      const toastTitle = escapeXml(finalTitle);
      const toastMessage = escapeXml(String(body || '').split('\n')[0] || '');
      const toastHint = clickHint ? escapeXml(clickHint) : '';
      const toastHintNode = toastHint ? `<text>${toastHint}</text>` : '';
      const toastXml = `<toast duration="short"><visual><binding template="ToastGeneric"><text>${toastTitle}</text><text>${toastMessage}</text>${toastHintNode}</binding></visual><audio silent="true"/></toast>`;
      const preferredMode = getDesktopNotifyMode() === 'toast' ? 'toast' : 'balloon';
      const iconName = getBalloonIcon(kind);

      const psScript = [
        '$ErrorActionPreference = "SilentlyContinue";',
        '$global:clicked = $false; $global:dismissed = $false;',
        'function Show-Balloon([string]$title, [string]$message, [int]$timeout, [string]$iconName) {',
        '  try {',
        '    Add-Type -AssemblyName System.Windows.Forms;',
        '    Add-Type -AssemblyName System.Drawing;',
        '    $n = New-Object System.Windows.Forms.NotifyIcon;',
        '    $n.Text = "AI CLI Complete Notify";',
        '    if ($iconName -eq "Error") { $n.Icon = [System.Drawing.SystemIcons]::Error }',
        '    elseif ($iconName -eq "Warning") { $n.Icon = [System.Drawing.SystemIcons]::Warning }',
        '    else { $n.Icon = [System.Drawing.SystemIcons]::Information }',
        '    $n.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::$iconName;',
        '    $n.BalloonTipTitle = $title;',
        '    $n.BalloonTipText = $message;',
        '    Register-ObjectEvent -InputObject $n -EventName BalloonTipClicked -Action { $global:clicked = $true } | Out-Null;',
        '    $n.Visible = $true;',
        '    [System.Windows.Forms.Application]::DoEvents();',
        '    Start-Sleep -Milliseconds 120;',
        '    $n.ShowBalloonTip($timeout);',
        '    $elapsed = 0;',
        '    while ($elapsed -lt $timeout -and -not $global:clicked) {',
        '      [System.Windows.Forms.Application]::DoEvents();',
        '      Start-Sleep -Milliseconds 100;',
        '      $elapsed += 100;',
        '    }',
        '    $n.Dispose();',
        '    return $true;',
        '  } catch {',
        '    return $false;',
        '  }',
        '}',
        'function Show-Toast([string]$xmlText, [int]$timeout) {',
        '  try {',
        '    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null;',
        '    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null;',
        '    $doc = New-Object Windows.Data.Xml.Dom.XmlDocument;',
        '    $doc.LoadXml($xmlText);',
        '    $toast = New-Object Windows.UI.Notifications.ToastNotification $doc;',
        '    Register-ObjectEvent -InputObject $toast -EventName Activated -Action { $global:clicked = $true } | Out-Null;',
        '    Register-ObjectEvent -InputObject $toast -EventName Dismissed -Action { $global:dismissed = $true } | Out-Null;',
        '    $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("AI CLI Complete Notify");',
        '    $notifier.Show($toast);',
        '    $elapsed = 0;',
        '    while ($elapsed -lt $timeout -and -not $global:clicked -and -not $global:dismissed) {',
        '      Start-Sleep -Milliseconds 100;',
        '      $elapsed += 100;',
        '    }',
        '    return $true;',
        '  } catch {',
        '    return $false;',
        '  }',
        '}',
        `  $title = '${safeTitle}';`,
        `  $message = '${safeMessage}';`,
        `  $timeout = ${ms};`,
        `  $iconName = '${iconName}';`,
        `  $mode = '${preferredMode}';`,
        `  $xml = @'\n${toastXml}\n'@;`,
        '$shown = $false;',
        '$resolvedMode = "";',
        'if ($mode -eq "toast") {',
        '  $shown = Show-Toast $xml $timeout;',
        '  if ($shown) { $resolvedMode = "TOAST" }',
        '  if (-not $shown) { $shown = Show-Balloon $title $message $timeout $iconName; if ($shown) { $resolvedMode = "BALLOON" } }',
        '} else {',
        '  $shown = Show-Balloon $title $message $timeout $iconName;',
        '  if ($shown) { $resolvedMode = "BALLOON" }',
        '  if (-not $shown) { $shown = Show-Toast $xml $timeout; if ($shown) { $resolvedMode = "TOAST" } }',
        '}',
        'if ($resolvedMode) { Write-Output "MODE:$resolvedMode" }',
        'if ($global:clicked) { Write-Output "CLICKED" }',
      ].join('\n');

      const processRef = spawn(
        'powershell',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Sta', '-Command', psScript],
        { shell: false, windowsHide: true }
      );

      let output = '';
      processRef.stdout.on('data', (chunk) => { output += chunk.toString(); });
      processRef.on('error', (error) => {
        resolve({ ok: false, clicked: false, mode: '', error: error.message || 'desktop notification exited abnormally' });
      });
      processRef.on('close', (code) => {
        const clicked = output.includes('CLICKED');
        const mode = parseNotifyMode(output);
        if (clicked && typeof onClick === 'function') {
          Promise.resolve(onClick()).catch(() => {});
        }
        resolve({
          ok: code === 0,
          clicked,
          mode,
          error: code === 0 ? null : 'desktop notification exited abnormally',
        });
      });
    } catch (error) {
      resolve({ ok: false, clicked: false, mode: '', error: error.message });
    }
  });
}

function notifyDesktopBalloon({ title, message, timeoutMs, onClick, clickHint, kind, projectName }) {
  return new Promise((resolve) => {
    try {
      if (process.platform !== 'win32') {
        resolve({ ok: false, error: 'desktop notifications not supported on this platform' });
        return;
      }

      const plainTitle = String(title || '');
      const plainMessage = String(message || '');
      const plainProject = String(projectName || '');
      const plainHint = String(clickHint || '');
      const finalTitle = plainProject ? `${plainProject} | ${plainTitle}` : plainTitle;
      const clickLine = plainHint ? `\n${plainHint}` : '';
      const body = `${plainMessage}${clickLine}`;

      const notifyMode = getDesktopNotifyMode();
      if (notifyMode === 'popup') {
        showPopupWpf({
          title: plainTitle,
          message: plainMessage,
          timeoutMs,
          onClick,
          clickHint: plainHint,
          kind,
          projectName: plainProject,
        }).then((popupResult) => {
          if (popupResult && popupResult.ok) {
            resolve(popupResult);
            return;
          }

          notifyDesktopViaPowerShell({
            finalTitle,
            body,
            timeoutMs,
            onClick,
            kind,
            clickHint: plainHint,
          }).then((fallbackResult) => {
            resolve({
              ...fallbackResult,
              popupError: popupResult && popupResult.popupError ? popupResult.popupError : null,
            });
          });
        });
        return;
      }

      notifyDesktopViaPowerShell({
        finalTitle,
        body,
        timeoutMs,
        onClick,
        kind,
        clickHint: plainHint,
      }).then(resolve);
    } catch (error) {
      resolve({ ok: false, error: error.message });
    }
  });
}

let _prewarmed = false;
function prewarmWpf() {
  if (_prewarmed || process.platform !== 'win32') return;
  _prewarmed = true;
  try {
    const child = spawn(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command',
       'Add-Type -AssemblyName PresentationFramework; Add-Type -AssemblyName PresentationCore; Add-Type -AssemblyName WindowsBase'],
      { shell: false, windowsHide: true, stdio: 'ignore' }
    );
    child.on('error', () => {});
  } catch (_e) {
    // ignore
  }
}

module.exports = {
  notifyDesktopBalloon,
  prewarmWpf,
};
