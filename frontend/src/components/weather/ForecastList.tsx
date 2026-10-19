import { LuCloudRain } from 'react-icons/lu';
import type { DayWeather } from '../../api/types';
import { weatherVisual } from '../../data/weatherCodes';
import { cn } from '../../utils/cn';
import { dayLabel, shortDate } from '../../utils/dayLabel';

/** One row per day: day, icon, rain chance, max/min temperature. */
export function ForecastList({ days }: { days: DayWeather[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line rounded-3xl border border-line bg-surface shadow-card">
      {days.map((day) => {
        const visual = weatherVisual(day.weatherCode);
        const Icon = visual.icon;
        return (
          <li key={day.date} className="flex min-h-16 items-center gap-3 px-4 py-2">
            <div className="w-16 leading-tight">
              <p className="text-lg font-bold text-ink-900">{dayLabel(day.date)}</p>
              <p className="text-sm text-ink-500">{shortDate(day.date)}</p>
            </div>
            <Icon aria-label={visual.label} className={cn('size-9 shrink-0', visual.color)} />
            <p className="flex flex-1 items-center gap-1 text-base text-sky-700">
              {day.rainChance >= 20 && (
                <>
                  <LuCloudRain aria-hidden="true" className="size-4" />
                  {day.rainChance}%
                </>
              )}
            </p>
            <p className="text-lg">
              <span className="font-bold text-ink-900">{Math.round(day.tempMax)}°</span>
              <span className="text-ink-500"> / {Math.round(day.tempMin)}°</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
