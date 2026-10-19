import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { LuCheck } from 'react-icons/lu';
import { cn } from '../../utils/cn';

interface SelectCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: IconType;
  /** Custom picture instead of an icon (e.g. a crop illustration). */
  picture?: ReactNode;
  sublabel?: string;
  className?: string;
}

/** Big tappable choice card with a picture/icon and a check when selected. */
export function SelectCard({ label, selected, onClick, icon: Icon, picture, sublabel, className }: SelectCardProps) {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'relative flex min-h-28 flex-col items-center justify-center gap-1 rounded-3xl border-2 bg-surface p-2 text-center shadow-card transition-colors',
        selected ? 'border-primary-700 bg-primary-50 ring-4 ring-primary-200' : 'border-line hover:border-primary-300',
        className,
      )}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary-700 text-white">
          <LuCheck aria-hidden="true" className="size-5" />
        </span>
      )}
      {picture}
      {Icon && <Icon aria-hidden="true" className="size-11 text-primary-700" />}
      <span className="text-lg font-bold leading-tight text-ink-900">{label}</span>
      {sublabel && <span className="text-sm leading-tight text-ink-500">{sublabel}</span>}
    </m.button>
  );
}
