import { LuCheck } from 'react-icons/lu';
import type { CropStageInfo } from '../../api/types';
import { STAGE_ICONS } from '../../data/stageIcons';
import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';

/** Vertical बुवाई → ... → कटाई timeline; finished stages ticked, the current one highlighted. */
export function StageTimeline({ timeline }: { timeline: CropStageInfo['timeline'] }) {
  return (
    <ol className="flex flex-col">
      {timeline.map((step, index) => {
        const Icon = step.done ? LuCheck : STAGE_ICONS[step.stage];
        const last = index === timeline.length - 1;
        return (
          <li key={step.stage} className="relative flex min-h-14 items-start gap-3" aria-current={step.current ? 'step' : undefined}>
            {!last && (
              <span
                aria-hidden="true"
                className={cn('absolute left-6 top-12 h-[calc(100%-3rem)] w-1 -translate-x-1/2 rounded-full', step.done ? 'bg-primary-700' : 'bg-line')}
              />
            )}
            <span
              className={cn(
                'relative flex size-12 shrink-0 items-center justify-center rounded-full border-2',
                step.current && 'border-accent-400 bg-accent-400 text-ink-900 shadow-raised',
                step.done && 'border-primary-700 bg-primary-700 text-white',
                !step.current && !step.done && 'border-line bg-surface text-ink-500',
              )}
            >
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <div className="flex min-h-12 flex-1 items-center justify-between gap-2 pb-2">
              <span className={cn('text-lg', step.current ? 'font-bold text-ink-900' : step.done ? 'text-ink-700' : 'text-ink-500')}>
                {step.name}
              </span>
              {step.current ? (
                <span className="rounded-full bg-accent-400 px-3 py-0.5 text-sm font-bold text-ink-900">{hi.calendar.currentStage}</span>
              ) : (
                <span className="text-sm text-ink-500">
                  {hi.calendar.day} {step.startDay}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
