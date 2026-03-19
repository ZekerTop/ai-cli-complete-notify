import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onClose: (action: 'tray' | 'exit' | 'cancel', remember: boolean) => void;
}

export default function CloseDialog({ onClose }: Props) {
  const { t } = useTranslation();
  const [remember, setRemember] = useState(false);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[200] modal-mask"
      style={{ background: 'rgba(8,10,14,0.56)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose('cancel', false); }}
    >
      <div
        className="w-full max-w-[440px] p-[18px] rounded-[18px] border border-transparent modal-card"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.22)) padding-box, linear-gradient(135deg, rgba(110,123,255,0.32), rgba(255,255,255,0.10), rgba(58,108,255,0.24)) border-box',
          boxShadow: '0 28px 80px rgba(0,0,0,0.45)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="text-base font-bold tracking-wide">{t('close.message')}</div>
        <div className="mt-1.5 text-xs text-muted leading-relaxed">{t('close.detail')}</div>

        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <button
            onClick={() => onClose('tray', remember)}
            className="w-full px-3 py-2.5 rounded-xl border border-white/[0.14] bg-gradient-to-br from-accent to-accent2 text-white text-sm cursor-pointer"
          >
            {t('close.hide')}
          </button>
          <button
            onClick={() => onClose('exit', remember)}
            className="w-full px-3 py-2.5 rounded-xl border border-white/[0.14] text-sm cursor-pointer"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
            }}
          >
            {t('close.quit')}
          </button>
          <button
            onClick={() => onClose('cancel', false)}
            className="w-full px-3 py-2.5 rounded-xl border border-white/[0.14] text-sm cursor-pointer"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
            }}
          >
            {t('close.cancel')}
          </button>
        </div>

        <label className="mt-3 inline-flex items-center gap-2.5 text-xs text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={() => setRemember(!remember)}
            className="check-toggle"
          />
          <span>{t('close.remember')}</span>
        </label>
      </div>
    </div>
  );
}
