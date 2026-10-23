import type { ProductId } from '../../api/marketTypes';
import { PRODUCT_CATALOG } from '../../data/marketCatalog';
import { cn } from '../../utils/cn';
import { CropIcon } from '../CropIcon';

/** Crop illustration for grains, a simple icon in a cream circle for SHG products. */
export function ProductIcon({ product, className }: { product: ProductId; className?: string }) {
  const { crop, icon: Icon } = PRODUCT_CATALOG[product];
  if (crop) return <CropIcon crop={crop} className={cn('size-12', className)} />;
  return (
    <span className={cn('flex size-12 items-center justify-center rounded-full bg-accent-100 text-accent-800', className)}>
      {Icon && <Icon aria-hidden="true" className="size-3/5" />}
    </span>
  );
}
