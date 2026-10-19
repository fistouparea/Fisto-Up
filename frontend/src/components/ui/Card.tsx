import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { cn } from '../../utils/cn';
import { SpeakButton } from './SpeakButton';
import { TONE_STYLES, type Tone } from './tones';

type CardTone = Tone | 'plain' | 'cream';

const CARD_TONES: Record<CardTone, { card: string; iconWrap: string }> = {
  plain: { card: 'bg-surface border-line', iconWrap: 'bg-primary-50 text-primary-700' },
  cream: { card: 'bg-surface-cream border-accent-200', iconWrap: 'bg-accent-200 text-accent-800' },
  neutral: { card: 'bg-surface-green border-primary-100', iconWrap: 'bg-surface text-primary-700' },
  success: { card: cn(TONE_STYLES.success.soft, TONE_STYLES.success.border), iconWrap: 'bg-success-100 text-success-700' },
  warning: { card: cn(TONE_STYLES.warning.soft, TONE_STYLES.warning.border), iconWrap: 'bg-accent-200 text-warning-800' },
  danger: { card: cn(TONE_STYLES.danger.soft, TONE_STYLES.danger.border), iconWrap: 'bg-danger-100 text-danger-700' },
};

interface CardProps {
  tone?: CardTone;
  /** Optional header: icon in a tinted circle, title and a speaker button for `speakText`. */
  icon?: IconType;
  title?: string;
  speakText?: string;
  /** Fade/slide in when shown (used for result cards). */
  reveal?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Card({ tone = 'plain', icon: Icon, title, speakText, reveal = false, className, children }: CardProps) {
  const styles = CARD_TONES[tone];
  return (
    <m.section
      initial={reveal ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('rounded-3xl border p-4 shadow-card', styles.card, className)}
    >
      {(Icon || title) && (
        <header className="mb-3 flex items-center gap-3">
          {Icon && (
            <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl', styles.iconWrap)}>
              <Icon aria-hidden="true" className="size-7" />
            </span>
          )}
          {title && <h3 className="min-w-0 flex-1 text-xl font-bold text-ink-900">{title}</h3>}
          {speakText && <SpeakButton text={speakText} />}
        </header>
      )}
      {children && <div className="text-lg leading-relaxed text-ink-900">{children}</div>}
    </m.section>
  );
}
