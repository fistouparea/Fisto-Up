import { cn } from '../../utils/cn';

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

/** Small toggle pill for quick choices (e.g. "1 हफ्ता"). Still 56px tall for big fingers. */
export function Chip({ label, selected, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'min-h-14 shrink-0 whitespace-nowrap rounded-full border-2 px-4 text-lg font-bold transition-colors',
        selected ? 'border-primary-700 bg-primary-700 text-white' : 'border-line bg-surface text-ink-700 hover:border-primary-300',
      )}
    >
      {label}
    </button>
  );
}
