import { useState, useCallback, useRef } from 'react';
import { sidecar } from '@/lib/sidecar';
import type { AppConfig } from '@/lib/types';

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const out = await sidecar(['config']);
      const parsed = JSON.parse(out.stdout) as AppConfig;
      setConfig(parsed);
      return parsed;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Failed to load config:', e);
      setError(message || 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(
    async (patch: Partial<AppConfig>) => {
      try {
        const out = await sidecar(['config', '--set', JSON.stringify(patch)]);
        const parsed = JSON.parse(out.stdout) as AppConfig;
        setConfig(parsed);
        setError('');
        return parsed;
      } catch (e) {
        console.error('Failed to save config:', e);
        return null;
      }
    },
    [],
  );

  const update = useCallback(
    (updater: (c: AppConfig) => AppConfig) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        // Debounced save
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          sidecar(['config', '--set', JSON.stringify(next)]).catch(() => {});
        }, 300);
        return next;
      });
    },
    [],
  );

  return { config, loading, error, load, save, update, setConfig };
}
