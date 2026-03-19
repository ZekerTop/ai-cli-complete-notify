import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from '@tauri-apps/plugin-dialog';
import { open } from '@tauri-apps/plugin-shell';
import type { AppConfig } from '@/lib/types';
import { sidecar } from '@/lib/sidecar';
import Panel from './ui/Panel';

interface WatchState {
  running: boolean;
  logs: string[];
  start: (opts: {
    sources?: string;
    intervalMs?: number;
    geminiQuietMs?: number;
    claudeQuietMs?: number;
  }) => Promise<void>;
  stop: () => Promise<void>;
  clearLogs: () => void;
}

interface Props {
  config: AppConfig;
  onUpdate: (fn: (c: AppConfig) => AppConfig) => void;
  watch: WatchState;
}

export default function WatchPanel({ config, onUpdate, watch }: Props) {
  const { t } = useTranslation();
  const logRef = useRef<HTMLPreElement>(null);
  const [openingLog, setOpeningLog] = useState(false);
  const checkboxClass = 'check-toggle mt-0.5';
  const watchSources = 'all';
  const sourceItems = [
    { label: 'Claude', active: true },
    { label: 'Codex', active: true },
    { label: 'Gemini', active: true },
  ];

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [watch.logs]);

  async function handleOpenWatchLog() {
    if (openingLog) return;
    setOpeningLog(true);
    try {
      const { stdout, stderr, code } = await sidecar(['paths']);
      if (code !== 0) {
        throw new Error(stderr || 'paths command failed');
      }

      const payload = JSON.parse(stdout || '{}') as {
        latestWatchLogPath?: string;
        watchLogsDir?: string;
        dataDir?: string;
      };
      const logPath = typeof payload.latestWatchLogPath === 'string' ? payload.latestWatchLogPath.trim() : '';
      const fallbackPath =
        typeof payload.watchLogsDir === 'string' && payload.watchLogsDir.trim()
          ? payload.watchLogsDir.trim()
          : typeof payload.dataDir === 'string'
            ? payload.dataDir.trim()
            : '';

      if (logPath) {
        await open(logPath);
        return;
      }

      if (fallbackPath) {
        await open(fallbackPath);
        await message(t('watch.logNotReady'), {
          title: t('section.watch.title'),
          kind: 'info',
        });
        return;
      }

      await message(t('watch.logNotReady'), {
        title: t('section.watch.title'),
        kind: 'warning',
      });
    } catch (_error) {
      await message(t('watch.logOpenFailed'), {
        title: t('section.watch.title'),
        kind: 'error',
      });
    } finally {
      setOpeningLog(false);
    }
  }

  const badge = (
    <div className={`status-pill ${watch.running ? 'is-on' : ''}`}>
      {watch.running ? t('watch.status.running') : t('watch.status.stopped')}
    </div>
  );

  return (
    <Panel title={t('section.watch.title')} subtitle={t('section.watch.sub')} badge={badge}>
      <div className="grid grid-cols-2 gap-3">
        {/* Left: controls */}
        <div
          className="surface-card p-4 flex flex-col min-h-[320px]"
        >
          {/* Source scope */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {sourceItems.map((item) => (
              <span
                key={item.label}
                className={`inline-flex items-center rounded-full border px-3 py-2 text-xs tracking-[0.08em] uppercase ${
                  item.active
                    ? 'border-[rgba(110,123,255,0.28)] bg-[rgba(110,123,255,0.12)] text-[rgba(232,239,255,0.96)]'
                    : 'border-white/[0.10] bg-black/[0.12] text-muted'
                }`}
              >
                {item.label}
              </span>
            ))}
          </div>

          {/* Numeric controls */}
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <label className="text-sm">{t('watch.polling')}</label>
              <input
                type="number"
                min={500}
                step={100}
                defaultValue={1000}
                className="w-24 px-2 py-1.5 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <label className="text-sm">{t('watch.claudeDebounce')}</label>
              <input
                type="number"
                min={1000}
                step={1000}
                defaultValue={60000}
                className="w-24 px-2 py-1.5 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <label className="text-sm">{t('watch.debounce')}</label>
              <input
                type="number"
                min={500}
                step={100}
                defaultValue={3000}
                className="w-24 px-2 py-1.5 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <label className="text-sm">{t('watch.logRetention')}</label>
              <input
                type="number"
                min={1}
                step={1}
                value={config.ui.watchLogRetentionDays}
                onChange={(e) =>
                  onUpdate((c) => ({
                    ...c,
                    ui: { ...c.ui, watchLogRetentionDays: Number(e.target.value) || 7 },
                  }))
                }
                className="w-24 px-2 py-1.5 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
              />
            </div>
          </div>

          {/* Confirm alert toggle */}
          <label className="mt-2.5 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.ui.confirmAlert.enabled}
              onChange={() =>
                onUpdate((c) => ({
                  ...c,
                  ui: {
                    ...c.ui,
                    confirmAlert: { ...c.ui.confirmAlert, enabled: !c.ui.confirmAlert.enabled },
                  },
                }))
              }
              className={checkboxClass}
            />
            <span className="text-sm leading-relaxed">{t('watch.confirmEnabled')}</span>
          </label>
          <div className="text-xs text-muted mt-1 leading-relaxed">{t('watch.confirmUsageHint')}</div>

          {/* Start/Stop buttons */}
          <div className="mt-3 flex items-center gap-2.5">
            <button
              onClick={() =>
                watch.start({
                  sources: watchSources,
                  intervalMs: 1000,
                  geminiQuietMs: 3000,
                  claudeQuietMs: 60000,
                })
              }
              disabled={watch.running}
              className="px-3 py-2 rounded-xl border border-white/[0.14] bg-gradient-to-br from-accent to-accent2 text-white text-sm cursor-pointer disabled:opacity-50"
            >
              {t('btn.watchStart')}
            </button>
            <button
              onClick={() => watch.stop()}
              disabled={!watch.running}
              className="px-3 py-2 rounded-xl border border-white/[0.14] text-sm cursor-pointer disabled:opacity-50"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
              }}
            >
              {t('btn.watchStop')}
            </button>
          </div>
          {config.ui.notificationMode === 'hooks' && (
            <div className="mt-2 text-xs text-muted leading-relaxed">
              {t('watch.hooksModeHint')}
            </div>
          )}
          <div className="mt-2.5 text-xs text-muted leading-relaxed">{t('watch.hint')}</div>
        </div>

        {/* Right: logs */}
        <div
          className="surface-card p-4"
        >
          <div className="flex items-center justify-between gap-2.5 mb-2.5">
            <div className="font-semibold tracking-[0.01em] text-sm">{t('watch.logs')}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenWatchLog}
                disabled={openingLog}
                className="px-2.5 py-1 rounded-[10px] border border-white/[0.14] text-xs cursor-pointer disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
                }}
              >
                {t('btn.openWatchLog')}
              </button>
              <button
                onClick={watch.clearLogs}
                className="px-2.5 py-1 rounded-[10px] border border-white/[0.14] text-xs cursor-pointer"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <pre
            ref={logRef}
            className="m-0 p-2.5 bg-black/25 border border-white/[0.10] rounded-xl text-xs leading-relaxed overflow-auto whitespace-pre-wrap break-all"
            style={{ minHeight: '280px', maxHeight: '400px' }}
          >
            {watch.logs.length === 0 ? (
              <span className="text-muted">No logs yet</span>
            ) : (
              watch.logs.join('\n')
            )}
          </pre>
        </div>
      </div>
    </Panel>
  );
}
