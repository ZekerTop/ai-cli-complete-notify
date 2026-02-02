const { spawn } = require('child_process');
const path = require('path');

const VALID_TARGETS = new Set(['auto', 'vscode', 'terminal']);

function normalizeTarget(value) {
  const raw = String(value || '').trim().toLowerCase();
  return VALID_TARGETS.has(raw) ? raw : 'auto';
}

function detectAutoTarget() {
  const termProgram = String(process.env.TERM_PROGRAM || '').toLowerCase();
  if (process.env.VSCODE_PID) return 'vscode';
  if (termProgram.includes('vscode') || termProgram.includes('code')) return 'vscode';
  return 'terminal';
}

function runPowerShell(script) {
  return new Promise((resolve) => {
    const child = spawn('powershell', ['-NoProfile', '-Command', script], {
      windowsHide: true
    });
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      resolve(Boolean(ok));
    };
    child.on('error', () => done(false));
    child.on('close', (code) => done(code === 0));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function buildWinFocusHelper(forceMaximize) {
  const forceFlag = forceMaximize ? '$true' : '$false';
  return `
$ErrorActionPreference = 'SilentlyContinue';
$wsh = $null;
try { $wsh = New-Object -ComObject WScript.Shell } catch { $wsh = $null }
$forceMaximize = ${forceFlag};
$definition = @'
using System;
using System.Runtime.InteropServices;
public static class Win32 {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowPlacement(IntPtr hWnd, ref WINDOWPLACEMENT lpwndpl);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int dwProcessId);
  public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
  public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
  public const uint SWP_NOSIZE = 0x0001;
  public const uint SWP_NOMOVE = 0x0002;
  public const uint SWP_SHOWWINDOW = 0x0040;
  public const int SW_SHOWNORMAL = 1;
  public const int SW_SHOWMINIMIZED = 2;
  public const int SW_SHOWMAXIMIZED = 3;
  public const int SW_SHOW = 5;
  public const int SW_RESTORE = 9;
  public const int WPF_RESTORETOMAXIMIZED = 0x0002;

  [StructLayout(LayoutKind.Sequential)]
  public struct POINT {
    public int X;
    public int Y;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct WINDOWPLACEMENT {
    public int length;
    public int flags;
    public int showCmd;
    public POINT ptMinPosition;
    public POINT ptMaxPosition;
    public RECT rcNormalPosition;
  }
}
'@;
Add-Type -TypeDefinition $definition -ErrorAction SilentlyContinue | Out-Null;
function Focus-Window($proc) {
  if (-not $proc) { return $false }
  if ($proc.MainWindowHandle -eq 0) { return $false }
  $hWnd = $proc.MainWindowHandle
  [Win32]::AllowSetForegroundWindow(-1) | Out-Null
  $placement = New-Object Win32+WINDOWPLACEMENT
  $placement.length = [System.Runtime.InteropServices.Marshal]::SizeOf($placement)
  [Win32]::GetWindowPlacement($hWnd, [ref]$placement) | Out-Null
  $restoreToMax = $false
  if (($placement.flags -band [Win32]::WPF_RESTORETOMAXIMIZED) -ne 0) { $restoreToMax = $true }
  if ($forceMaximize) { $restoreToMax = $true }
  try { Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue | Out-Null } catch {}
  try {
    $area = [System.Windows.Forms.SystemInformation]::WorkingArea
    $w = $placement.rcNormalPosition.Right - $placement.rcNormalPosition.Left
    $h = $placement.rcNormalPosition.Bottom - $placement.rcNormalPosition.Top
    if ([Math]::Abs($w - $area.Width) -le 32 -and [Math]::Abs($h - $area.Height) -le 32) {
      $restoreToMax = $true
    }
  } catch {}
  if ([Win32]::IsIconic($hWnd)) {
    [Win32]::ShowWindowAsync($hWnd, [Win32]::SW_RESTORE) | Out-Null
    if ($restoreToMax) {
      Start-Sleep -Milliseconds 30
      [Win32]::ShowWindowAsync($hWnd, [Win32]::SW_SHOWMAXIMIZED) | Out-Null
    }
  } elseif ([Win32]::IsZoomed($hWnd) -or $placement.showCmd -eq [Win32]::SW_SHOWMAXIMIZED -or $restoreToMax) {
    [Win32]::ShowWindowAsync($hWnd, [Win32]::SW_SHOWMAXIMIZED) | Out-Null
  } else {
    [Win32]::ShowWindowAsync($hWnd, [Win32]::SW_SHOW) | Out-Null
  }
  if ($wsh) { try { $null = $wsh.AppActivate($proc.Id) } catch {} }
  [Win32]::BringWindowToTop($hWnd) | Out-Null
  [Win32]::SetWindowPos($hWnd, [Win32]::HWND_TOPMOST, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW) | Out-Null
  [Win32]::SetWindowPos($hWnd, [Win32]::HWND_NOTOPMOST, 0, 0, 0, 0, [Win32]::SWP_NOMOVE -bor [Win32]::SWP_NOSIZE -bor [Win32]::SWP_SHOWWINDOW) | Out-Null
  $fg = [Win32]::GetForegroundWindow()
  if ($fg -ne [IntPtr]::Zero -and $fg -ne $hWnd) {
    $tmp = 0
    $fgThread = [Win32]::GetWindowThreadProcessId($fg, [ref]$tmp)
    $curThread = [Win32]::GetWindowThreadProcessId($hWnd, [ref]$tmp)
    [Win32]::AttachThreadInput($fgThread, $curThread, $true) | Out-Null
    [Win32]::SetForegroundWindow($hWnd) | Out-Null
    [Win32]::AttachThreadInput($fgThread, $curThread, $false) | Out-Null
  } else {
    [Win32]::SetForegroundWindow($hWnd) | Out-Null
  }
  Start-Sleep -Milliseconds 60
  $final = [Win32]::GetForegroundWindow()
  return ($final -eq $hWnd)
}
`.trim();
}

async function focusByProcessNamesWin(names, forceMaximize) {
  if (!Array.isArray(names) || names.length === 0) return false;
  const safeNames = names
    .map((n) => String(n || '').trim())
    .filter(Boolean)
    .map((n) => n.replace(/'/g, "''"));
  if (safeNames.length === 0) return false;
  const nameList = safeNames.map((n) => `'${n}'`).join(', ');

  const script = `
${buildWinFocusHelper(forceMaximize)}
$names = @(${nameList});
foreach ($n in $names) {
  $proc = Get-Process | Where-Object { $_.ProcessName -eq $n -and $_.MainWindowHandle -ne 0 } | Sort-Object StartTime -Descending | Select-Object -First 1;
  if ($proc) {
    if (Focus-Window $proc) { exit 0 }
  }
}
exit 1;
`.trim();

  return runPowerShell(script);
}

async function focusByHeuristicWin({ pid, allowedNames, names, titleHints, folderHint }, forceMaximize) {
  const safeNames = Array.isArray(names)
    ? names.map((n) => String(n || '').trim()).filter(Boolean)
    : [];
  const safeAllowed = Array.isArray(allowedNames)
    ? allowedNames.map((n) => String(n || '').trim()).filter(Boolean)
    : [];
  const safeTitles = Array.isArray(titleHints)
    ? titleHints.map((h) => String(h || '').trim()).filter(Boolean)
    : [];
  const nameList = safeNames.map((n) => `'${n.replace(/'/g, "''")}'`).join(', ');
  const allowedList = safeAllowed.map((n) => `'${n.replace(/'/g, "''")}'`).join(', ');
  const titleList = safeTitles.map((h) => `'${h.replace(/'/g, "''")}'`).join(', ');
  const folder = String(folderHint || '').trim().replace(/'/g, "''");
  const safePid = Number.isFinite(Number(pid)) ? Number(pid) : 0;

  if (!nameList && !titleList && !folder && !(safePid && allowedList)) return false;

  const script = `
${buildWinFocusHelper(forceMaximize)}
$pid = ${safePid};
$allowed = @(${allowedList});
$names = @(${nameList});
$titles = @(${titleList});
$folder = '${folder}';
function Focus-By-Title($pattern) {
  if (-not $pattern) { return $false }
  $proc = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*$pattern*" } | Sort-Object StartTime -Descending | Select-Object -First 1;
  if ($proc) { if (Focus-Window $proc) { exit 0 } }
  return $false
}
if ($pid -gt 0 -and $allowed.Count -gt 0) {
  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue;
  if ($proc -and $proc.MainWindowHandle -ne 0 -and $allowed -contains $proc.ProcessName) {
    if (Focus-Window $proc) { exit 0 }
  }
}
foreach ($n in $names) {
  if (-not $n) { continue }
  $proc = Get-Process | Where-Object { $_.ProcessName -eq $n -and $_.MainWindowHandle -ne 0 } | Sort-Object StartTime -Descending | Select-Object -First 1;
  if ($proc) { if (Focus-Window $proc) { exit 0 } }
}
if ($folder) { Focus-By-Title $folder | Out-Null }
foreach ($t in $titles) { Focus-By-Title $t | Out-Null }
exit 1;
`.trim();

  return runPowerShell(script);
}

async function focusByPidWin(pid, allowedNames, forceMaximize) {
  if (!pid || !Number.isFinite(Number(pid))) return false;
  const safeNames = Array.isArray(allowedNames)
    ? allowedNames.map((n) => String(n || '').trim()).filter(Boolean)
    : [];
  const nameList = safeNames.map((n) => `'${n.replace(/'/g, "''")}'`).join(', ');
  if (!nameList) return false;

  const script = `
${buildWinFocusHelper(forceMaximize)}
$pid = ${Number(pid)};
$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue;
if ($proc -and $proc.MainWindowHandle -ne 0 -and @(${nameList}) -contains $proc.ProcessName) {
  if (Focus-Window $proc) { exit 0 }
}
exit 1;
`.trim();

  return runPowerShell(script);
}

async function focusByWindowTitleWin(titleHints, folderHint, forceMaximize) {
  const hints = Array.isArray(titleHints) ? titleHints.map((h) => String(h || '').trim()).filter(Boolean) : [];
  const titleList = hints.map((h) => `'${h.replace(/'/g, "''")}'`).join(', ');
  const folder = String(folderHint || '').trim().replace(/'/g, "''");
  if (!titleList && !folder) return false;

  const script = `
${buildWinFocusHelper(forceMaximize)}
$hints = @(${titleList});
$folder = '${folder}';
if ($folder) {
  $proc = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*$folder*" } | Sort-Object StartTime -Descending | Select-Object -First 1;
  if ($proc) { if (Focus-Window $proc) { exit 0 } }
}
foreach ($h in $hints) {
  if (-not $h) { continue }
  $proc = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*$h*" } | Sort-Object StartTime -Descending | Select-Object -First 1;
  if ($proc) { if (Focus-Window $proc) { exit 0 } }
}
exit 1;
`.trim();

  return runPowerShell(script);
}

async function tryLaunchCode(cwd) {
  const target = String(cwd || '').trim();
  if (!target) return false;
  return new Promise((resolve) => {
    const child = spawn('code', ['-r', target], { windowsHide: true, stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', () => resolve(true));
  });
}

function buildVsCodeFileUri(targetPath) {
  if (!targetPath) return '';
  const resolved = path.resolve(String(targetPath));
  const drive = resolved.slice(0, 2);
  if (!/^[A-Za-z]:$/.test(drive)) return '';
  let rest = resolved.slice(2).replace(/\\/g, '/');
  if (!rest.startsWith('/')) rest = '/' + rest;
  const uri = `vscode://file/${drive[0].toLowerCase()}:${rest}`;
  return encodeURI(uri);
}

async function tryOpenVsCodeProtocol(cwd) {
  const uri = buildVsCodeFileUri(cwd);
  if (!uri) return false;
  return new Promise((resolve) => {
    const child = spawn('cmd', ['/c', 'start', '', uri], { windowsHide: true, stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', () => resolve(true));
  });
}

async function focusWindows(target, context, forceMaximize) {
  const actual = target === 'auto' ? detectAutoTarget() : target;
  const vscodeNames = ['Code', 'Code - Insiders', 'VSCodium', 'Cursor'];
  const terminalNames = ['WindowsTerminal', 'wt', 'pwsh', 'powershell', 'cmd', 'conhost', 'wsl'];
  const primary = actual === 'vscode' ? vscodeNames : terminalNames;
  const fallback = actual === 'vscode' ? terminalNames : vscodeNames;
  const allowed = target === 'auto' ? [...vscodeNames, ...terminalNames] : primary;
  const folderName = context && context.cwd ? path.basename(String(context.cwd)) : '';
  const vsTitleHints = ['Visual Studio Code', 'Code - Insiders', 'VSCodium', 'Cursor'];

  if (actual === 'vscode' && context && context.cwd) {
    void tryOpenVsCodeProtocol(context.cwd);
    void tryLaunchCode(context.cwd);
  }

  const fastOk = await focusByHeuristicWin({
    pid: context && context.ppid ? context.ppid : 0,
    allowedNames: allowed,
    names: primary,
    titleHints: actual === 'vscode' ? vsTitleHints : [],
    folderHint: actual === 'vscode' ? folderName : ''
  }, forceMaximize);
  if (fastOk) return true;
  if (actual === 'vscode' && context && context.cwd) {
    await delay(80);
    const retryFast = await focusByHeuristicWin({
      pid: 0,
      allowedNames: [],
      names: primary,
      titleHints: vsTitleHints,
      folderHint: folderName
    }, forceMaximize);
    if (retryFast) return true;
  }
  if (target === 'auto') return await focusByProcessNamesWin(fallback, forceMaximize);
  return false;
}

function runAppleScript(script) {
  return new Promise((resolve) => {
    const child = spawn('osascript', ['-e', script], { stdio: 'ignore' });
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      resolve(Boolean(ok));
    };
    child.on('error', () => done(false));
    child.on('close', (code) => done(code === 0));
  });
}

async function focusMac(target) {
  const actual = target === 'auto' ? detectAutoTarget() : target;
  const apps = actual === 'vscode'
    ? ['Visual Studio Code', 'Visual Studio Code - Insiders', 'VSCodium', 'Cursor']
    : ['iTerm', 'iTerm2', 'Terminal'];
  for (const app of apps) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await runAppleScript(`tell application "${app}" to activate`);
    if (ok) return true;
  }
  return false;
}

async function focusLinux(target) {
  // Best-effort: xdotool if available. Otherwise, skip.
  const actual = target === 'auto' ? detectAutoTarget() : target;
  const classes = actual === 'vscode'
    ? ['code', 'Code', 'code-oss', 'cursor']
    : ['gnome-terminal', 'konsole', 'xfce4-terminal', 'alacritty', 'kitty', 'wezterm', 'terminal'];

  for (const klass of classes) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await new Promise((resolve) => {
      const child = spawn('xdotool', ['search', '--onlyvisible', '--class', klass, 'windowactivate'], {
        stdio: 'ignore'
      });
      let settled = false;
      const done = (v) => {
        if (settled) return;
        settled = true;
        resolve(Boolean(v));
      };
      child.on('error', () => done(false));
      child.on('close', (code) => done(code === 0));
    });
    if (ok) return true;
  }
  return false;
}

async function focusTarget(config, context) {
  const enabled = Boolean(config && config.ui && config.ui.autoFocusOnNotify);
  if (!enabled) return false;
  const target = normalizeTarget(config && config.ui && config.ui.focusTarget);
  const forceMaximize = Boolean(config && config.ui && config.ui.forceMaximizeOnFocus);

  if (process.platform === 'win32') return focusWindows(target, context, forceMaximize);
  if (process.platform === 'darwin') return focusMac(target, context);
  return focusLinux(target, context);
}

module.exports = {
  focusTarget
};
