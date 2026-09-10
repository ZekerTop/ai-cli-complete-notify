import ThemeSelector from './ThemeSelector';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { id: 'notifications', key: 'nav.notifications', index: '01' },
  { id: 'sources', key: 'nav.sources', index: '02' },
  { id: 'integrations', key: 'nav.integrations', index: '03' },
  { id: 'third-party', key: 'nav.thirdParty', index: '04' },
  { id: 'summary', key: 'nav.summary', index: '05' },
  { id: 'system', key: 'nav.system', index: '06' },
  { id: 'about-project', key: 'nav.aboutProject', index: '07' },
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
          <div className="flex items-end justify-between gap-3">
            <h1 className="sidebar-title">
              AI CLI
              <br />
              Notify
            </h1>
            <span className="shrink-0 rounded-full border border-[rgba(110,123,255,0.36)] bg-[rgba(110,123,255,0.14)] px-3 py-1 text-[13px] font-semibold text-[var(--text)]">v{version}</span>
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
            <ThemeSelector />
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

      </div>
    </aside>
  );
}
