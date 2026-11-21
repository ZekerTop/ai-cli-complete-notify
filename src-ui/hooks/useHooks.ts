import { useState, useCallback } from 'react';
import { sidecar } from '@/lib/sidecar';
import type { HookActionResult, HookStatus, HookTarget } from '@/lib/types';

function actionResult(out: { code: number; stdout: string; stderr: string }): HookActionResult {
  try {
    const parsed = JSON.parse(out.stdout);
    return {
      ok: out.code === 0 && parsed.ok !== false,
      output: typeof parsed.error === 'string' ? parsed.error : out.stdout || out.stderr,
      errorCode: typeof parsed.errorCode === 'string' ? parsed.errorCode : undefined,
    };
  } catch {
    return { ok: out.code === 0, output: out.stdout || out.stderr };
  }
}

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
    async (target: HookTarget) => {
      try {
        const out = await sidecar(['hooks', 'install', '--target', target]);
        await refreshStatus();
        return actionResult(out);
      } catch (e) {
        return { ok: false, output: String(e) };
      }
    },
    [refreshStatus],
  );

  const uninstall = useCallback(
    async (target: HookTarget) => {
      try {
        const out = await sidecar(['hooks', 'uninstall', '--target', target, ...(target === 'deepseek' ? ['--json'] : [])]);
        await refreshStatus();
        return actionResult(out);
      } catch (e) {
        return { ok: false, output: String(e) };
      }
    },
    [refreshStatus],
  );

  const mount = useCallback(
    async (target: HookTarget) => {
      try {
        const out = await sidecar(['hooks', 'mount', '--target', target, '--json']);
        await refreshStatus();
        return actionResult(out);
      } catch (e) {
        return { ok: false, output: String(e) };
      }
    },
    [refreshStatus],
  );

  const refreshPreview = useCallback(async (target: HookTarget) => {
    try {
      const out = await sidecar(['hooks', 'preview', '--target', target]);
      setPreview(out.stdout);
    } catch {
      setPreview('');
    }
  }, []);

  return { status, preview, refreshStatus, install, uninstall, mount, refreshPreview };
}
