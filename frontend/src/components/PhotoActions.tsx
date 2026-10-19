import { useRef, type ChangeEvent } from 'react';
import { LuArrowUp, LuCamera, LuImages } from 'react-icons/lu';
import { hi } from '../strings/hi';
import { Button } from './ui/Button';

interface PhotoActionsProps {
  /** False until a crop is chosen: the buttons then point back up to the crop cards. */
  enabled: boolean;
  onPick: (file: File) => void;
}

/** Giant camera button (hero) + gallery button. Hidden file inputs do the actual picking. */
export function PhotoActions({ enabled, onPick }: PhotoActionsProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again
    if (file) onPick(file);
  };

  return (
    <div className="flex gap-3">
      <Button
        variant="accent"
        size="hero"
        icon={enabled ? LuCamera : LuArrowUp}
        disabled={!enabled}
        onClick={() => cameraInput.current?.click()}
        className="flex-1"
      >
        {enabled ? hi.takePhoto : hi.home.pickCropFirst}
      </Button>
      <Button
        variant="secondary"
        size="hero"
        fullWidth={false}
        icon={LuImages}
        disabled={!enabled}
        onClick={() => galleryInput.current?.click()}
        aria-label={hi.chooseFromGallery}
        className="w-24 flex-col gap-1 px-2 text-base"
      >
        {hi.gallery}
      </Button>

      {/* `capture` opens the rear camera directly on phones. */}
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={handleChange} />
      <input ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={handleChange} />
    </div>
  );
}
