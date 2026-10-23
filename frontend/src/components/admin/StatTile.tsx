import type { IconType } from 'react-icons';
import { cn } from '../../utils/cn';

interface StatTileProps {
  icon: IconType;
  label: string;
  value: string;
  /** Smaller second line, e.g. "जाँच बाकी: 3". */
  detail?: string;
  href?: string;
  /** Draws attention (e.g. dues or pending work), always with the label, never color alone. */
  highlight?: boolean;
}

/** A headline number. Values are in ink, not color; the icon tile carries the accent. */
export function StatTile({ icon: Icon, label, value, detail, href, highlight = false }: StatTileProps) {
  const body = (
    <>
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', highlight ? 'bg-accent-200 text-accent-800' : 'bg-primary-50 text-primary-700')}>
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-base text-ink-500">{label}</span>
        <span className="text-2xl font-bold tabular-nums text-ink-900">{value}</span>
        {detail && <span className="text-sm text-ink-700">{detail}</span>}
      </span>
    </>
  );
  const className = cn('flex items-start gap-3 rounded-3xl border bg-surface p-4 shadow-card', highlight ? 'border-accent-300' : 'border-line');
  return href ? (
    <a href={href} className={cn(className, 'hover:shadow-raised')}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}
