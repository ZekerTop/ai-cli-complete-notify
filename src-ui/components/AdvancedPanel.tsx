import { useTranslation } from 'react-i18next';
import type { AppConfig } from '@/lib/types';
import Panel from './ui/Panel';

interface Props {
  config: AppConfig;
  onUpdate: (fn: (c: AppConfig) => AppConfig) => void;
  autostartEnabled: boolean;
  autostartSupported: boolean;
  autostartBusy: boolean;
  autostartError: string;
  onAutostartChange: (enabled: boolean) => void | Promise<void>;
}

export default function AdvancedPanel({
  config,
  onUpdate,
  autostartEnabled,
  autostartSupported,
  autostartBusy,
  autostartError,
  onAutostartChange,
}: Props) {
  const { t } = useTranslation();
  const checkboxClass = 'check-toggle mt-0.5';
  const autostartStatusLabel = autostartSupported
    ? autostartEnabled
      ? t('advanced.autostartStatusOn')
      : t('advanced.autostartStatusOff')
    : autostartError
      ? `${t('advanced.autostartStatusUnknown')} (${autostartError})`
      : t('advanced.autostartStatusUnsupported');

  return (
    <Panel title={t('section.advanced.title')} subtitle={t('section.advanced.sub')}>
      <div className="space-y-4">
        {/* Feishu card format */}
        <div className="surface-card-soft p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.channels.webhook.useFeishuCard}
              onChange={() =>
                onUpdate((c) => ({
                  ...c,
                  channels: {
                    ...c.channels,
                    webhook: { ...c.channels.webhook, useFeishuCard: !c.channels.webhook.useFeishuCard },
                  },
                }))
              }
              className={checkboxClass}
            />
            <span className="text-sm leading-relaxed">{t('advanced.useFeishuCard')}</span>
          </label>
        </div>

        {/* Close behavior */}
        <div className="surface-card-soft p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm">{t('advanced.closeBehavior')}</label>
            <select
              value={config.ui.closeBehavior}
              onChange={(e) =>
                onUpdate((c) => ({
                  ...c,
                  ui: { ...c.ui, closeBehavior: e.target.value as 'ask' | 'tray' | 'exit' },
                }))
              }
              className="w-full max-w-[260px] px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
            >
              <option value="ask">{t('close.ask')}</option>
              <option value="tray">{t('close.tray')}</option>
              <option value="exit">{t('close.exit')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autostartEnabled}
                disabled={autostartBusy || !autostartSupported}
                onChange={() => void onAutostartChange(!autostartEnabled)}
                className={checkboxClass}
              />
              <span className="text-sm leading-relaxed">{t('advanced.autostart')}</span>
            </label>
            <div className="pl-[30px] text-xs text-muted leading-relaxed">{t('advanced.autostartHint')}</div>
            <div className="pl-[30px] text-xs text-muted leading-relaxed">{autostartStatusLabel}</div>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.ui.silentStart}
                onChange={() =>
                  onUpdate((c) => ({
                    ...c,
                    ui: { ...c.ui, silentStart: !c.ui.silentStart },
                  }))
                }
                className={checkboxClass}
              />
              <span className="text-sm leading-relaxed">{t('advanced.silentStart')}</span>
            </label>
            <div className="pl-[30px] text-xs text-muted leading-relaxed">{t('advanced.silentStartHint')}</div>
          </div>
        </div>

        {/* Auto focus on notify */}
        <div className="surface-card-soft p-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.ui.autoFocusOnNotify}
              onChange={() =>
                onUpdate((c) => ({
                  ...c,
                  ui: { ...c.ui, autoFocusOnNotify: !c.ui.autoFocusOnNotify },
                }))
              }
              className={checkboxClass}
            />
            <span className="text-sm leading-relaxed">{t('advanced.autoFocus')}</span>
          </label>

          {/* Focus target (visible when autoFocus enabled) */}
          {config.ui.autoFocusOnNotify && (
            <>
              <div className="space-y-2">
                <label className="block text-sm">{t('advanced.focusTarget')}</label>
                <select
                  value={config.ui.focusTarget}
                  onChange={(e) =>
                    onUpdate((c) => ({
                      ...c,
                      ui: { ...c.ui, focusTarget: e.target.value as 'auto' | 'vscode' | 'terminal' },
                    }))
                  }
                  className="w-full max-w-[260px] px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
                >
                  <option value="auto">{t('focus.auto')}</option>
                  <option value="vscode">{t('focus.vscode')}</option>
                  <option value="terminal">{t('focus.terminal')}</option>
                </select>
              </div>
              <div className="text-xs text-muted leading-relaxed">{t('advanced.focusHint')}</div>

              {/* Force maximize */}
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.ui.forceMaximizeOnFocus}
                    onChange={() =>
                      onUpdate((c) => ({
                        ...c,
                        ui: { ...c.ui, forceMaximizeOnFocus: !c.ui.forceMaximizeOnFocus },
                      }))
                    }
                    className={checkboxClass}
                  />
                  <span className="text-sm leading-relaxed">{t('advanced.forceMaximize')}</span>
                </label>
                <div className="pl-[30px] text-xs text-muted leading-relaxed">{t('advanced.forceMaximizeHint')}</div>
              </div>
            </>
          )}
        </div>

        <div className="text-xs text-muted leading-relaxed">{t('advanced.closeHint')}</div>
      </div>
    </Panel>
  );
}
