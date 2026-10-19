import { m } from 'framer-motion';
import type { Severity } from '../api/types';
import { hi } from '../strings/hi';
import { cn } from '../utils/cn';
import { Badge } from './ui/Badge';
import { SpeakButton } from './ui/SpeakButton';
import { TONE_STYLES, type Tone } from './ui/tones';

const SEVERITY: Record<Severity, { tone: Tone; label: string; hint: string }> = {
  healthy: { tone: 'success', label: hi.severity.healthy, hint: hi.severity.healthyHint },
  mild: { tone: 'warning', label: hi.severity.mild, hint: hi.severity.mildHint },
  serious: { tone: 'danger', label: hi.severity.serious, hint: hi.severity.seriousHint },
};

/** Big green / yellow / red status at the top of a result: color + icon + words + voice. */
export function SeverityCard({ severity }: { severity: Severity }) {
  const { tone, label, hint } = SEVERITY[severity];
  const styles = TONE_STYLES[tone];
  return (
    <m.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      aria-label={hi.severity.title}
      className={cn('flex items-center gap-3 rounded-3xl border-2 p-4 shadow-card', styles.soft, styles.border)}
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <Badge tone={tone} label={label} size="lg" />
        <p className={cn('text-xl font-bold', styles.text)}>{hint}</p>
      </div>
      <SpeakButton text={`${hi.severity.title}: ${label}। ${hint}।`} />
    </m.section>
  );
}
