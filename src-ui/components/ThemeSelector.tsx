import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyTheme, readTheme, saveTheme, type ThemeMode } from '@/lib/theme';

export default function ThemeSelector() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ThemeMode>(readTheme);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => applyTheme(mode, media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [mode]);
  return (
    <div className="theme-selector" role="group" aria-label={t('theme.label')}>
      {(['light', 'dark', 'system'] as const).map(value => (
        <button key={value} type="button" aria-label={t('theme.' + value)} title={t('theme.' + value)}
          aria-pressed={mode === value} onClick={() => { saveTheme(value); setMode(value); }}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {value === 'light' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
              : value === 'dark' ? <path d="M20.5 14a9 9 0 0 1-10.5-10.5A9 9 0 1 0 20.5 14Z" />
              : <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M12 17v4m-4 0h8" /></>}
          </svg>
        </button>
      ))}
    </div>
  );
}
