const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.8;

/**
 * Shrinks a photo to at most 1024px on its longest side and re-encodes it as JPEG.
 * Re-drawing through a canvas also strips EXIF metadata such as GPS location.
 */
export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context not available');
    context.drawImage(bitmap, 0, 0, width, height);

    return await canvasToJpeg(canvas);
  } finally {
    bitmap.close();
  }
}

export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}
