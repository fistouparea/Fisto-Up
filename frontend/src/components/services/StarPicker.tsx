import { LuStar } from 'react-icons/lu';
import { cn } from '../../utils/cn';

/** Five big stars; tapping one sends that many. */
export function StarPicker({ onPick, label, disabled = false }: { onPick: (stars: number) => void; label: string; disabled?: boolean }) {
  return (
    <div role="group" aria-label={label} className="flex justify-center gap-1">
      {[1, 2, 3, 4, 5].map((stars) => (
        <button key={stars} type="button" disabled={disabled} aria-label={`${stars}`} onClick={() => onPick(stars)} className="flex size-14 items-center justify-center rounded-full hover:bg-accent-100">
          <LuStar aria-hidden="true" className={cn('size-10 text-accent-500')} />
        </button>
      ))}
    </div>
  );
}
