import type { IconType } from 'react-icons';
import { cn } from '../../utils/cn';
import { SpeakButton } from './SpeakButton';
import { TONE_STYLES, type Tone } from './tones';

type CalloutTone = Tone | 'cream';

const STYLES: Record<CalloutTone, { box: string; icon: string }> = {
  success: { box: cn(TONE_STYLES.success.soft, TONE_STYLES.success.border), icon: 'bg-success-100 text-success-700' },
  warning: { box: cn(TONE_STYLES.warning.soft, TONE_STYLES.warning.border), icon: 'bg-accent-200 text-warning-800' },
  danger: { box: cn(TONE_STYLES.danger.soft, TONE_STYLES.danger.border), icon: 'bg-danger-100 text-danger-700' },
  neutral: { box: 'bg-surface-green border-primary-100', icon: 'bg-surface text-primary-700' },
  cream: { box: 'bg-surface-cream border-accent-300', icon: 'bg-accent-200 text-accent-800' },
};

interface CalloutProps {
  tone: CalloutTone;
  icon: IconType;
  /** One important sentence; also what the speaker button reads. */
  text: string;
  className?: string;
}

/** A single important message: icon + full-width bold sentence + speaker. */
export function Callout({ tone, icon: Icon, text, className }: CalloutProps) {
  const styles = STYLES[tone];
  return (
    <div role="note" className={cn('flex items-center gap-3 rounded-3xl border-2 p-4', styles.box, className)}>
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl', styles.icon)}>
        <Icon aria-hidden="true" className="size-7" />
      </span>
      <p className="min-w-0 flex-1 text-lg font-bold leading-snug text-ink-900">{text}</p>
      <SpeakButton text={text} />
    </div>
  );
}
