import { hi } from '../../strings/hi';
import { SpeakButton } from '../ui/SpeakButton';

const dateFormatter = new Intl.DateTimeFormat('hi-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });

export function Greeting({ place }: { place?: string }) {
  const today = dateFormatter.format(new Date());
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 leading-tight">
        <h2 className="text-2xl font-bold text-ink-900">{hi.home.greeting} 🙏</h2>
        <p className="text-base text-ink-500">{place ? `${today} · ${place}` : today}</p>
      </div>
      <SpeakButton text={`${hi.home.greeting}। आज ${today}।`} />
    </div>
  );
}
