import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-shell';

const NAV_ITEMS = [
  { id: 'notifications', key: 'nav.notifications', index: '01' },
  { id: 'sources', key: 'nav.sources', index: '02' },
  { id: 'integrations', key: 'nav.integrations', index: '03' },
  { id: 'summary', key: 'nav.summary', index: '04' },
  { id: 'system', key: 'nav.system', index: '05' },
];

interface SidebarProps {
  activePanel: string;
  onNavigate: (id: string) => void;
  version: string;
  language: string;
  onLanguageChange: (lang: string) => void;
  watchRunning: boolean;
  onWatchToggle: () => void;
}

export default function Sidebar({
  activePanel,
  onNavigate,
  version,
  language,
  onLanguageChange,
  watchRunning,
  onWatchToggle,
}: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="sidebar-shell overflow-auto">
      <div className="sidebar-stack">
        <div className="sidebar-card">
          <p className="sidebar-kicker">Desktop console</p>
          <h1 className="sidebar-title">
            AI CLI
            <br />
            Notify
          </h1>
          <div className="mt-3 inline-flex items-center rounded-full border border-white/[0.08] bg-black/20 px-3 py-1 text-[10px] tracking-[0.18em] text-muted uppercase">
            Version {version}
          </div>
          <div className="sidebar-subtitle">{t('brand.subtitle')}</div>

          <div className="mt-5 space-y-3">
            <div className="meta-pair">
              <div className="meta-label">
                <span className="meta-value">{t('ui.watchToggle')}</span>
                <span className="text-[13px] text-[rgba(232,239,255,0.88)]">
                  {watchRunning ? t('watch.status.running') : t('watch.status.stopped')}
                </span>
              </div>
              <label className="switch">
                <input type="checkbox" checked={watchRunning} onChange={onWatchToggle} />
                <span className="slider" />
              </label>
            </div>

            <div className="meta-pair">
              <div className="meta-label">
                <span className="meta-value">{t('ui.language')}</span>
                <span className="text-[13px] text-[rgba(232,239,255,0.88)]">
                  {language === 'zh-CN' ? 'Chinese' : 'English'}
                </span>
              </div>
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="min-w-[108px] rounded-2xl border border-white/[0.10] bg-black/20 px-3 py-2 text-[13px] text-[var(--text)] outline-none"
              >
                <option value="zh-CN">中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        <nav className="nav-list">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item ${activePanel === item.id ? 'active' : ''}`}
            >
              <span className="nav-marker">{item.index}</span>
              <span className="nav-label">{t(item.key)}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={() => open('https://github.com/ZekerTop/ai-cli-complete-notify')}
            className="project-link"
          >
            <svg viewBox="0 0 16 16" className="h-[13px] w-[13px]" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.18-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.45.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
              />
            </svg>
            <span>{t('btn.projectLink')}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
