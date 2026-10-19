import { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';

interface PhotoPreviewProps {
  photo: Blob;
  dimmed?: boolean;
  /** Smaller photo on result screens, so the answer is visible without scrolling. */
  small?: boolean;
}

export function PhotoPreview({ photo, dimmed = false, small = false }: PhotoPreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);

  // Object URLs hold memory until revoked, so create one per photo and free it on change/unmount.
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const objectUrl = URL.createObjectURL(photo);
    image.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  return (
    <img
      ref={imageRef}
      alt=""
      className={cn(
        'w-full rounded-3xl border border-line bg-surface-green object-contain shadow-card',
        small ? 'max-h-[24vh]' : 'max-h-[46vh]',
        dimmed && 'opacity-60',
      )}
    />
  );
}
