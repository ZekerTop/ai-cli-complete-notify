import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sidecar } from '@/lib/sidecar';
import type { AppConfig } from '@/lib/types';
import Panel from './ui/Panel';

interface Props {
  config: AppConfig;
}

export default function TestPanel({ config }: Props) {
  const { t } = useTranslation();
  const [source, setSource] = useState('claude');
  const [duration, setDuration] = useState(10);
  const [task, setTask] = useState(t('test.defaultTask'));
  const [log, setLog] = useState('');
  const [sending, setSending] = useState(false);
  const useHookSimulation =
    config.ui.notificationMode === 'hooks' && (source === 'claude' || source === 'gemini');

  const handleSend = async () => {
    setSending(true);
    setLog(useHookSimulation ? `${t('log.testing')} (hook simulation)` : t('log.testing'));
    try {
      const args = [
        'notify',
        '--source', source,
        '--task', task,
        '--duration-minutes', String(duration),
        '--force',
      ];
      if (useHookSimulation) args.push('--from-hook');
      const out = await sidecar([
        ...args,
      ]);
      setLog(out.stdout || out.stderr || 'Done');
    } catch (e) {
      setLog(`Error: ${e}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Panel title={t('section.test.title')} subtitle={t('section.test.sub')}>
      <div className="flex items-center gap-2.5 flex-wrap">
        <label className="text-sm">{t('test.source')}</label>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
        >
          <option value="claude">Claude</option>
          <option value="codex">Codex</option>
          <option value="gemini">Gemini</option>
        </select>

        <label className="text-sm">{t('test.duration')}</label>
        <input
          type="number"
          min={0}
          step={1}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-20 px-2 py-1.5 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
        />

        <label className="text-sm">{t('test.message')}</label>
        <input
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          className="flex-1 min-w-[200px] px-2.5 py-2 rounded-xl border border-white/[0.16] bg-[rgba(6,10,24,0.55)] text-[var(--text)] outline-none text-sm"
        />

        <button
          onClick={handleSend}
          disabled={sending}
          className="px-3 py-2 rounded-xl border border-white/[0.14] bg-gradient-to-br from-accent to-accent2 text-white text-sm cursor-pointer disabled:opacity-50"
        >
          {t('btn.send')}
        </button>
      </div>
      <pre className="mt-2.5 p-2.5 bg-black/25 border border-white/[0.10] rounded-xl max-h-[220px] overflow-auto text-xs leading-relaxed whitespace-pre-wrap break-all">
        {log || ' '}
      </pre>
      {useHookSimulation && (
        <div className="mt-2 text-xs text-muted leading-relaxed">
          当前会模拟 hook 触发路径，等价于 Claude Code / Gemini CLI 调用 `notify --from-hook`。
        </div>
      )}
    </Panel>
  );
}
