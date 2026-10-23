import { LuBadgeCheck, LuStar } from 'react-icons/lu';
import type { PublicSeller } from '../../api/marketTypes';
import { useLang } from '../../hooks/useLang';
import { cn } from '../../utils/cn';

export function VerifiedBadge({ className }: { className?: string }) {
  const { t } = useLang();
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-sm font-bold text-success-800', className)}>
      <LuBadgeCheck aria-hidden="true" className="size-4" />
      {t.verified}
    </span>
  );
}

/** "★ 4.5 (12 रेटिंग)" or "अभी रेटिंग नहीं". */
export function RatingLine({ rating, className }: { rating: PublicSeller['rating']; className?: string }) {
  const { t } = useLang();
  if (rating.average === null) return <span className={cn('text-sm text-ink-500', className)}>{t.noRatings}</span>;
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm text-ink-700', className)}>
      <LuStar aria-hidden="true" className="size-4 fill-accent-400 text-accent-500" />
      <strong>{rating.average.toFixed(1)}</strong> ({rating.count} {t.ratings})
    </span>
  );
}
