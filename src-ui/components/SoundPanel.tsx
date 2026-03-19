import { useTranslation } from 'react-i18next';
import type { AppConfig } from '@/lib/types';
import Panel from './ui/Panel';

interface Props {
  config: AppConfig;
  onUpdate: (fn: (c: AppConfig) => AppConfig) => void;
}

export default function SoundPanel({ config, onUpdate }: Props) {
  const { t } = useTranslation();
  const sound = config.channels.sound;
  const checkboxClass = 'check-toggle mt-0.5';

  return (
    <Panel title={t('section.sound.title')} subtitle={t('section.sound.sub')}>
      <div className="space-y-3">
        {/* TTS Toggle */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sound.tts}
            onChange={() =>
              onUpdate((c) => ({
                ...c,
                channels: {
                  ...c.channels,
                  sound: { ...c.channels.sound, tts: !c.channels.sound.tts },
                },
              }))
            }
            className={checkboxClass}
          />
          <span className="text-sm leading-relaxed">{t('advanced.soundTts')}</span>
        </label>
        <div className="text-xs text-muted">{t('advanced.soundTtsHint')}</div>

        {/* Custom Sound Toggle */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sound.useCustom}
            onChange={() =>
              onUpdate((c) => ({
                ...c,
                channels: {
                  ...c.channels,
                  sound: { ...c.channels.sound, useCustom: !c.channels.sound.useCustom },
                },
              }))
            }
            className={checkboxClass}
          />
          <span className="text-sm leading-relaxed">{t('advanced.soundCustom')}</span>
        </label>

        {/* Custom Path */}
        {sound.useCustom && (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <label className="text-sm text-[rgba(234,240,255,0.82)]">{t('advanced.soundCustomPath')}</label>
              <input
                type="text"
                value={sound.customPath}
                placeholder={t('advanced.soundCustomPlaceholder')}
                onChange={(e) =>
                  onUpdate((c) => ({
                    ...c,
                    channels: {
                      ...c.channels,
                      sound: { ...c.channels.sound, customPath: e.target.value },
                    },
                  }))
                }
                className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm focus:border-[rgba(110,123,255,0.60)] focus:shadow-[0_0_0_4px_rgba(110,123,255,0.18)]"
              />
            </div>
            <div className="text-xs text-muted">{t('advanced.soundCustomHint')}</div>
          </div>
        )}

        {/* Test Button */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={async () => {
              const { sidecar } = await import('@/lib/sidecar');
              await sidecar(['notify', '--source', 'claude', '--force', '--task', 'Sound test']);
            }}
            className="px-3 py-2 rounded-xl border border-white/[0.14] bg-gradient-to-br from-accent to-accent2 text-white text-sm cursor-pointer"
          >
            {t('btn.soundTest')}
          </button>
        </div>
      </div>
    </Panel>
  );
}
