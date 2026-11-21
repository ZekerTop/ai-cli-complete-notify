import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { message as showDialog } from '@tauri-apps/plugin-dialog';
import { SOURCES, type AppConfig, type HookActionResult, type HookStatus, type HookTarget, type SourceKey } from '@/lib/types';
import { sidecar } from '@/lib/sidecar';
import Panel from './ui/Panel';
import SourceLogo from './ui/SourceLogo';

interface HooksState {
  status: HookStatus | null;
  preview: string;
  refreshStatus: () => Promise<HookStatus | null>;
  install: (target: HookTarget) => Promise<HookActionResult>;
  uninstall: (target: HookTarget) => Promise<HookActionResult>;
  mount: (target: HookTarget) => Promise<HookActionResult>;
  refreshPreview: (target: HookTarget) => Promise<void>;
}

interface Props {
  config: AppConfig;
  onUpdate: (fn: (c: AppConfig) => AppConfig) => void;
  hooks: HooksState;
  onHooksStatusChange?: (uninstalled: string[]) => void;
}

const TARGETS: { key: SourceKey; title: string; descKey: string }[] = [
  { key: 'claude', title: 'Claude Code', descKey: 'hooks.claude.desc' },
  { key: 'codex', title: 'Codex', descKey: 'hooks.codex.desc' },
  { key: 'gemini', title: 'Gemini CLI', descKey: 'hooks.gemini.desc' },
  { key: 'zcode', title: 'ZCode', descKey: 'hooks.zcode.desc' },
  { key: 'opencode', title: 'OpenCode', descKey: 'hooks.opencode.desc' },
  { key: 'deepseek', title: 'DeepSeek Harness', descKey: 'hooks.deepseek.desc' },
];

const MODE_OPTIONS: {
  key: 'hooks' | 'watch';
  titleKey: string;
  descKey: string;
}[] = [
  { key: 'hooks', titleKey: 'hooks.mode.hooks', descKey: 'hooks.mode.hooks.desc' },
  { key: 'watch', titleKey: 'hooks.mode.watch', descKey: 'hooks.mode.watch.desc' },
];

