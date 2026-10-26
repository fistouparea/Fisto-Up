import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';

/** Big on/off switch with the state written next to it (never color alone). */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn('flex min-h-14 w-full items-center justify-between rounded-2xl border-2 px-4 text-xl font-bold', on ? 'border-primary-700 bg-primary-50' : 'border-line bg-surface')}
    >
      <span>{on ? hi.settings.on : hi.settings.off}</span>
      <span className={cn('flex h-9 w-16 items-center rounded-full p-1 transition-colors', on ? 'bg-primary-700' : 'bg-line')}>
        <span className={cn('size-7 rounded-full bg-white shadow-card transition-transform', on && 'translate-x-7')} />
      </span>
    </button>
  );
}
