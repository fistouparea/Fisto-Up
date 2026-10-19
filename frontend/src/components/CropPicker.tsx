import { CROP_IDS, type CropId } from '../api/types';
import { cropLabels, hi } from '../strings/hi';

interface CropPickerProps {
  onSelect: (crop: CropId) => void;
}

export function CropPicker({ onSelect }: CropPickerProps) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold text-gray-900">{hi.chooseCrop}</h2>
      <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3">
        {CROP_IDS.map((crop) => {
          const label = cropLabels[crop];
          return (
            <button
              key={crop}
              type="button"
              onClick={() => onSelect(crop)}
              className="flex min-h-28 flex-col items-center justify-center rounded-2xl border-2 border-green-200 bg-white p-2 shadow-sm active:border-green-700 active:bg-green-50"
            >
              <span className="text-4xl" aria-hidden="true">
                {label.emoji}
              </span>
              <span className="mt-1 text-2xl font-bold text-gray-900">{label.hindi}</span>
              <span className="text-sm text-gray-500">{label.english}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
