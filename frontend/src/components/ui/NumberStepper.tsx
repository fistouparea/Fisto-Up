import { LuMinus, LuPlus } from 'react-icons/lu';
import { IconButton } from './IconButton';

interface NumberStepperProps {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Spoken name of the value, e.g. "मात्रा". */
  label: string;
  unitLabel?: string;
  min?: number;
  max?: number;
  lessLabel: string;
  moreLabel: string;
}

/** Big − [number] + control. The number can also be typed. Whole numbers only. */
export function NumberStepper({ value, onChange, label, unitLabel, min = 1, max = 100_000, lessLabel, moreLabel }: NumberStepperProps) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, (value ?? 0) + delta)));
  return (
    <div className="flex items-center justify-center gap-2">
      <IconButton icon={LuMinus} label={lessLabel} tone="primary" onClick={() => step(-1)} disabled={value === null || value <= min} />
      <div className="flex flex-col items-center">
        <input
          aria-label={label}
          inputMode="numeric"
          value={value ?? ''}
          placeholder="—"
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '');
            onChange(digits ? Math.min(max, Number(digits)) : null);
          }}
          className="w-32 rounded-2xl border-2 border-line bg-surface py-2 text-center text-4xl font-bold text-ink-900 focus:border-primary-700 focus:outline-none"
        />
        {unitLabel && <span className="mt-1 text-lg text-ink-500">{unitLabel}</span>}
      </div>
      <IconButton icon={LuPlus} label={moreLabel} tone="primary" onClick={() => step(1)} disabled={value !== null && value >= max} />
    </div>
  );
}
