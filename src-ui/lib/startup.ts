import { invoke } from '@tauri-apps/api/core';

export interface StartupStatus {
  autostartEnabled: boolean;
  autostartSupported: boolean;
  silentStartRequested: boolean;
  autostartError: string | null;
}

export async function getStartupStatus(): Promise<StartupStatus> {
  return invoke<StartupStatus>('get_startup_status');
}

export async function setAutostartEnabled(enabled: boolean): Promise<boolean> {
  return invoke<boolean>('set_autostart_enabled', { enabled });
}
