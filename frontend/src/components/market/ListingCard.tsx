import { m } from 'framer-motion';
import { LuMapPin } from 'react-icons/lu';
import type { PublicListing } from '../../api/marketTypes';
import { routes } from '../../hooks/useHashRoute';
import { useLang } from '../../hooks/useLang';
import { unitLabels } from '../../strings/hi';
import { formatRupees } from '../../utils/money';
import { ListingPhoto } from './ListingPhoto';
import { RatingLine, VerifiedBadge } from './SellerBadges';

/** Shopping card: photo, title, price per unit, what is left, where, seller trust. The whole card is a link. */
export function ListingCard({ listing }: { listing: PublicListing }) {
  const { lang, t } = useLang();
  const title = listing.title[lang] || listing.title.hi;
  const unit = unitLabels[listing.unit][lang];
  const place = listing.seller.village || listing.place.tehsil;

  return (
    <m.a
      href={routes.listing(listing.id)}
      whileTap={{ scale: 0.98 }}
      className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-shadow hover:shadow-raised"
    >
      <div className="relative">
        <ListingPhoto url={listing.photoUrls[0]} product={listing.product} className="aspect-[4/3] w-full" />
        {listing.minOrderQty > 1 && (
          <span className="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2 py-0.5 text-sm font-bold text-white">{t.bulk}</span>
        )}
        {listing.partner && (
          <span className="absolute right-2 top-2 rounded-full bg-accent-400 px-2 py-0.5 text-sm font-bold text-ink-900">{t.partner}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink-900">{title}</h3>
        <p className="text-lg leading-tight">
          <strong className="text-primary-700">{formatRupees(listing.pricePerUnitPaise)}</strong>
          <span className="text-sm text-ink-500"> / {unit}</span>
        </p>
        <p className="text-sm text-ink-700">
          {t.available}: {listing.quantityAvailable} {unit}
        </p>
        {listing.minOrderQty > 1 && (
          <p className="text-sm text-ink-700">
            {t.minOrder}: {listing.minOrderQty} {unit}
          </p>
        )}
        <p className="flex items-center gap-1 text-sm text-ink-500">
          <LuMapPin aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">
            {place}
            {listing.distanceKm !== undefined && ` · ${listing.distanceKm} ${t.kmAway}`}
          </span>
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
          {listing.seller.verified && <VerifiedBadge />}
          <RatingLine rating={listing.seller.rating} />
        </div>
      </div>
    </m.a>
  );
}
