import { useCallback, useEffect, useRef, useState } from 'react';
import { checkLatestRelease, type UpdateCheckResult } from '@/lib/update-check.mts';

export type UpdateViewState = { status: 'checking' | 'error' } | UpdateCheckResult;

export function useUpdateCheck(currentVersion: string) {
  const [updateState, setUpdateState] = useState<UpdateViewState>({ status: 'checking' });
  const [hasUpdate, setHasUpdate] = useState(false);
  const activeRequestRef = useRef(0);
  const checkingRef = useRef(false);

  const runUpdateCheck = useCallback(async () => {
    if (checkingRef.current) return;

    checkingRef.current = true;
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    setUpdateState({ status: 'checking' });

    try {
      const result = await checkLatestRelease(currentVersion);
      if (activeRequestRef.current === requestId) {
        setUpdateState(result);
        setHasUpdate(result.status === 'update-available');
      }
    } catch (_error) {
      if (activeRequestRef.current === requestId) setUpdateState({ status: 'error' });
    } finally {
      if (activeRequestRef.current === requestId) checkingRef.current = false;
    }
  }, [currentVersion]);

  useEffect(() => {
    void runUpdateCheck();
    const timer = window.setInterval(() => void runUpdateCheck(), 60 * 60 * 1000);

    return () => {
      window.clearInterval(timer);
      activeRequestRef.current += 1;
      checkingRef.current = false;
    };
  }, [runUpdateCheck]);

  return { updateState, hasUpdate, runUpdateCheck };
}
