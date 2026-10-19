import { m } from 'framer-motion';
import { LuCalendar, LuChevronRight } from 'react-icons/lu';
import type { HistorySummary, Severity } from '../api/types';
import { routes } from '../hooks/useHashRoute';
import { cropLabels, hi } from '../strings/hi';
import { formatDate } from '../utils/formatDate';
import { CropIcon } from './CropIcon';
import { Badge } from './ui/Badge';
import type { Tone } from './ui/tones';

const SEVERITY_TONE: Record<Severity, Tone> = { healthy: 'success', mild: 'warning', serious: 'danger' };

/** One past check: crop picture, problem, date, status badge. The whole card is the tap target. */
export function HistoryRow({ item }: { item: HistorySummary }) {
  return (
    <m.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <a
        href={routes.historyItem(item.id)}
        className="flex min-h-24 items-center gap-3 rounded-3xl border border-line bg-surface p-3 shadow-card hover:border-primary-300"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface-green">
          <CropIcon crop={item.crop} className="size-10" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-lg font-bold leading-snug text-ink-900">{item.problemName}</span>
          <span className="text-base text-ink-700">{cropLabels[item.crop].hindi}</span>
          <span className="flex items-center gap-1.5 text-sm text-ink-500">
            <LuCalendar aria-hidden="true" className="size-4 shrink-0" />
            {formatDate(item.createdAt)}
          </span>
          {item.severity && (
            <Badge tone={SEVERITY_TONE[item.severity]} label={hi.severity[item.severity]} className="self-start" />
          )}
        </span>
        <LuChevronRight aria-hidden="true" className="size-6 shrink-0 text-ink-500" />
      </a>
    </m.li>
  );
}
