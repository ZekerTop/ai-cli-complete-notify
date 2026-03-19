import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppConfig, HookStatus } from '@/lib/types';
import Panel from './ui/Panel';

interface HooksState {
  status: HookStatus | null;
  preview: string;
  refreshStatus: () => Promise<HookStatus | null>;
  install: (target: 'claude' | 'gemini') => Promise<{ ok: boolean; output: string }>;
  uninstall: (target: 'claude' | 'gemini') => Promise<{ ok: boolean; output: string }>;
  refreshPreview: (target: 'claude' | 'gemini') => Promise<void>;
}

interface Props {
  config: AppConfig;
  onUpdate: (fn: (c: AppConfig) => AppConfig) => void;
  hooks: HooksState;
}

export default function HooksPanel({ config, onUpdate, hooks }: Props) {
  const { t } = useTranslation();
  const [previewTarget, setPreviewTarget] = useState<'claude' | 'gemini'>('claude');
  const [claudeMsg, setClaudeMsg] = useState('');
  const [geminiMsg, setGeminiMsg] = useState('');

  useEffect(() => {
    hooks.refreshPreview(previewTarget);
  }, [previewTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstall = async (target: 'claude' | 'gemini') => {
    const setMsg = target === 'claude' ? setClaudeMsg : setGeminiMsg;
    const result = await hooks.install(target);
    setMsg(result.ok ? t('hooks.installOk') : `${t('hooks.installFail')}: ${result.output}`);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleUninstall = async (target: 'claude' | 'gemini') => {
    const setMsg = target === 'claude' ? setClaudeMsg : setGeminiMsg;
    const result = await hooks.uninstall(target);
    setMsg(result.ok ? t('hooks.uninstallOk') : `${t('hooks.uninstallFail')}: ${result.output}`);
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <Panel title={t('section.hooks.title')} subtitle={t('section.hooks.sub')}>
      {/* Notification mode */}
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
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/[0.14] text-[rgba(11,16,34,0.9)] text-[11px] font-extrabold cursor-help border border-white/[0.22]" title={t('hooks.modeHint')}>
          ?
        </span>
      </div>

      {/* Hook cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        {(['claude', 'gemini'] as const).map((target) => {
          const info = hooks.status?.[target];
          const installed = info?.installed ?? false;
          const msg = target === 'claude' ? claudeMsg : geminiMsg;
          return (
            <div
              key={target}
              className="surface-card min-w-0 p-4"
            >
              <div className="flex items-center justify-between gap-2.5 mb-2">
                <div className="font-semibold tracking-[0.01em] text-sm">
                  {target === 'claude' ? 'Claude Code' : 'Gemini CLI'}
                </div>
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
              <div className="text-xs text-muted mb-1">
                {target === 'claude' ? t('hooks.claude.desc') : t('hooks.gemini.desc')}
              </div>
              {info?.settingsPath && (
                <div className="text-[11px] text-muted break-all mb-2">{info.settingsPath}</div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleInstall(target)}
                  disabled={installed}
                  className={`px-3 py-1.5 rounded-xl border text-xs transition-colors disabled:cursor-not-allowed ${
                    installed
                      ? 'border-white/[0.12] bg-white/[0.05] text-muted'
                      : 'border-white/[0.14] bg-gradient-to-br from-accent to-accent2 text-white cursor-pointer'
                  }`}
                >
                  {installed ? t('hooks.status.installed') : t('hooks.install')}
                </button>
                <button
                  onClick={() => handleUninstall(target)}
                  disabled={!installed}
                  className={`px-3 py-1.5 rounded-xl border text-xs transition-colors disabled:cursor-not-allowed ${
                    installed
                      ? 'border-white/[0.14] text-[var(--text)] cursor-pointer'
                      : 'border-white/[0.12] bg-white/[0.04] text-muted'
                  }`}
                  style={
                    installed
                      ? {
                          background:
                            'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
                        }
                      : undefined
                  }
                >
                  {t('hooks.uninstall')}
                </button>
                {msg && (
                  <span className="text-xs text-muted ml-1">{msg}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Config preview */}
      <div className="mt-3.5">
        <div className="flex items-center gap-2.5">
          <label className="text-sm">{t('hooks.configPreview')}</label>
          <select
            value={previewTarget}
            onChange={(e) => setPreviewTarget(e.target.value as 'claude' | 'gemini')}
            className="px-2.5 py-1.5 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
          >
            <option value="claude">Claude Code</option>
            <option value="gemini">Gemini CLI</option>
          </select>
          <button
            onClick={() => navigator.clipboard.writeText(hooks.preview)}
            className="px-2.5 py-1 rounded-[10px] border border-white/[0.14] text-xs cursor-pointer"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
            }}
          >
            {t('hooks.copy')}
          </button>
        </div>
        <pre className="mt-2.5 p-2.5 bg-black/25 border border-white/[0.10] rounded-xl text-xs leading-relaxed overflow-auto max-h-[180px] whitespace-pre-wrap break-all">
          {hooks.preview || '...'}
        </pre>
      </div>
      <div className="mt-2.5 text-xs text-muted leading-relaxed">{t('hooks.hint')}</div>
    </Panel>
  );
}
