import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppConfig } from '@/lib/types';
import Panel from './ui/Panel';
import Switch from './ui/Switch';

interface Props {
  config: AppConfig;
  onUpdate: (fn: (c: AppConfig) => AppConfig) => void;
}

const PROVIDERS = [
  { value: 'openai', key: 'summary.provider.openai' },
  { value: 'anthropic', key: 'summary.provider.anthropic' },
  { value: 'google', key: 'summary.provider.google' },
  { value: 'qwen', key: 'summary.provider.qwen' },
  { value: 'deepseek', key: 'summary.provider.deepseek' },
];

export default function SummaryPanel({ config, onUpdate }: Props) {
  const { t } = useTranslation();
  const summary = config.summary;
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState('');

  const updateSummary = (patch: Partial<AppConfig['summary']>) => {
    onUpdate((c) => ({
      ...c,
      summary: { ...c.summary, ...patch },
    }));
  };

  const handleTest = async () => {
    if (!summary.apiUrl) { setTestResult(t('summary.test.missingApiUrl')); return; }
    if (!summary.apiKey) { setTestResult(t('summary.test.missingApiKey')); return; }
    if (!summary.model) { setTestResult(t('summary.test.missingModel')); return; }
    setTestResult(t('summary.test.running'));
    try {
      const { sidecar } = await import('@/lib/sidecar');
      const out = await sidecar([
        'notify', '--source', 'claude', '--task', 'Summary test', '--force',
      ]);
      setTestResult(out.stdout || t('summary.test.success'));
    } catch (e) {
      setTestResult(`${t('summary.test.fail')}: ${e}`);
    }
  };

  return (
    <Panel title={t('section.summary.title')} subtitle={t('section.summary.sub')}>
      {/* Header row: enable toggle + provider select */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <label className="text-sm">{t('summary.enabled')}</label>
          <Switch
            checked={summary.enabled}
            onChange={() => updateSummary({ enabled: !summary.enabled })}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted whitespace-nowrap">{t('summary.provider')}</label>
          <select
            value={summary.provider}
            onChange={(e) => updateSummary({ provider: e.target.value })}
            className="min-w-[180px] px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{t(p.key)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fields (collapse when disabled) */}
      {summary.enabled && (
        <div className="mt-3 grid gap-2.5">
          {/* API URL */}
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2.5 items-center">
            <label className="text-sm">{t('summary.apiUrl')}</label>
            <input
              type="text"
              value={summary.apiUrl}
              onChange={(e) => updateSummary({ apiUrl: e.target.value })}
              placeholder="https://api.openai.com/v1/chat/completions"
              className="w-full min-w-0 px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm focus:border-[rgba(110,123,255,0.60)] focus:shadow-[0_0_0_4px_rgba(110,123,255,0.18)]"
            />
          </div>

          {/* API Key */}
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2.5 items-center">
            <label className="text-sm">{t('summary.apiKey')}</label>
            <div className="flex items-center gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={summary.apiKey}
                onChange={(e) => updateSummary({ apiKey: e.target.value })}
                placeholder="your_api_key"
                className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm focus:border-[rgba(110,123,255,0.60)] focus:shadow-[0_0_0_4px_rgba(110,123,255,0.18)]"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="w-8 h-8 p-0 rounded-[10px] border border-white/[0.14] inline-flex items-center justify-center cursor-pointer"
                style={{
                  background:
                    'radial-gradient(400px 140px at 0% 0%, rgba(110,123,255,0.14), transparent 58%), rgba(255,255,255,0.06)',
                }}
                title={showKey ? t('summary.apiKeyToggle.hide') : t('summary.apiKeyToggle.show')}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                  <path d="M2 12c2.6-4.2 5.8-6.3 10-6.3s7.4 2.1 10 6.3c-2.6 4.2-5.8 6.3-10 6.3S4.6 16.2 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  {!showKey && <path d="M4 4L20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
                </svg>
              </button>
            </div>
          </div>

          {/* Model */}
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2.5 items-center">
            <label className="text-sm">{t('summary.model')}</label>
            <input
              type="text"
              value={summary.model}
              onChange={(e) => updateSummary({ model: e.target.value })}
              placeholder="gpt-4o-mini"
              className="w-full min-w-0 px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
            />
          </div>

          {/* Timeout */}
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2.5 items-center">
            <div className="inline-flex items-center gap-1.5">
              <label className="text-sm">{t('summary.timeout')}</label>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/[0.14] text-[rgba(11,16,34,0.9)] text-[11px] font-extrabold cursor-help border border-white/[0.22]" title={t('summary.timeoutHint')}>?</span>
            </div>
            <input
              type="number"
              min={300}
              step={100}
              value={summary.timeoutMs}
              onChange={(e) => updateSummary({ timeoutMs: Number(e.target.value) || 15000 })}
              className="w-full min-w-0 px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
            />
          </div>

          {/* Test */}
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2.5 items-center">
            <label className="text-sm">{t('summary.test')}</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleTest}
                className="px-3 py-1.5 rounded-xl border border-white/[0.14] text-xs cursor-pointer"
                style={{
                  background:
                    'radial-gradient(400px 140px at 0% 0%, rgba(110,123,255,0.14), transparent 58%), rgba(255,255,255,0.06)',
                }}
              >
                {t('summary.testBtn')}
              </button>
              {testResult && <span className="text-xs text-muted">{testResult}</span>}
            </div>
          </div>

          <div className="text-xs text-muted leading-relaxed">{t('summary.hint')}</div>
        </div>
      )}
    </Panel>
  );
}
