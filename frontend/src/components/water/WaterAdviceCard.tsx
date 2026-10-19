import { LuCheck } from 'react-icons/lu';
import type { WaterAdvice } from '../../api/types';
import { WATER_STATUS_VISUALS } from '../../data/waterVisuals';
import { cropLabels, hi } from '../../strings/hi';
import { waterStatusLabel } from '../../utils/waterLabels';
import { cn } from '../../utils/cn';
import { CropIcon } from '../CropIcon';
import { Button } from '../ui/Button';
import { SpeakButton } from '../ui/SpeakButton';

interface WaterAdviceCardProps {
  advice: WaterAdvice;
  onWatered?: () => void;
  saving?: boolean;
}

/** One crop's water advice: crop picture, big status, one-line reason, speaker and "आज पानी दिया". */
export function WaterAdviceCard({ advice, onWatered, saving = false }: WaterAdviceCardProps) {
  const visual = WATER_STATUS_VISUALS[advice.status];
  const Icon = visual.icon;
  const status = waterStatusLabel(advice);
  const crop = cropLabels[advice.crop].hindi;
  const canRecord = onWatered && advice.status !== 'rainfed' && advice.status !== 'skip';

  return (
    <section className={cn('flex flex-col gap-3 rounded-3xl border-2 p-4 shadow-card', visual.card)}>
      <header className="flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface">
          <CropIcon crop={advice.crop} className="size-11" />
        </span>
        <h3 className="min-w-0 flex-1 text-xl font-bold text-ink-900">{crop}</h3>
        <SpeakButton text={`${crop}: ${status}। ${advice.reason}`} />
      </header>
      <p className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 text-xl font-bold', visual.badge)}>
        <Icon aria-hidden="true" className="size-7 shrink-0" />
        {status}
      </p>
      <p className="text-lg leading-snug text-ink-900">{advice.reason}</p>
      {canRecord && (
        <Button variant="secondary" size="md" icon={LuCheck} onClick={onWatered} disabled={saving}>
          {hi.water.watered}
        </Button>
      )}
    </section>
  );
}
