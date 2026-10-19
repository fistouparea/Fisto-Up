import type { ChangeEvent } from 'react';
import { hi } from '../strings/hi';
import { bigButtonClasses } from './buttonStyles';

interface PhotoPickerProps {
  onPick: (file: File) => void;
  busy: boolean;
}

export function PhotoPicker({ onPick, busy }: PhotoPickerProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again
    if (file) onPick(file);
  };

  if (busy) {
    return <p className="py-10 text-center text-2xl text-gray-700">{hi.preparingPhoto}</p>;
  }

  return (
    <section className="flex flex-col gap-4">
      <p className="text-xl text-gray-800">{hi.takePhotoHint}</p>

      {/* `capture` opens the rear camera directly on phones. */}
      <label className={`${bigButtonClasses('primary', 'large')} cursor-pointer`}>
        <span aria-hidden="true">📷</span> {hi.takePhoto}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleChange} />
      </label>

      <label className={`${bigButtonClasses('secondary')} cursor-pointer`}>
        <span aria-hidden="true">🖼️</span> {hi.chooseFromGallery}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" onChange={handleChange} />
      </label>
    </section>
  );
}
