export type ThemeMode = 'light' | 'dark' | 'system';
const key = 'ai-notify-theme';
export function readTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(key);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
  } catch {}
  return 'system';
}
export function applyTheme(mode: ThemeMode, systemDark: boolean) {
  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}
export function saveTheme(mode: ThemeMode) {
  try { localStorage.setItem(key, mode); } catch {}
}
