import { invoke } from '@tauri-apps/api/core';

export function hideToTray() {
  return invoke<void>('hide_to_tray');
}

export function setDockHidden(hidden: boolean) {
  return invoke<void>('set_dock_hidden', { hidden });
}
