import type { CropId } from '../api/types';
import { cropLabels, hi } from '../strings/hi';
import { CropIcon } from './CropIcon';
import { Button } from './ui/Button';

interface SelectedCropProps {
  crop: CropId;
  onChange?: () => void;
  /** Extra line under the name, e.g. the date of a saved check. */
  detail?: string;
}

export function SelectedCrop({ crop, onChange, detail }: SelectedCropProps) {
  const label = cropLabels[crop];
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-primary-100 bg-surface-green p-3">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface">
        <CropIcon crop={crop} className="size-11" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-xl font-bold text-ink-900">{label.hindi}</p>
        {detail && <p className="text-base text-ink-500">{detail}</p>}
      </div>
      {onChange && (
        <Button variant="ghost" size="md" fullWidth={false} onClick={onChange}>
          {hi.changeCrop}
        </Button>
      )}
    </div>
  );
}
