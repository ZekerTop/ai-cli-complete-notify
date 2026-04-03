import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppConfig, HookStatus } from '@/lib/types';
import { sidecar } from '@/lib/sidecar';
import Panel from './ui/Panel';

type HookTarget = 'claude' | 'gemini' | 'opencode';

interface HooksState {
  status: HookStatus | null;
  preview: string;
  refreshStatus: () => Promise<HookStatus | null>;
  install: (target: HookTarget) => Promise<{ ok: boolean; output: string }>;
  uninstall: (target: HookTarget) => Promise<{ ok: boolean; output: string }>;
  refreshPreview: (target: HookTarget) => Promise<void>;
}

interface Props {
  config: AppConfig;
  onUpdate: (fn: (c: AppConfig) => AppConfig) => void;
  hooks: HooksState;
  onHooksStatusChange?: (uninstalled: string[]) => void;
}

const TARGETS: { key: HookTarget; title: string; descKey: string }[] = [
  { key: 'claude', title: 'Claude Code', descKey: 'hooks.claude.desc' },
  { key: 'gemini', title: 'Gemini CLI', descKey: 'hooks.gemini.desc' },
  { key: 'opencode', title: 'OpenCode', descKey: 'hooks.opencode.desc' },
];

export default function HooksPanel({ config, onUpdate, hooks, onHooksStatusChange }: Props) {
  const { t } = useTranslation();
  const [previewTarget, setPreviewTarget] = useState<HookTarget>('claude');
  const [messages, setMessages] = useState<Record<HookTarget, string>>({
    claude: '',
    gemini: '',
    opencode: '',
  });
  const [loading, setLoading] = useState<Record<HookTarget, boolean>>({
    claude: false,
    gemini: false,
    opencode: false,
  });

  useEffect(() => {
    hooks.refreshPreview(previewTarget);
  }, [hooks.refreshPreview, previewTarget]);

  const setTransientMessage = (target: HookTarget, text: string) => {
    setMessages((current) => ({ ...current, [target]: text }));
    window.setTimeout(() => {
      setMessages((current) => ({ ...current, [target]: '' }));
    }, 3000);
  };

  const checkAndNotifyStatus = async () => {
    if (!onHooksStatusChange) return;
    const status = await hooks.refreshStatus();
    if (!status) return;
    const uninstalled: string[] = [];
    if (!status.claude?.installed) uninstalled.push('Claude Code');
    if (!status.gemini?.installed) uninstalled.push('Gemini CLI');
    if (!status.opencode?.installed) uninstalled.push('OpenCode');
    onHooksStatusChange(uninstalled);
  };

  const handleInstall = async (target: HookTarget) => {
    setLoading((c) => ({ ...c, [target]: true }));
    const result = await hooks.install(target);
    if (target === previewTarget) await hooks.refreshPreview(target);
    setLoading((c) => ({ ...c, [target]: false }));
    setTransientMessage(target, result.ok ? t('hooks.installOk') : `${t('hooks.installFail')}: ${result.output}`);
    await checkAndNotifyStatus();
  };

  const handleUninstall = async (target: HookTarget) => {
    setLoading((c) => ({ ...c, [target]: true }));
    const result = await hooks.uninstall(target);
    if (target === previewTarget) await hooks.refreshPreview(target);
    setLoading((c) => ({ ...c, [target]: false }));
    setTransientMessage(target, result.ok ? t('hooks.uninstallOk') : `${t('hooks.uninstallFail')}: ${result.output}`);
    await checkAndNotifyStatus();
  };

  const btnStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
  };

  const openFile = (filePath: string) => {
    sidecar(['open-file', filePath]).catch((e) => console.error('open file failed:', e));
  };

  return (
    <Panel title={t('section.hooks.title')} subtitle={t('section.hooks.sub')}>
      <div className="flex items-center gap-2.5 mb-3">
        <label className="text-sm">{t('hooks.notificationMode')}</label>
        <select
          value={config.ui.notificationMode}
          onChange={(e) =>
            onUpdate((c) => ({
              ...c,
              ui: { ...c.ui, notificationMode: e.target.value as 'watch' | 'hooks' },
            }))
          }
          className="px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
        >
          <option value="watch">{t('hooks.mode.watch')}</option>
          <option value="hooks">{t('hooks.mode.hooks')}</option>
        </select>
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/[0.14] text-[rgba(11,16,34,0.9)] text-[11px] font-extrabold cursor-help border border-white/[0.22]"
          title={t('hooks.modeHint')}
        >
          ?
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        {TARGETS.map((target) => {
          const info = hooks.status?.[target.key];
          const installed = info?.installed ?? false;
          const message = messages[target.key];
          const busy = loading[target.key];
          return (
            <div key={target.key} className="surface-card min-w-0 p-4">
              <div className="flex items-center justify-between gap-2.5 mb-2">
                <div className="font-semibold tracking-[0.01em] text-sm">{target.title}</div>
                <div
                  className={`px-2.5 py-0.5 rounded-full border text-[11px] whitespace-nowrap ${
                    installed
                      ? 'text-[rgba(139,219,166,0.92)] border-[rgba(139,219,166,0.30)] bg-[rgba(139,219,166,0.10)]'
                      : 'text-muted border-white/[0.14] bg-black/20'
                  }`}
                >
                  {installed ? t('hooks.status.installed') : t('hooks.status.notInstalled')}
                </div>
              </div>
              <div className="text-xs text-muted mb-1">{t(target.descKey)}</div>
              {info?.settingsPath && (
                <div className="text-[11px] text-muted break-all mb-2">{info.settingsPath}</div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleInstall(target.key)}
                  disabled={installed || busy}
                  className={`px-3 py-1.5 rounded-xl border text-xs transition-colors disabled:cursor-not-allowed ${
                    installed
                      ? 'border-white/[0.12] bg-white/[0.05] text-muted'
                      : 'border-white/[0.14] bg-gradient-to-br from-accent to-accent2 text-white cursor-pointer'
                  }`}
                >
                  {busy && !installed ? '...' : installed ? t('hooks.status.installed') : t('hooks.install')}
                </button>
                <button
                  onClick={() => handleUninstall(target.key)}
                  disabled={!installed || busy}
                  className={`px-3 py-1.5 rounded-xl border text-xs transition-colors disabled:cursor-not-allowed ${
                    installed
                      ? 'border-white/[0.14] text-[var(--text)] cursor-pointer'
                      : 'border-white/[0.12] bg-white/[0.04] text-muted'
                  }`}
                  style={installed ? btnStyle : undefined}
                >
                  {busy && installed ? '...' : t('hooks.uninstall')}
                </button>
                {info?.settingsPath && (
                  <button
                    onClick={() => openFile(info.settingsPath)}
                    className="px-3 py-1.5 rounded-xl border border-white/[0.14] text-xs cursor-pointer"
                    style={btnStyle}
                  >
                    {t('hooks.openFile')}
                  </button>
                )}
                {message && <span className="text-xs text-muted ml-1">{message}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3.5">
        <div className="flex items-center gap-2.5">
          <label className="text-sm">{t('hooks.configPreview')}</label>
          <select
            value={previewTarget}
            onChange={(e) => setPreviewTarget(e.target.value as HookTarget)}
            className="px-2.5 py-1.5 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
          >
            {TARGETS.map((target) => (
              <option key={target.key} value={target.key}>
                {target.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => navigator.clipboard.writeText(hooks.preview)}
            className="px-2.5 py-1 rounded-[10px] border border-white/[0.14] text-xs cursor-pointer"
            style={btnStyle}
          >
            {t('hooks.copy')}
          </button>
          {hooks.status?.[previewTarget]?.settingsPath && (
            <button
              onClick={() => openFile(hooks.status![previewTarget]!.settingsPath)}
              className="px-2.5 py-1 rounded-[10px] border border-white/[0.14] text-xs cursor-pointer"
              style={btnStyle}
            >
              {t('hooks.openFile')}
            </button>
          )}
        </div>
        <pre className="mt-2.5 p-2.5 bg-black/25 border border-white/[0.10] rounded-xl text-xs leading-relaxed overflow-auto max-h-[220px] whitespace-pre-wrap break-all">
          {hooks.preview || '...'}
        </pre>
      </div>
      <div className="mt-2.5 text-xs text-muted leading-relaxed">{t('hooks.hint')}</div>
    </Panel>
  );
}
