import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
}

export default function Panel({ title, subtitle, badge, children }: PanelProps) {
  return (
    <section className="panel-shell">
      <div className="panel-head">
        <div>
          <p className="panel-kicker">Workspace panel</p>
          <h2 className="panel-title">{title}</h2>
          {subtitle && <div className="panel-subtitle">{subtitle}</div>}
        </div>
        {badge}
      </div>
      <div className="relative z-[1]">{children}</div>
    </section>
  );
}
