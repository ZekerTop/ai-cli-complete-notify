import type { SourceKey } from '@/lib/types';

export default function SourceLogo({ source, name, className = 'h-6 w-6' }: {
  source: { key: SourceKey; logo: string };
  name?: string;
  className?: string;
}) {
  return (
    <span title={name} className={`inline-flex shrink-0 overflow-hidden rounded-md ${className} ${source.key === 'zcode' ? '' : 'bg-white p-0.5'}`}>
      <img src={source.logo} alt={name || ''} className={`h-full w-full object-contain ${source.key === 'codex' ? 'scale-[1.6]' : ''}`} />
    </span>
  );
}
