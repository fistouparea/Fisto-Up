import type { ProductId } from '../../api/marketTypes';
import { cn } from '../../utils/cn';
import { ProductIcon } from './ProductIcon';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

interface ListingPhotoProps {
  url: string | undefined;
  product: ProductId;
  className?: string;
  /** "thumb" (cards and lists, ~400 px from the CDN) or "full" (the listing's photo gallery). */
  size?: 'thumb' | 'full';
}

/** The listing's first photo, or the product picture when there is none. */
export function ListingPhoto({ url, product, className, size = 'thumb' }: ListingPhotoProps) {
  if (!url) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-green', className)}>
        <ProductIcon product={product} className="size-16" />
      </div>
    );
  }
  const src = `${API_BASE_URL}${url}${size === 'thumb' ? '?size=thumb' : ''}`;
  return <img src={src} alt="" loading="lazy" decoding="async" className={cn('bg-surface-green object-cover', className)} />;
}
