import { cn } from '../../utils/cn';
import { dayLabel, shortDate } from '../../utils/dayLabel';

interface DayPickerProps {
  /** The days to choose from (YYYY-MM-DD). */
  days: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label: string;
  /** Days shown but not choosable (already booked). */
  disabled?: string[];
}

/** Big day tiles ("बुध / 12 नव॰"), tap to select or unselect. Used for the calendar and for booking. */
export function DayPicker({ days, selected, onChange, label, disabled = [] }: DayPickerProps) {
  const toggle = (day: string) => onChange(selected.includes(day) ? selected.filter((item) => item !== day) : [...selected, day].sort());
  return (
    <div role="group" aria-label={label} className="grid grid-cols-4 gap-2 min-[400px]:grid-cols-5">
      {days.map((day) => {
        const on = selected.includes(day);
        const blocked = disabled.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={on}
            disabled={blocked}
            onClick={() => toggle(day)}
            className={cn(
              'flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 text-base font-bold',
              on ? 'border-primary-700 bg-primary-700 text-white' : 'border-line bg-surface text-ink-900 hover:border-primary-300',
              blocked && 'cursor-not-allowed border-line bg-line text-ink-500 line-through',
            )}
          >
            <span>{dayLabel(day)}</span>
            <span className="text-sm font-normal">{shortDate(day)}</span>
          </button>
        );
      })}
    </div>
  );
}
