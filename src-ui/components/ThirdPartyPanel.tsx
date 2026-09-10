import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppConfig } from '@/lib/types';
import { CHANNELS } from '@/lib/types';
import { open } from '@tauri-apps/plugin-shell';
import { sidecar } from '@/lib/sidecar';
import Panel from './ui/Panel';
import Switch from './ui/Switch';

interface Props {
  config: AppConfig;
  onSave: (patch: Partial<AppConfig>) => Promise<AppConfig | null>;
}

interface HerdrStatus {
  available: boolean;
  installed: boolean;
  configured: boolean;
  enabled: boolean;
  error?: string;
  dependencies: { bash: boolean; python3: boolean };
}

export default function ThirdPartyPanel({ config, onSave }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<HerdrStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState<'configure' | 'enable' | null>(null);
  const source = config.sources.herdr;
  const ready = status?.available && status.installed && status.enabled && status.configured
    && status.dependencies.bash && status.dependencies.python3;

  const check = async () => {
    setStatus(null);
    const out = await sidecar(['hooks', 'status', '--target', 'herdr']);
    if (out.code !== 0) throw new Error(t('thirdParty.failed'));
    const result = JSON.parse(out.stdout).herdr as HerdrStatus;
    setStatus(result);
    return result;
  };

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setConfirmation(null);
    try {
      await action();
    } catch {
      // External command output can contain user configuration; keep it out of the UI.
      setMessage(t('thirdParty.failed'));
    } finally {
      setBusy(false);
    }
  };

  const saveSource = async (patch: Partial<typeof source>) => {
    const saved = await onSave({ sources: { herdr: { ...source, ...patch } } });
    if (!saved) throw new Error('Save failed');
  };

  return (
    <Panel title={t('thirdParty.title')} subtitle={t('thirdParty.subtitle')}>
      <div className="surface-card p-5 space-y-5" aria-busy={busy}>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{t('thirdParty.optional')}</div>
          <h3 className="mt-3 font-serif text-[28px]">Herdr</h3>
          <p className="mt-2 text-[13px] text-muted">{t('thirdParty.description')}</p>
          <button className="mt-2 inline-block text-[13px] underline" onClick={() => void run(() => open('https://github.com/8liang/herdr-ai-notify'))}>8liang / herdr-ai-notify ↗</button>
        </div>
        <p className="text-[13px] text-muted">{t('thirdParty.dependencies')}</p>
        <div className="surface-card-soft p-4 space-y-3">
          <p className="text-[13px]" role="status">
            {busy ? t('thirdParty.busy') : !status ? t('thirdParty.unchecked')
              : !status.available ? t('thirdParty.unavailable')
              : !status.dependencies.bash || !status.dependencies.python3 ? t('thirdParty.missingDependencies')
              : ready ? t('thirdParty.ready') : t('thirdParty.unconfigured')}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="px-3 py-2 rounded-xl border border-white/[0.14] text-xs disabled:opacity-45" disabled={busy} onClick={() => void run(async () => { await check(); })}>{t('thirdParty.check')}</button>
            <button className="px-3 py-2 rounded-xl border border-white/[0.14] text-xs disabled:opacity-45" disabled={busy} onClick={() => setConfirmation('configure')}>{t('thirdParty.configure')}</button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px]">{t('thirdParty.enable')}</p>
            <p className="mt-1 text-[12px] text-muted">{t('thirdParty.enableHint')}</p>
          </div>
          <Switch label={t('thirdParty.enable')} checked={source.enabled} disabled={busy || (!source.enabled && !ready)} onChange={() => source.enabled
            ? void run(() => saveSource({ enabled: false })) : setConfirmation('enable')} />
        </div>
        {confirmation && (
          <div className="surface-card-soft p-4 space-y-3" role="group" aria-label={t('thirdParty.confirm')}>
            <p className="text-[13px]">{t(confirmation === 'configure' ? 'thirdParty.configureWarning' : 'thirdParty.duplicateWarning')}</p>
            <div className="flex gap-3">
              <button className="px-3 py-2 rounded-xl border border-white/[0.14] bg-gradient-to-br from-accent to-accent2 text-xs disabled:opacity-45" disabled={busy} onClick={() => void run(async () => {
                if (confirmation === 'configure') {
                  const result = await check();
                  if (!result.available || !result.dependencies.bash || !result.dependencies.python3) return;
                  const out = await sidecar(['hooks', 'install', '--target', 'herdr']);
                  if (out.code !== 0) throw new Error('Configuration failed');
                  await check();
                  setMessage(t('thirdParty.configured'));
                } else {
                  await saveSource({ enabled: true });
                }
              })}>{t('thirdParty.confirm')}</button>
              <button className="px-3 py-2 rounded-xl border border-white/[0.14] text-xs disabled:opacity-45" onClick={() => setConfirmation(null)}>{t('thirdParty.cancel')}</button>
            </div>
          </div>
        )}
        <div>
          <p className="text-[13px] text-muted">{t('thirdParty.channels')}</p>
          <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            {CHANNELS.filter((ch) => config.channels[ch.key]?.enabled).map((ch) => (
              <div key={ch.key} className="surface-card-soft flex items-center justify-between gap-3 p-3">
                <span className="text-[12px]">{t(ch.titleKey)}</span>
                <Switch label={t(ch.titleKey)} checked={source.channels[ch.key] ?? false} disabled={busy} onChange={() => void run(() => saveSource({ channels: { ...source.channels, [ch.key]: !source.channels[ch.key] } }))} />
              </div>
            ))}
          </div>
        </div>
        {message && <p className="text-[13px]" role="alert">{message}</p>}
      </div>
    </Panel>
  );
}
