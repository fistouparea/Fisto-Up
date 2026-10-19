import type { ReactNode } from 'react';
import { LuCloudRain, LuThermometer, LuWind } from 'react-icons/lu';
import type { Forecast } from '../../api/types';
import { weatherVisual } from '../../data/weatherCodes';
import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';
import { SpeakButton } from '../ui/SpeakButton';

interface WeatherTodayCardProps {
  forecast: Forecast;
  place?: string;
  /** Makes the whole card a link (used on the home dashboard). */
  href?: string;
}

/** Today's weather: big icon, temperatures, rain chance and wind. */
export function WeatherTodayCard({ forecast, place, href }: WeatherTodayCardProps) {
  const today = forecast.days[0];
  if (!today) return null;
  const visual = weatherVisual(forecast.current?.weatherCode ?? today.weatherCode);
  const Icon = visual.icon;
  const temperature = Math.round(forecast.current?.temperature ?? today.tempMax);
  const speech =
    `${hi.weather.today} ${visual.label}। ${hi.weather.max} ${Math.round(today.tempMax)} डिग्री, ${hi.weather.min} ${Math.round(today.tempMin)} डिग्री। ` +
    `${hi.weather.rainChance} की संभावना ${today.rainChance} प्रतिशत।`;

  const header = (
    <div className="flex items-center gap-3">
      <span className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-surface">
        <Icon aria-hidden="true" className={cn('size-14', visual.color)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-4xl font-bold leading-none text-ink-900">{temperature}°</p>
        <p className="text-lg font-bold text-ink-700">{visual.label}</p>
        {place && <p className="truncate text-base text-ink-500">{place}</p>}
      </div>
    </div>
  );

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-sky-100 bg-sky-50 p-4 shadow-card">
      <div className="flex items-start gap-2">
        {href ? (
          <a href={href} className="min-w-0 flex-1" aria-label={`${hi.weather.title}: ${visual.label}, ${temperature}°`}>
            {header}
          </a>
        ) : (
          <div className="min-w-0 flex-1">{header}</div>
        )}
        <SpeakButton text={speech} />
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat
          label={hi.weather.temperature}
          value={`${Math.round(today.tempMax)}° / ${Math.round(today.tempMin)}°`}
          icon={<LuThermometer aria-hidden="true" className="size-5 text-accent-600" />}
        />
        <Stat label={hi.weather.rainChance} value={`${today.rainChance}%`} icon={<LuCloudRain aria-hidden="true" className="size-5 text-sky-600" />} />
        <Stat label={hi.weather.wind} value={`${Math.round(today.windMax)}`} unit={hi.weather.kmh} icon={<LuWind aria-hidden="true" className="size-5 text-ink-500" />} />
      </dl>
    </section>
  );
}

function Stat({ label, value, unit, icon }: { label: string; value: string; unit?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface px-1 py-2">
      <dt className="flex items-center justify-center gap-1 text-sm text-ink-500">
        {icon}
        {label}
      </dt>
      <dd className="text-lg font-bold leading-tight text-ink-900">{value}</dd>
      {unit && <dd className="text-xs text-ink-500">{unit}</dd>}
    </div>
  );
}
