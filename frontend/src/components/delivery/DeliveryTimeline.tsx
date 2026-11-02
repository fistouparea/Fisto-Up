import { LuCircleCheckBig, LuTruck } from 'react-icons/lu';
import { DELIVERY_STEPS, type DeliveryEvent } from '../../api/delivery';
import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';
import { formatDate } from '../../utils/formatDate';
import { Card } from '../ui/Card';

/** What the delivery person reported, step by step (with the photo proof), on the order page. */
export function DeliveryTimeline({ events }: { events: DeliveryEvent[] }) {
  if (events.length === 0) return null;
  const speak = `${hi.delivery.timeline}: ${events.map((event) => hi.delivery.steps[event.step]).join(', ')}`;
  return (
    <Card icon={LuTruck} title={hi.delivery.timeline} speakText={speak}>
      <ol className="flex flex-col gap-3">
        {DELIVERY_STEPS.map((step) => {
          const event = events.find((item) => item.step === step);
          return (
            <li key={step} className="flex items-start gap-3">
              <LuCircleCheckBig aria-hidden="true" className={cn('mt-0.5 size-6 shrink-0', event ? 'text-success-700' : 'text-line')} />
              <div className="min-w-0 flex-1">
                <p className={cn('font-bold', !event && 'text-ink-500')}>{hi.delivery.steps[step]}</p>
                {event && <p className="text-sm text-ink-500">{formatDate(event.at)}</p>}
                {event?.photoUrl && (
                  <a href={event.photoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block">
                    <img src={event.photoUrl} alt={hi.delivery.photoProof} className="h-32 w-auto rounded-2xl object-cover" />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
