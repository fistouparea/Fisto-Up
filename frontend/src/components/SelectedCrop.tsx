import type { CropId } from '../api/types';
import { cropLabels, hi } from '../strings/hi';

interface SelectedCropProps {
  crop: CropId;
  onChange?: () => void;
}

export function SelectedCrop({ crop, onChange }: SelectedCropProps) {
  const label = cropLabels[crop];
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl bg-green-100 px-4 py-3">
      <span className="text-xl text-gray-900">
        {hi.selectedCrop}:{' '}
        <strong>
          {label.emoji} {label.hindi}
        </strong>
      </span>
      {onChange && (
        <button type="button" onClick={onChange} className="min-h-12 px-3 text-lg font-bold text-green-800 underline">
          {hi.changeCrop}
        </button>
      )}
    </div>
  );
}
