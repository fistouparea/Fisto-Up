import type { ProductId } from '../../api/marketTypes';
import { cn } from '../../utils/cn';
import { ProductIcon } from './ProductIcon';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** The listing's first photo, or the product picture when there is none. */
export function ListingPhoto({ url, product, className }: { url: string | undefined; product: ProductId; className?: string }) {
  if (!url) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-green', className)}>
        <ProductIcon product={product} className="size-16" />
      </div>
    );
  }
  return <img src={`${API_BASE_URL}${url}`} alt="" loading="lazy" className={cn('bg-surface-green object-cover', className)} />;
}
