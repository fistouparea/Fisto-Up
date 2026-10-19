import { m } from 'framer-motion';
import { LuCheck } from 'react-icons/lu';
import { CROP_IDS, type CropId } from '../api/types';
import { cropLabels, hi } from '../strings/hi';
import { cn } from '../utils/cn';
import { CropIcon } from './CropIcon';

interface CropGridProps {
  selected: CropId | null;
  onSelect: (crop: CropId) => void;
}

/** Big picture cards, three per row. The picture carries the meaning; the name supports it. */
export function CropGrid({ selected, onSelect }: CropGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3" role="group" aria-label={hi.steps.crop}>
      {CROP_IDS.map((crop) => {
        const label = cropLabels[crop];
        const isSelected = crop === selected;
        return (
          <m.button
            key={crop}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(crop)}
            aria-pressed={isSelected}
            className={cn(
              'relative flex min-h-28 flex-col items-center justify-center gap-1 rounded-3xl border-2 bg-surface p-2 shadow-card transition-colors',
              isSelected ? 'border-primary-700 bg-primary-50 ring-4 ring-primary-200' : 'border-line hover:border-primary-300',
            )}
          >
            {isSelected && (
              <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-primary-700 text-white">
                <LuCheck aria-hidden="true" className="size-5" />
                <span className="sr-only">{hi.home.selected}</span>
              </span>
            )}
            <CropIcon crop={crop} className="size-12" />
            <span className="text-xl font-bold leading-tight text-ink-900">{label.hindi}</span>
            <span className="text-sm leading-tight text-ink-500">{label.english}</span>
          </m.button>
        );
      })}
    </div>
  );
}
