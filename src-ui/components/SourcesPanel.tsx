import { useTranslation } from 'react-i18next';
import type { AppConfig, SourceKey, ChannelKey } from '@/lib/types';
import { SOURCES, CHANNELS } from '@/lib/types';
import Panel from './ui/Panel';
import Switch from './ui/Switch';

interface Props {
  config: AppConfig;
  onUpdate: (fn: (c: AppConfig) => AppConfig) => void;
}

export default function SourcesPanel({ config, onUpdate }: Props) {
  const { t } = useTranslation();

  const toggleSource = (key: SourceKey) => {
    onUpdate((c) => ({
      ...c,
      sources: {
        ...c.sources,
        [key]: { ...c.sources[key], enabled: !c.sources[key].enabled },
      },
    }));
  };

  const setThreshold = (key: SourceKey, val: number) => {
    onUpdate((c) => ({
      ...c,
      sources: {
        ...c.sources,
        [key]: { ...c.sources[key], minDurationMinutes: val },
      },
    }));
  };

  const toggleSourceChannel = (source: SourceKey, channel: ChannelKey) => {
    onUpdate((c) => ({
      ...c,
      sources: {
        ...c.sources,
        [source]: {
          ...c.sources[source],
          channels: {
            ...c.sources[source].channels,
            [channel]: !c.sources[source].channels[channel],
          },
        },
      },
    }));
  };

  return (
    <Panel title={t('section.sources.title')} subtitle={t('section.sources.sub')}>
      <div className="flex flex-col gap-4">
        {SOURCES.map((src) => {
          const s = config.sources[src.key];
          if (!s) return null;
          return (
            <div
              key={src.key}
              className={`surface-card p-4 ${s.enabled ? '' : 'opacity-45'}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Source profile</div>
                  <div className="mt-3 font-serif text-[24px] leading-none">{t(src.titleKey)}</div>
                  <div className="mt-2 text-[13px] text-muted leading-relaxed">{t(src.descKey)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="surface-card-soft flex items-center gap-2 px-3 py-2.5">
                    <label className="text-[11px] uppercase tracking-[0.16em] text-muted whitespace-nowrap">{t('sources.threshold')}</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={s.minDurationMinutes}
                      onChange={(e) => setThreshold(src.key, Number(e.target.value))}
                      className="w-16 rounded-2xl border border-white/[0.10] bg-black/20 px-2 py-2 text-center text-[13px] text-[var(--text)] outline-none"
                    />
                  </div>
                  <Switch checked={s.enabled} onChange={() => toggleSource(src.key)} />
                </div>
              </div>

              {/* Channel grid */}
              <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
                {CHANNELS.map((ch) => {
                  const active = s.channels[ch.key] ?? false;
                  const globallyEnabled = config.channels[ch.key]?.enabled ?? false;
                  return (
                    <div
                      key={ch.key}
                      className="surface-card-soft flex items-center justify-between gap-2.5 px-3 py-3"
                    >
                      <span className="text-[12px] text-[rgba(232,239,255,0.88)]">{t(ch.titleKey)}</span>
                      <Switch
                        checked={active}
                        onChange={() => toggleSourceChannel(src.key, ch.key)}
                        disabled={!s.enabled || !globallyEnabled}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
