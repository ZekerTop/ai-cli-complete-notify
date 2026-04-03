import { useTranslation } from 'react-i18next';
import type { AppConfig, ChannelKey } from '@/lib/types';
import { CHANNELS } from '@/lib/types';
import Panel from './ui/Panel';
import Switch from './ui/Switch';

interface Props {
  config: AppConfig;
  onUpdate: (fn: (c: AppConfig) => AppConfig) => void;
}

export default function ChannelsPanel({ config, onUpdate }: Props) {
  const { t, i18n } = useTranslation();

  const toggleChannel = (key: ChannelKey) => {
    onUpdate((c) => {
      const nextEnabled = !c.channels[key].enabled;
      const nextSources = Object.fromEntries(
        Object.entries(c.sources).map(([sourceKey, sourceConfig]) => [
          sourceKey,
          {
            ...sourceConfig,
            channels: {
              ...sourceConfig.channels,
              [key]: nextEnabled,
            },
          },
        ]),
      );

      return {
        ...c,
        channels: {
          ...c.channels,
          [key]: { ...c.channels[key], enabled: nextEnabled },
        },
        sources: nextSources,
      };
    });
  };

  return (
    <Panel title={t('section.channels.title')} subtitle={t('section.channels.sub')}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(248px,1fr))] gap-4">
        {CHANNELS.map((ch) => {
          const enabled = config.channels[ch.key]?.enabled ?? false;
          const statusText = enabled
            ? (i18n.language.toLowerCase().startsWith('zh') ? '已启用' : 'Enabled')
            : (i18n.language.toLowerCase().startsWith('zh') ? '已停用' : 'Disabled');
          return (
            <div
              key={ch.key}
              className={`surface-card flex items-center justify-between gap-3 p-4 transition-all ${
                enabled ? '' : 'opacity-45'
              }`}
            >
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted">
                  {statusText}
                </div>
                <div className="font-serif text-[21px] leading-none">{t(ch.titleKey)}</div>
                <div className="mt-2 max-w-[240px] text-xs text-muted leading-relaxed">{t(ch.descKey)}</div>
              </div>
              <Switch checked={enabled} onChange={() => toggleChannel(ch.key)} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
