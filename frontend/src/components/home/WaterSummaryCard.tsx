import { LuDroplets } from 'react-icons/lu';
import type { WaterAdvice } from '../../api/types';
import { WATER_STATUS_VISUALS } from '../../data/waterVisuals';
import { routes } from '../../hooks/useHashRoute';
import { cropLabels, hi } from '../../strings/hi';
import { cn } from '../../utils/cn';
import { waterStatusLabel } from '../../utils/waterLabels';
import { CropIcon } from '../CropIcon';
import { Card } from '../ui/Card';
import { SeeAllLink } from './SeeAllLink';

/** One line per crop with its water status; details on the water screen. */
export function WaterSummaryCard({ water }: { water: WaterAdvice[] }) {
  const speech = `${hi.water.title}: ${water.map((advice) => `${cropLabels[advice.crop].hindi}, ${waterStatusLabel(advice)}`).join('। ')}। ${hi.water.disclaimer}`;
  return (
    <Card icon={LuDroplets} title={hi.water.title} speakText={speech}>
      <ul className="flex flex-col gap-2">
        {water.map((advice) => {
          const visual = WATER_STATUS_VISUALS[advice.status];
          const Icon = visual.icon;
          return (
            <li key={advice.crop} className="flex items-center gap-3">
              <CropIcon crop={advice.crop} className="size-10 shrink-0" />
              <span className="min-w-0 flex-1 font-bold">{cropLabels[advice.crop].hindi}</span>
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-bold', visual.badge)}>
                <Icon aria-hidden="true" className="size-5" />
                {waterStatusLabel(advice)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-base text-ink-500">{hi.water.disclaimer}</p>
      <SeeAllLink href={routes.water} />
    </Card>
  );
}
