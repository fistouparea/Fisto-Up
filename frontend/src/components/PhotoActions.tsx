import { useRef, type ChangeEvent } from 'react';
import { LuCamera, LuImages } from 'react-icons/lu';
import { hi } from '../strings/hi';
import { Button } from './ui/Button';

/** Giant camera button (hero) + gallery button. Hidden file inputs do the actual picking. */
export function PhotoActions({ onPick }: { onPick: (file: File) => void }) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow picking the same file again
    if (file) onPick(file);
  };

  return (
    <>
      <Button variant="accent" size="hero" icon={LuCamera} onClick={() => cameraInput.current?.click()} className="flex-1">
        {hi.takePhoto}
      </Button>
      <SquareButton icon={LuImages} label={hi.gallery} ariaLabel={hi.chooseFromGallery} onClick={() => galleryInput.current?.click()} />

      {/* `capture` opens the rear camera directly on phones. */}
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={handleChange} />
      <input ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={handleChange} />
    </>
  );
}

interface SquareButtonProps {
  icon: Parameters<typeof Button>[0]['icon'];
  label: string;
  ariaLabel?: string;
  onClick: () => void;
}

/** Secondary action next to a hero button: icon above a one-word label. */
export function SquareButton({ icon, label, ariaLabel, onClick }: SquareButtonProps) {
  return (
    <Button
      variant="secondary"
      size="hero"
      fullWidth={false}
      icon={icon}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className="w-24 flex-col gap-1 px-2 text-base"
    >
      {label}
    </Button>
  );
}
