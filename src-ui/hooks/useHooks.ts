import { useState, useCallback } from 'react';
import { sidecar } from '@/lib/sidecar';
import type { HookStatus } from '@/lib/types';

export function useHooks() {
  const [status, setStatus] = useState<HookStatus | null>(null);
  const [preview, setPreview] = useState('');

  const refreshStatus = useCallback(async () => {
    try {
      const out = await sidecar(['hooks', 'status']);
      const parsed = JSON.parse(out.stdout) as HookStatus;
      setStatus(parsed);
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const install = useCallback(
    async (target: 'claude' | 'gemini' | 'opencode') => {
      try {
        const out = await sidecar(['hooks', 'install', '--target', target]);
        await refreshStatus();
        return { ok: out.code === 0, output: out.stdout };
      } catch (e) {
        return { ok: false, output: String(e) };
      }
    },
    [refreshStatus],
  );

  const uninstall = useCallback(
    async (target: 'claude' | 'gemini' | 'opencode') => {
      try {
        const out = await sidecar(['hooks', 'uninstall', '--target', target]);
        await refreshStatus();
        return { ok: out.code === 0, output: out.stdout };
      } catch (e) {
        return { ok: false, output: String(e) };
      }
    },
    [refreshStatus],
  );

  const refreshPreview = useCallback(async (target: 'claude' | 'gemini' | 'opencode') => {
    try {
      const out = await sidecar(['hooks', 'preview', '--target', target]);
      setPreview(out.stdout);
    } catch {
      setPreview('');
    }
  }, []);

  return { status, preview, refreshStatus, install, uninstall, refreshPreview };
}
