import type { WeatherAlert } from '../../api/types';
import { ALERT_ICONS } from '../../data/alertIcons';
import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';
import { dayLabel } from '../../utils/dayLabel';
import { SpeakButton } from '../ui/SpeakButton';
import { TONE_STYLES } from '../ui/tones';


interface AlertCardProps {
  alert: WeatherAlert;
  /** Short version for the home dashboard: only the first advice line. */
  compact?: boolean;
}

/** Weather alert: red (danger) or yellow (warning), with its own icon, the day and simple advice. */
export function AlertCard({ alert, compact = false }: AlertCardProps) {
  const tone = TONE_STYLES[alert.severity];
  const Icon = ALERT_ICONS[alert.type];
  const when = `${dayLabel(alert.date)} ${hi.weather.from}`;
  const advice = compact ? alert.advice.slice(0, 1) : alert.advice;
  const speech = `${hi.weather.alertsTitle}! ${alert.title}। ${when} ${alert.detail}। ${advice.join(' ')}`;

  return (
    <section role="alert" className={cn('flex flex-col gap-3 rounded-3xl border-2 p-4 shadow-card', tone.soft, tone.border)}>
      <header className="flex items-center gap-3">
        <span className={cn('flex size-14 shrink-0 items-center justify-center rounded-2xl', tone.solid)}>
          <Icon aria-hidden="true" className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-tight text-ink-900">{alert.title}</h3>
          <p className={cn('text-base font-bold', tone.text)}>
            {when} · {alert.detail}
          </p>
        </div>
        <SpeakButton text={speech} />
      </header>
      <ul className="flex flex-col gap-2 text-lg leading-snug text-ink-900">
        {advice.map((line) => (
          <li key={line} className="flex gap-3">
            <span aria-hidden="true" className={cn('mt-2.5 size-2.5 shrink-0 rounded-full', alert.severity === 'danger' ? 'bg-danger-600' : 'bg-warning-700')} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
