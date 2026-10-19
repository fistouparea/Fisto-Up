import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { cn } from '../../utils/cn';
import { SpeakButton } from './SpeakButton';
import { TONE_STYLES, type Tone } from './tones';

interface EmptyStateProps {
  icon: IconType;
  tone?: Tone;
  /** One short Hindi line. */
  message: string;
  /** One clear action (usually a Button). */
  children?: ReactNode;
}

/** For empty lists and errors: big icon, one line, speaker, one action. */
export function EmptyState({ icon: Icon, tone = 'neutral', message, children }: EmptyStateProps) {
  const styles = TONE_STYLES[tone];
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      role={tone === 'danger' || tone === 'warning' ? 'alert' : undefined}
      className="flex flex-col items-center gap-5 px-2 py-6 text-center"
    >
      <span className={cn('flex size-28 items-center justify-center rounded-full', styles.soft)}>
        <Icon aria-hidden="true" className={cn('size-14', styles.text)} />
      </span>
      <div className="flex items-center gap-3">
        <p className="text-xl font-bold leading-snug text-ink-900">{message}</p>
        <SpeakButton text={message} />
      </div>
      {children && <div className="flex w-full flex-col gap-3">{children}</div>}
    </m.div>
  );
}