export default function HooksPanel({ config, onUpdate, hooks, onHooksStatusChange }: Props) {
  const { t, i18n } = useTranslation();
  const [previewTarget, setPreviewTarget] = useState<HookTarget>('claude');
  const [messages, setMessages] = useState<Record<HookTarget, string>>({
    claude: '',
    codex: '',
    gemini: '',
    opencode: '',
    zcode: '',
    deepseek: '',
  });
  const [loading, setLoading] = useState<Record<HookTarget, boolean>>({
    claude: false,
    codex: false,
    gemini: false,
    opencode: false,
    zcode: false,
    deepseek: false,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const currentMode = MODE_OPTIONS[config.ui.notificationMode === 'watch' ? 1 : 0];

  useEffect(() => {
    if (previewTarget !== 'deepseek') hooks.refreshPreview(previewTarget);
  }, [hooks.refreshPreview, previewTarget]);

  useEffect(() => {
    hooks.refreshStatus();
  }, [hooks.refreshStatus]);

  const setTransientMessage = (target: HookTarget, text: string) => {
    setMessages((current) => ({ ...current, [target]: text }));
    if (target === 'deepseek') return;
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
    if (!status.codex?.installed) uninstalled.push('Codex');
    if (!status.gemini?.installed) uninstalled.push('Gemini CLI');
    if (!status.opencode?.installed) uninstalled.push('OpenCode');
    onHooksStatusChange(uninstalled);
  };

  const deepseekError = (result: HookActionResult, fallbackKey: string) => {
    const key = result.errorCode ? `hooks.deepseek.error.${result.errorCode}` : '';
    return key && i18n.exists(key) ? t(key) : `${t(fallbackKey)}: ${result.output}`;
  };

  const handleMount = async () => {
    setLoading((c) => ({ ...c, deepseek: true }));
    setMessages((c) => ({ ...c, deepseek: '' }));
    const result = await hooks.mount('deepseek');
    setPreviewTarget('deepseek');
    setLoading((c) => ({ ...c, deepseek: false }));
    setMessages((c) => ({ ...c, deepseek: result.ok ? t('hooks.deepseek.mountOk') : deepseekError(result, 'hooks.deepseek.mountFail') }));
  };

  const handleInstall = async (target: HookTarget) => {
    setLoading((c) => ({ ...c, [target]: true }));
    const result = await hooks.install(target);
    if (target === 'deepseek') {
      setPreviewTarget(target);
      if (result.ok) setPreviewOpen(true);
    }
    if (target !== 'deepseek' && target === previewTarget) await hooks.refreshPreview(target);
    setLoading((c) => ({ ...c, [target]: false }));
    const successKey = target === 'deepseek' ? 'hooks.deepseek.generateOk' : 'hooks.installOk';
    const failureKey = target === 'deepseek' ? 'hooks.deepseek.generateFail' : 'hooks.installFail';
    setTransientMessage(target, result.ok ? t(successKey) : target === 'deepseek' ? deepseekError(result, failureKey) : `${t(failureKey)}: ${result.output}`);
    await checkAndNotifyStatus();
  };

  const handleUninstall = async (target: HookTarget) => {
    setLoading((c) => ({ ...c, [target]: true }));
    const result = await hooks.uninstall(target);
    if (target !== 'deepseek' && target === previewTarget) await hooks.refreshPreview(target);
    setLoading((c) => ({ ...c, [target]: false }));
    const successKey = target === 'deepseek' ? 'hooks.deepseek.removeOk' : 'hooks.uninstallOk';
    const failureKey = target === 'deepseek' ? 'hooks.deepseek.removeFail' : 'hooks.uninstallFail';
    setTransientMessage(target, result.ok ? t(successKey) : target === 'deepseek' ? deepseekError(result, failureKey) : `${t(failureKey)}: ${result.output}`);
    await checkAndNotifyStatus();
  };

  const openFile = async (filePath: string, target: HookTarget) => {
    const deepseek = target === 'deepseek';
    try {
      const result = await sidecar(['open-file', filePath, ...(deepseek ? ['--text'] : [])]);
      if (deepseek && result.code !== 0) throw new Error(result.stderr || result.stdout);
    } catch (error) {
      console.error('open file failed:', error);
      if (deepseek) {
        await hooks.refreshStatus();
        await showDialog(t('hooks.deepseek.openFail'), { title: 'DeepSeek Harness', kind: 'error' });
      }
    }
  };

  const actionClass = 'rounded-md border border-[var(--border-strong)] bg-[var(--surface-strong)] px-2.5 py-1.5 text-xs hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50';
  const primaryActionClass = 'rounded-md border border-transparent bg-gradient-to-br from-accent to-accent2 px-2.5 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50';
  const previewStatus = hooks.status?.[previewTarget];
  const deepseekPreview = previewTarget === 'deepseek' ? hooks.status?.deepseek : undefined;
  const preview = previewTarget !== 'deepseek' ? hooks.preview
    : deepseekPreview ? t('hooks.deepseek.preview', {
      installCommand: deepseekPreview.installCommand,
      removeCommand: deepseekPreview.removeCommand,
    }) : '';
  const previewSettingsPath = previewTarget !== 'deepseek' || deepseekPreview?.installed ? previewStatus?.settingsPath : undefined;

  return (
    <Panel title={t('section.hooks.title')} subtitle={t('section.hooks.sub')}>
      <details className="group mb-4 rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 focus-visible:outline [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="mb-0.5 block text-[11px] text-muted">{t('hooks.notificationMode')}</span>
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <strong className="text-sm">{t(currentMode.titleKey)}</strong>
              <span className="text-xs text-muted">{t(`hooks.mode.${currentMode.key}.summary`)}</span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold">
            {t('hooks.advancedSettings')}
            <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 border-b border-r border-current group-open:rotate-[225deg]" />
          </span>
        </summary>
        <fieldset className="grid gap-2 border-t border-[var(--border)] p-3 md:grid-cols-2">
          <legend className="sr-only">{t('hooks.notificationMode')}</legend>
          {MODE_OPTIONS.map((option) => (
            <label key={option.key} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 ${
              currentMode.key === option.key ? 'border-[var(--accent)] bg-[var(--surface-strong)]' : 'border-[var(--border)] bg-[var(--surface-ink)]'
            }`}>
              <input
                type="radio"
                name="notification-mode"
                value={option.key}
                checked={currentMode.key === option.key}
                onChange={() => onUpdate((c) => ({ ...c, ui: { ...c.ui, notificationMode: option.key } }))}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                <strong className="block text-xs">{t(option.titleKey)}</strong>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t(option.descKey)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </details>

      <div className="grid items-start gap-3 md:grid-cols-2">
        {TARGETS.map((target) => {
          const info = hooks.status?.[target.key];
          const source = SOURCES.find((item) => item.key === target.key);
          const installed = info?.installed ?? false;
          const manualSetup = target.key === 'deepseek';
          const desktop = manualSetup ? hooks.status?.deepseek?.desktop : undefined;
          const desktopRegistered = desktop?.registered === true;
          const needsRepair = desktopRegistered && !installed;
          const inactive = target.key === 'zcode' && installed && hooks.status?.zcode?.hooksEnabled === false;
          const useDesktopMount = desktop?.available === true;
          const message = messages[target.key];
          const busy = loading[target.key];
          const settingsPath = info?.settingsPath;
          const installButton = (!installed || inactive || manualSetup) && (
            <button type="button" onClick={() => handleInstall(target.key)} disabled={busy} className={useDesktopMount ? actionClass : primaryActionClass}>
              {busy && !useDesktopMount ? '...' : manualSetup ? t(installed || desktopRegistered ? 'hooks.deepseek.update' : 'hooks.deepseek.generate')
                : inactive ? t('hooks.zcode.enable') : t(target.key === 'opencode' ? 'hooks.installPlugin' : 'hooks.install')}
            </button>
          );
          const removeButton = installed && (
            <button type="button" onClick={() => handleUninstall(target.key)} disabled={busy || desktopRegistered}
              title={desktopRegistered ? t('hooks.deepseek.removeBlocked') : undefined} className={actionClass}>
              {t(manualSetup ? 'hooks.deepseek.remove' : 'hooks.uninstall')}
            </button>
          );
          const openButton = settingsPath && (!manualSetup || installed) && (
            <button type="button" onClick={() => openFile(settingsPath, target.key)} className={actionClass}>
              {t('hooks.openFile')}
            </button>
          );
          return (
            <div key={target.key} className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-3">
              <div className="mb-2 flex items-center justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-[0.01em]">
                  {source && <SourceLogo source={source} />}
                  <span>{target.title}</span>
                </div>
                <div
                  className={`px-2.5 py-0.5 rounded-full border text-[11px] whitespace-nowrap ${
                    installed && (desktopRegistered || (!manualSetup && !inactive))
                      ? 'text-[rgba(139,219,166,0.92)] border-[rgba(139,219,166,0.30)] bg-[rgba(139,219,166,0.10)]'
                      : manualSetup && (installed || needsRepair)
                      ? 'text-amber-200 border-amber-300/30 bg-amber-300/10'
                      : 'text-muted border-white/[0.14] bg-black/20'
                  }`}
                >
                  {manualSetup
                    ? t(needsRepair ? 'hooks.deepseek.needsRepair'
                      : desktopRegistered ? 'hooks.deepseek.registered' : installed ? 'hooks.deepseek.generated' : 'hooks.deepseek.notGenerated')
                    : inactive ? t('hooks.zcode.inactive') : installed ? t('hooks.status.installed') : t('hooks.status.notInstalled')}
                </div>
              </div>
              <p className="mb-2 text-xs leading-relaxed text-muted" role={manualSetup && message ? 'status' : undefined}>
                {manualSetup ? message || t(needsRepair ? useDesktopMount ? 'hooks.deepseek.repairMount' : 'hooks.deepseek.repairLocal'
                  : desktopRegistered ? 'hooks.deepseek.desktopRegistered'
                  : useDesktopMount ? desktop.registered === null ? 'hooks.deepseek.desktopUnknown' : 'hooks.deepseek.desktopHint'
                  : 'hooks.deepseek.manualHint') : t(`hooks.${target.key}.summary`)}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {useDesktopMount ? (
                  <button
                    type="button"
                    onClick={handleMount}
                    disabled={busy}
                    className={primaryActionClass}
                  >
                    {busy ? '...' : t(desktopRegistered ? 'hooks.deepseek.mountUpdate' : 'hooks.deepseek.mount')}
                  </button>
                ) : installButton}
                {installed && openButton}
                {!useDesktopMount && removeButton}
              </div>
              {message && !manualSetup && <p role="status" className="mt-2 text-xs text-muted">{message}</p>}
              <details className="mt-2 border-t border-[var(--border)] text-xs text-muted">
                <summary className="w-fit cursor-pointer rounded pt-1.5 hover:text-[var(--text)] focus-visible:outline">
                  {t('hooks.configDetails')}
                </summary>
                <div className="mt-1.5 space-y-1.5 leading-relaxed">
                  <p>{t(target.descKey)}</p>
                  {target.key === 'codex' && <p>{t('hooks.codex.trustHint')}</p>}
                  {useDesktopMount && desktopRegistered && !needsRepair && <p>{t('hooks.deepseek.updateHint')}</p>}
                  {settingsPath && <p className="break-all font-mono text-[11px]">{settingsPath}</p>}
                  {(useDesktopMount || (!installed && openButton)) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {useDesktopMount && <>{installButton}{removeButton}</>}
                      {!installed && openButton}
                    </div>
                  )}
                </div>
              </details>
            </div>
          );
        })}
      </div>

      <details open={previewOpen} onToggle={(event) => setPreviewOpen(event.currentTarget.open)}
        className="group mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs text-muted focus-visible:outline [&::-webkit-details-marker]:hidden">
          {t('hooks.configPreview')}
          <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 border-b border-r border-current group-open:rotate-[225deg]" />
        </summary>
        <div className="px-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t('hooks.previewTarget')}
              value={previewTarget}
              onChange={(e) => setPreviewTarget(e.target.value as HookTarget)}
              className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-ink)] px-2.5 py-1.5 text-xs"
            >
              {TARGETS.map((target) => (
                <option key={target.key} value={target.key}>
                  {target.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(preview)}
              className={actionClass}
            >
              {t('hooks.copy')}
            </button>
            {previewSettingsPath && (
              <button
                type="button"
                onClick={() => openFile(previewSettingsPath, previewTarget)}
                className={actionClass}
              >
                {t('hooks.openFile')}
              </button>
            )}
          </div>
          <pre className="mt-2 max-h-[220px] overflow-auto whitespace-pre-wrap break-all rounded-md border border-[var(--border)] bg-[var(--surface-ink)] p-2.5 text-xs leading-relaxed">
            {preview || '...'}
          </pre>
        </div>
      </details>
    </Panel>
  );
}
