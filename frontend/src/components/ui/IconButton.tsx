import { m, type HTMLMotionProps } from 'framer-motion';
import type { IconType } from 'react-icons';
import { cn } from '../../utils/cn';

type IconButtonTone = 'primary' | 'soft' | 'accent' | 'danger';

const TONES: Record<IconButtonTone, string> = {
  primary: 'bg-primary-700 text-white hover:bg-primary-800',
  soft: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
  accent: 'bg-accent-400 text-ink-900 hover:bg-accent-300',
  danger: 'bg-danger-700 text-white hover:bg-danger-800',
};

const SIZES = {
  md: { button: 'size-14', icon: 'size-6' }, // 56px
  lg: { button: 'size-20', icon: 'size-9' }, // 80px
} as const;

interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  icon: IconType;
  /** Required: icon-only buttons need a spoken name for screen readers. */
  label: string;
  tone?: IconButtonTone;
  size?: keyof typeof SIZES;
}

export function IconButton({ icon: Icon, label, tone = 'soft', size = 'md', className, type = 'button', ...props }: IconButtonProps) {
  return (
    <m.button
      type={type}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors',
        'disabled:cursor-not-allowed disabled:bg-ink-300/40 disabled:text-ink-500',
        TONES[tone],
        SIZES[size].button,
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className={SIZES[size].icon} />
    </m.button>
  );
}
