import type { ProductId } from '../../api/marketTypes';
import { ListingPhoto } from './ListingPhoto';

/** Swipeable photos (scroll-snap, no library). One photo fills the width. */
export function PhotoGallery({ urls, product, label }: { urls: string[]; product: ProductId; label: string }) {
  if (urls.length <= 1) {
    return <ListingPhoto url={urls[0]} product={product} size="full" className="aspect-[4/3] w-full rounded-3xl" />;
  }
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4" aria-label={label}>
      {urls.map((url) => (
        <ListingPhoto key={url} url={url} product={product} size="full" className="aspect-[4/3] w-[85%] shrink-0 snap-center rounded-3xl" />
      ))}
    </div>
  );
}
