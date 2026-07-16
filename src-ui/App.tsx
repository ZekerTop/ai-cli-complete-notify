import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';
import { useConfig } from '@/hooks/useConfig';
import { useWatch } from '@/hooks/useWatch';
import { useHooks } from '@/hooks/useHooks';
import { getStartupStatus, setAutostartEnabled, type StartupStatus } from '@/lib/startup';
import { sidecar } from '@/lib/sidecar';
import { hideToTray } from '@/lib/window';
import type { EnvSetupStatus } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import ChannelsPanel from '@/components/ChannelsPanel';
import SoundPanel from '@/components/SoundPanel';
import SourcesPanel from '@/components/SourcesPanel';
import WatchPanel from '@/components/WatchPanel';
import HooksPanel from '@/components/HooksPanel';
import TestPanel from '@/components/TestPanel';
import SummaryPanel from '@/components/SummaryPanel';
import AdvancedPanel from '@/components/AdvancedPanel';
import AboutProjectPanel from '@/components/AboutProjectPanel';
import CloseDialog from '@/components/CloseDialog';

declare const __APP_VERSION__: string;

const VERSION = __APP_VERSION__;
const appWindow = getCurrentWindow();

export default function App() {
  const { i18n } = useTranslation();
  const { config, load, save, update, loading, error, setConfig } = useConfig();
  const watch = useWatch();
  const hooks = useHooks();
  const [activePanel, setActivePanel] = useState('notifications');
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [startupStatus, setStartupStatus] = useState<StartupStatus | null>(null);
  const [envStatus, setEnvStatus] = useState<EnvSetupStatus | null>(null);
  const [showEnvBanner, setShowEnvBanner] = useState(true);
  const [showHooksBanner, setShowHooksBanner] = useState<string[] | false>(false);
  const [autostartBusy, setAutostartBusy] = useState(false);
  const didAutoStartWatchRef = useRef(false);
  const closeDialogOpenRef = useRef(false);
  const watchSources = 'all';

  const revealMainWindow = useCallback(async () => {
    await appWindow.show();
    await appWindow.unminimize();
    await appWindow.setFocus();
  }, []);

  const checkEnvStatus = useCallback(async () => {
    try {
      const out = await sidecar(['env-status', '--create-example']);
      const parsed = JSON.parse(out.stdout) as EnvSetupStatus;
      setEnvStatus(parsed);
      setShowEnvBanner(true);
      return parsed;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const fallback: EnvSetupStatus = {
        ok: false,
        status: 'missing',
        dataDir: '',
        envPath: '',
        loadedEnvPath: '',
        envExists: false,
        examplePath: '',
        exampleExists: false,
        exampleCreated: false,
        error: message || 'Unknown error',
      };
      setEnvStatus(fallback);
      setShowEnvBanner(true);
      return fallback;
    }
  }, []);

  const handleAutostartChange = useCallback(
    async (enabled: boolean) => {
      if (!config || autostartBusy) return;

      setAutostartBusy(true);
      try {
        const actualEnabled = await setAutostartEnabled(enabled);
        const nextConfig = {
          ...config,
          ui: { ...config.ui, autostart: actualEnabled },
        };

        setConfig(nextConfig);
        setStartupStatus((prev) => ({
          autostartEnabled: actualEnabled,
          autostartSupported: prev?.autostartSupported ?? true,
          silentStartRequested: prev?.silentStartRequested ?? false,
          autostartError: null,
        }));
        await save(nextConfig);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setStartupStatus((prev) => ({
          autostartEnabled: prev?.autostartEnabled ?? config.ui.autostart,
          autostartSupported: prev?.autostartSupported ?? false,
          silentStartRequested: prev?.silentStartRequested ?? false,
          autostartError: message || 'Unknown error',
        }));
      } finally {
        setAutostartBusy(false);
      }
    },
    [autostartBusy, config, save, setConfig],
  );

  // Load config on mount
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const [cfg, runtimeStartupStatus] = await Promise.all([
        load(),
        getStartupStatus().catch(() => null),
        checkEnvStatus(),
      ]);

      if (cancelled) return;

      if (cfg?.ui?.language) {
        await i18n.changeLanguage(cfg.ui.language);
      }

      if (runtimeStartupStatus) {
        setStartupStatus(runtimeStartupStatus);
        if (cfg && cfg.ui.autostart !== runtimeStartupStatus.autostartEnabled) {
          const syncedConfig = {
            ...cfg,
            ui: { ...cfg.ui, autostart: runtimeStartupStatus.autostartEnabled },
          };
          setConfig(syncedConfig);
          void save(syncedConfig);
        }
      }

      const hookStatus = await hooks.refreshStatus();

      if (cancelled) return;

      // Show banner if hooks mode is active but any hook not installed
      if (cfg && cfg.ui.notificationMode === 'hooks' && hookStatus) {
        const uninstalled: string[] = [];
        if (!hookStatus.claude?.installed) uninstalled.push('Claude Code');
        if (!hookStatus.gemini?.installed) uninstalled.push('Gemini CLI');
        if (!hookStatus.opencode?.installed) uninstalled.push('OpenCode');
        if (uninstalled.length > 0) {
          setShowHooksBanner(uninstalled);
        }
      }

      const shouldStayHidden = Boolean(runtimeStartupStatus?.silentStartRequested) || Boolean(cfg?.ui?.silentStart);
      if (!shouldStayHidden || !cfg) {
        await revealMainWindow();
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [checkEnvStatus, hooks.refreshStatus, i18n, load, revealMainWindow, save, setConfig]);

  useEffect(() => {
    closeDialogOpenRef.current = showCloseDialog;
  }, [showCloseDialog]);

  useEffect(() => {
    let cancelled = false;
    const unlistenPromise = listen('app-close-requested', () => {
      if (cancelled) return;
      if (closeDialogOpenRef.current) return;
      setShowCloseDialog(true);
    });

    return () => {
      cancelled = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Auto-start watch on first successful config load.
  useEffect(() => {
    if (config && !watch.running && !didAutoStartWatchRef.current) {
      didAutoStartWatchRef.current = true;
      watch.start({
        sources: watchSources,
        intervalMs: 1000,
        geminiQuietMs: 3000,
        claudeQuietMs: 60000,
      });
    }
  }, [config, watch.running, watchSources]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissHooksBanner = useCallback(() => {
    setShowHooksBanner(false);
  }, []);

  const handleOpenEnvFolder = useCallback(() => {
    if (!envStatus?.dataDir) return;
    sidecar(['open-file', envStatus.dataDir]).catch((e) => console.error('open env folder failed:', e));
  }, [envStatus]);

  const handleRecheckEnv = useCallback(async () => {
    const status = await checkEnvStatus();
    if (status.status === 'loaded') {
      await load();
    }
  }, [checkEnvStatus, load]);

  const handleDismissEnvBanner = useCallback(() => {
    setShowEnvBanner(false);
  }, []);

  const handleLanguageChange = useCallback(
    (lang: string) => {
      i18n.changeLanguage(lang);
      update((c) => ({ ...c, ui: { ...c.ui, language: lang } }));
    },
    [i18n, update],
  );

  if (!config) {
    const isZh = i18n.language.toLowerCase().startsWith('zh');

    return (
      <div className="flex h-screen items-center justify-center px-6">
        {error ? (
          <div className="loading-card">
            <div className="panel-kicker">{isZh ? 'Launch state' : 'Launch state'}</div>
            <div className="display-font mt-3 text-[24px] leading-none">
              {isZh ? '应用初始化失败' : 'App initialization failed'}
            </div>
            <div className="mt-2 text-sm text-muted leading-relaxed">
              {isZh
                ? '当前界面卡在 Loading，通常是打包后的 sidecar 调用失败。请先重试；如果仍失败，下面这段错误就是排查入口。'
                : 'The app is stuck on Loading because the packaged sidecar failed to start. Retry first; if it still fails, use the error below for diagnosis.'}
            </div>
            <pre className="mt-4 overflow-auto rounded-2xl bg-black/30 p-3 text-xs leading-relaxed text-white/80">
              {error}
            </pre>
            <button
              className="mt-4 inline-flex items-center justify-center rounded-full border border-[rgba(110,123,255,0.28)] bg-[rgba(110,123,255,0.12)] px-4 py-2 text-sm font-medium text-[var(--text)]"
              onClick={() => {
                void load();
              }}
            >
              {loading ? (isZh ? '重试中...' : 'Retrying...') : (isZh ? '重试' : 'Retry')}
            </button>
          </div>
        ) : (
          <div className="text-muted text-sm animate-pulse">Loading...</div>
        )}
      </div>
    );
  }

  return (
    <div className="app-frame">
      <Sidebar
        activePanel={activePanel}
        onNavigate={setActivePanel}
        version={VERSION}
        language={config.ui.language}
        onLanguageChange={handleLanguageChange}
        watchRunning={watch.running}
        onWatchToggle={() => {
          if (watch.running) {
            watch.stop();
          } else {
            watch.start({
              sources: watchSources,
              intervalMs: 1000,
              geminiQuietMs: 3000,
              claudeQuietMs: 60000,
            });
          }
        }}
      />
      <main className="content-shell scroll-smooth">
        {showEnvBanner && envStatus && (
          <div
            className={`mx-4 mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              envStatus.status === 'loaded'
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-yellow-500/30 bg-yellow-500/10'
            }`}
          >
            <span className={`mt-0.5 ${envStatus.status === 'loaded' ? 'text-emerald-300' : 'text-yellow-400'}`}>
              {envStatus.status === 'loaded' ? '✓' : '⚠'}
            </span>
            <span className={`flex-1 leading-relaxed ${envStatus.status === 'loaded' ? 'text-emerald-100/90' : 'text-yellow-100/90'}`}>
              {envStatus.error
                ? ((config.ui.language || 'zh-CN').toLowerCase().startsWith('en')
                    ? `Failed to check .env: ${envStatus.error}`
                    : `检查 .env 失败：${envStatus.error}`)
                : envStatus.status === 'loaded'
                  ? ((config.ui.language || 'zh-CN').toLowerCase().startsWith('en')
                      ? `.env loaded successfully: ${envStatus.loadedEnvPath || envStatus.envPath}`
                      : `.env 配置加载成功：${envStatus.loadedEnvPath || envStatus.envPath}`)
                  : ((config.ui.language || 'zh-CN').toLowerCase().startsWith('en')
                      ? `No .env found. Created ${envStatus.examplePath}; copy it to ${envStatus.envPath} and fill in your notification settings. On macOS, if Finder does not show .env.example, press Command+Shift+. to show hidden files.`
                      : `未找到 .env，已创建 ${envStatus.examplePath}。请复制为 ${envStatus.envPath} 后填写通知配置。macOS 上如果 Finder 看不见 .env.example，请按 Command+Shift+. 显示隐藏文件。`)}
            </span>
            {envStatus.status !== 'loaded' && envStatus.dataDir && (
              <button
                onClick={handleOpenEnvFolder}
                className="shrink-0 rounded-lg border border-yellow-400/30 px-2.5 py-1 text-xs text-yellow-100/90 hover:border-yellow-300/60 hover:text-yellow-50 transition-colors"
              >
                {(config.ui.language || 'zh-CN').toLowerCase().startsWith('en') ? 'Open folder' : '打开目录'}
              </button>
            )}
            <button
              onClick={() => void handleRecheckEnv()}
              className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                envStatus.status === 'loaded'
                  ? 'border-emerald-300/30 text-emerald-100/80 hover:border-emerald-200/60 hover:text-emerald-50'
                  : 'border-yellow-400/30 text-yellow-100/80 hover:border-yellow-300/60 hover:text-yellow-50'
              }`}
            >
              {(config.ui.language || 'zh-CN').toLowerCase().startsWith('en') ? 'Recheck' : '重新检测'}
            </button>
            <button
              onClick={handleDismissEnvBanner}
              className={`ml-1 shrink-0 transition-colors ${
                envStatus.status === 'loaded'
                  ? 'text-emerald-200/55 hover:text-emerald-100'
                  : 'text-yellow-400/60 hover:text-yellow-300'
              }`}
              aria-label="dismiss"
            >✕</button>
          </div>
        )}
        {showHooksBanner && (
          <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
            <span className="mt-0.5 text-yellow-400">⚠</span>
            <span className="flex-1 text-yellow-200/90">
              {(config.ui.language || 'zh-CN').toLowerCase().startsWith('en')
                ? `${(showHooksBanner as string[]).join(', ')} hook${(showHooksBanner as string[]).length > 1 ? 's are' : ' is'} not installed. Without hooks, notifications rely on watch polling and may not fire at the right time. Go to Integrations → Hooks to install.`
                : `${(showHooksBanner as string[]).join('、')} 的 hook 未安装。未安装时将回退到 watch 轮询，可能会出现提醒时机不够及时、与实际完成状态存在偏差的问题。请前往「集成 → Hooks」安装。`}
            </span>
            <button
              onClick={handleDismissHooksBanner}
              className="ml-1 shrink-0 text-yellow-400/60 hover:text-yellow-300 transition-colors"
              aria-label="dismiss"
            >✕</button>
          </div>
        )}
        <div className="content-inner">
          {activePanel === 'notifications' && (
            <>
              <ChannelsPanel config={config} onUpdate={update} />
              <SoundPanel config={config} onUpdate={update} />
            </>
          )}
          {activePanel === 'sources' && (
            <SourcesPanel config={config} onUpdate={update} />
          )}
          {activePanel === 'integrations' && (
            <>
              <HooksPanel config={config} onUpdate={update} hooks={hooks} onHooksStatusChange={(uninstalled) => {
                setShowHooksBanner(uninstalled.length > 0 ? uninstalled : false);
              }} />
              <WatchPanel config={config} onUpdate={update} watch={watch} />
              <TestPanel />
            </>
          )}
          {activePanel === 'summary' && (
            <SummaryPanel config={config} onUpdate={update} />
          )}
          {activePanel === 'system' && (
            <AdvancedPanel
              config={config}
              onUpdate={update}
              autostartEnabled={startupStatus?.autostartEnabled ?? config.ui.autostart}
              autostartSupported={startupStatus?.autostartSupported ?? false}
              autostartBusy={autostartBusy}
              autostartError={startupStatus?.autostartError || ''}
              onAutostartChange={handleAutostartChange}
            />
          )}
          {activePanel === 'about-project' && (
            <AboutProjectPanel currentVersion={VERSION} />
          )}
        </div>
      </main>
      {showCloseDialog && (
        <CloseDialog
          onClose={async (action, remember) => {
            setShowCloseDialog(false);

            let nextConfig = config;
            if (remember && action !== 'cancel' && config) {
              nextConfig = {
                ...config,
                ui: { ...config.ui, closeBehavior: action as 'tray' | 'exit' },
              };
              setConfig(nextConfig);
              await save(nextConfig);
            }

            if (action === 'tray') {
              await hideToTray();
              return;
            }

            if (action === 'exit') {
              await exit(0);
            }
          }}
        />
      )}
    </div>
  );
}
