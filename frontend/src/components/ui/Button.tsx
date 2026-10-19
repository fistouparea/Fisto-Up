import { m, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg' | 'hero';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-700 text-white shadow-card hover:bg-primary-800 active:bg-primary-900',
  accent: 'bg-accent-400 text-ink-900 shadow-raised hover:bg-accent-300 active:bg-accent-500',
  secondary: 'border-2 border-primary-700 bg-surface text-primary-700 hover:bg-primary-50 active:bg-primary-100',
  ghost: 'bg-transparent text-primary-700 hover:bg-primary-50 active:bg-primary-100',
  danger: 'bg-danger-700 text-white shadow-card hover:bg-danger-800',
};

/** All sizes are at least 56px tall for big fingers. */
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-14 gap-2 px-5 text-lg',
  lg: 'min-h-16 gap-3 px-6 text-xl',
  hero: 'min-h-24 gap-4 px-6 text-2xl',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  md: 'size-6',
  lg: 'size-7',
  hero: 'size-10',
};

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconType;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  fullWidth = true,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <m.button
      type={type}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl font-bold transition-colors',
        'disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-ink-500 disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className={cn('shrink-0', ICON_SIZES[size])} />}
      <span>{children}</span>
    </m.button>
  );
}
