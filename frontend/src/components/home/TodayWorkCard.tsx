import { LuListChecks } from 'react-icons/lu';
import type { DashboardTask } from '../../api/types';
import { routes } from '../../hooks/useHashRoute';
import { cropLabels, hi } from '../../strings/hi';
import { CropIcon } from '../CropIcon';
import { Card } from '../ui/Card';
import { SeeAllLink } from './SeeAllLink';

export function TodayWorkCard({ tasks }: { tasks: DashboardTask[] }) {
  const speech = `${hi.calendar.todayWork}: ${tasks.map((item) => `${cropLabels[item.crop].hindi}: ${item.task}`).join(' ')}`;
  return (
    <Card tone="cream" icon={LuListChecks} title={hi.calendar.todayWork} speakText={speech}>
      <ul className="flex flex-col gap-3">
        {tasks.map((item) => (
          <li key={`${item.crop}-${item.task}`} className="flex gap-3">
            <CropIcon crop={item.crop} className="size-10 shrink-0" />
            <span className="leading-snug">
              <span className="font-bold">{cropLabels[item.crop].hindi}: </span>
              {item.task}
            </span>
          </li>
        ))}
      </ul>
      <SeeAllLink href={routes.calendar} />
    </Card>
  );
}
