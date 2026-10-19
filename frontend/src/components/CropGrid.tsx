import { CROP_IDS, type CropId } from '../api/types';
import { cropLabels, hi } from '../strings/hi';
import { CropIcon } from './CropIcon';
import { SelectCard } from './ui/SelectCard';

interface CropGridProps {
  selected: CropId[];
  onSelect: (crop: CropId) => void;
}

/** Big picture cards, three per row. The picture carries the meaning; the name supports it. */
export function CropGrid({ selected, onSelect }: CropGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3" role="group" aria-label={hi.steps.crop}>
      {CROP_IDS.map((crop) => (
        <SelectCard
          key={crop}
          label={cropLabels[crop].hindi}
          sublabel={cropLabels[crop].english}
          picture={<CropIcon crop={crop} className="size-12" />}
          selected={selected.includes(crop)}
          onClick={() => onSelect(crop)}
        />
      ))}
    </div>
  );
}
