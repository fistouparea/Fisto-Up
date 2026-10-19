import type { Severity } from '../api/types';
import { hi } from '../strings/hi';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { SpeakButton } from './ui/SpeakButton';
import type { Tone } from './ui/tones';

const SEVERITY: Record<Severity, { tone: Tone; label: string; hint: string }> = {
  healthy: { tone: 'success', label: hi.severity.healthy, hint: hi.severity.healthyHint },
  mild: { tone: 'warning', label: hi.severity.mild, hint: hi.severity.mildHint },
  serious: { tone: 'danger', label: hi.severity.serious, hint: hi.severity.seriousHint },
};

/** Big green / yellow / red status at the top of a result: color + icon + words + voice. */
export function SeverityCard({ severity }: { severity: Severity }) {
  const { tone, label, hint } = SEVERITY[severity];
  return (
    <Card tone={tone} reveal className="flex items-center gap-3 border-2">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <Badge tone={tone} label={label} size="lg" />
        <p className="text-xl font-bold text-ink-900">{hint}</p>
      </div>
      <SpeakButton text={`${hi.severity.title}: ${label}। ${hint}।`} />
    </Card>
  );
}
