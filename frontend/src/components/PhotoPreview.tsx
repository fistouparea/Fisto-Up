import { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';

const SIZES = {
  large: 'max-h-[38vh] w-full rounded-3xl shadow-card',
  small: 'max-h-[20vh] w-full rounded-3xl',
  thumb: 'size-14 shrink-0 rounded-2xl object-cover',
} as const;

interface PhotoPreviewProps {
  photo: Blob;
  size?: keyof typeof SIZES;
  dimmed?: boolean;
}

export function PhotoPreview({ photo, size = 'large', dimmed = false }: PhotoPreviewProps) {
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
      className={cn('border border-line bg-surface-green object-contain', SIZES[size], dimmed && 'opacity-60')}
    />
  );
}
