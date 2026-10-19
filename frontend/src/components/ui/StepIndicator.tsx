import { Fragment } from 'react';
import type { IconType } from 'react-icons';
import { LuCamera, LuCheck, LuClipboardCheck, LuSprout } from 'react-icons/lu';
import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';

const STEPS: { label: string; icon: IconType }[] = [
  { label: hi.steps.crop, icon: LuSprout },
  { label: hi.steps.photo, icon: LuCamera },
  { label: hi.steps.answer, icon: LuClipboardCheck },
];

interface StepIndicatorProps {
  /** 0 = फसल चुनें, 1 = फोटो लें, 2 = जवाब */
  current: 0 | 1 | 2;
}

/** फसल चुनें → फोटो लें → जवाब, with icons, numbers and a check on finished steps. */
export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <ol className="flex items-start" aria-label={hi.steps.label}>
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const Icon = done ? LuCheck : step.icon;
        return (
          <Fragment key={step.label}>
            {index > 0 && (
              <li aria-hidden="true" className={cn('mt-6 h-1 flex-1 rounded-full', index <= current ? 'bg-primary-700' : 'bg-line')} />
            )}
            <li className="flex w-20 flex-col items-center gap-1 text-center" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'relative flex size-12 items-center justify-center rounded-full border-2',
                  active && 'border-accent-400 bg-accent-400 text-ink-900 shadow-raised',
                  done && 'border-primary-700 bg-primary-700 text-white',
                  !active && !done && 'border-line bg-surface text-ink-500',
                )}
              >
                <Icon aria-hidden="true" className="size-6" />
                <span
                  className={cn(
                    'absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full text-xs font-bold',
                    active || done ? 'bg-ink-900 text-white' : 'bg-line text-ink-700',
                  )}
                >
                  {index + 1}
                </span>
              </span>
              <span className={cn('text-sm leading-tight', active ? 'font-bold text-ink-900' : 'text-ink-500')}>
                {step.label}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
