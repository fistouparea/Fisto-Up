import { cn } from '../../utils/cn';
import { TONE_STYLES, type Tone } from './tones';

interface BadgeProps {
  tone: Tone;
  label: string;
  size?: 'md' | 'lg';
  className?: string;
}

/** Status pill: tone color + matching icon + short label (never color alone). */
export function Badge({ tone, label, size = 'md', className }: BadgeProps) {
  const { solid, icon: Icon } = TONE_STYLES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full font-bold',
        size === 'lg' ? 'px-5 py-3 text-2xl' : 'px-3 py-1 text-base',
        solid,
        className,
      )}
    >
      <Icon aria-hidden="true" className={size === 'lg' ? 'size-8' : 'size-5'} />
      {label}
    </span>
  );
}
