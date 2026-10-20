import { LuListChecks } from 'react-icons/lu';
import type { CropStageInfo } from '../../api/types';
import { cropLabels, hi } from '../../strings/hi';
import { CropIcon } from '../CropIcon';
import { SpeakButton } from '../ui/SpeakButton';
import { StageTimeline } from './StageTimeline';
import { TaskList } from './TaskList';

/** One crop: days since sowing, stage timeline and today's tasks. */
export function CropCalendarCard({ info }: { info: CropStageInfo }) {
  const crop = cropLabels[info.crop].hindi;
  const summary = info.stageName
    ? `${crop}: ${hi.calendar.sinceSowing} ${info.daysSinceSowing} ${hi.calendar.day}। ${hi.calendar.currentStage} ${info.stageName}।`
    : `${crop}: ${hi.calendar.finished}`;

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-4 shadow-card">
      <header className="flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface-green">
          <CropIcon crop={info.crop} className="size-11" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h3 className="text-xl font-bold text-ink-900">{crop}</h3>
          <p className="text-base text-ink-500">
            {hi.calendar.sinceSowing} {info.daysSinceSowing} {hi.calendar.day}
          </p>
        </div>
        <SpeakButton text={summary} />
      </header>

      {info.stage ? <StageTimeline timeline={info.timeline} /> : <p className="text-lg text-ink-700">{hi.calendar.finished}</p>}

      {info.tasks.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-cream p-3">
          <div className="flex items-center gap-2">
            <LuListChecks aria-hidden="true" className="size-6 text-accent-800" />
            <h4 className="flex-1 text-lg font-bold text-ink-900">{hi.calendar.todayWork}</h4>
            <SpeakButton text={`${crop}, ${hi.calendar.todayWork}: ${info.tasks.join(' ')}`} />
          </div>
          <TaskList tasks={info.tasks} />
        </div>
      )}
    </section>
  );
}
