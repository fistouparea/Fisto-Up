import { useEffect, useRef } from 'react';

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
      className={`mb-4 w-full rounded-2xl bg-gray-100 object-contain ${small ? 'max-h-[22vh]' : 'max-h-[45vh]'} ${dimmed ? 'opacity-50' : ''}`}
    />
  );
}
