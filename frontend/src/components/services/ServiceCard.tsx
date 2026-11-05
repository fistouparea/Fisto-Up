import { m } from 'framer-motion';
import { LuMapPin, LuStar } from 'react-icons/lu';
import type { ServiceListing } from '../../api/services';
import { PRICE_UNIT_LABELS, SERVICE_KIND_INFO, typeLabel } from '../../data/serviceKinds';
import { routes } from '../../hooks/useHashRoute';
import { hiF } from '../../strings/hiFeatures';
import { formatRupees } from '../../utils/money';
import { Badge } from '../ui/Badge';

/** One machine / worker / work need / animal. The whole card opens the listing. */
export function ServiceCard({ listing, showStatus = false }: { listing: ServiceListing; showStatus?: boolean }) {
  const { icon: Icon } = SERVICE_KIND_INFO[listing.kind];
  const types = listing.kind === 'labour' ? listing.skills.map((skill) => typeLabel('labour', skill)).join(', ') : typeLabel(listing.kind, listing.typeId);
  return (
    <m.a
      href={routes.serviceItem(listing.id)}
      whileTap={{ scale: 0.98 }}
      className="flex gap-3 rounded-3xl border border-line bg-surface p-3 shadow-card hover:shadow-raised"
    >
      {listing.photoUrls[0] ? (
        <img src={`${listing.photoUrls[0]}?size=thumb`} alt="" loading="lazy" className="size-24 shrink-0 rounded-2xl object-cover" />
      ) : (
        <span className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
          <Icon aria-hidden="true" className="size-12" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-bold text-primary-700">{types}</p>
        <h3 className="line-clamp-2 text-lg font-bold leading-snug">{listing.title}</h3>
        <p className="text-lg">
          <strong>{formatRupees(listing.pricePaise)}</strong>
          <span className="text-sm text-ink-500">
            {' '}
            / {PRICE_UNIT_LABELS[listing.priceUnit]}
          </span>
        </p>
        <p className="flex items-center gap-1 text-sm text-ink-500">
          <LuMapPin aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">
            {listing.village}
            {listing.distanceKm !== undefined && ` · ${listing.distanceKm} ${hiF.services.kmAway}`}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {listing.rating.count > 0 && (
            <span className="flex items-center gap-1 text-sm font-bold">
              <LuStar aria-hidden="true" className="size-4 text-accent-500" /> {listing.rating.average} ({listing.rating.count})
            </span>
          )}
          {showStatus && listing.status && (
            <Badge tone={listing.status === 'active' ? 'success' : listing.status === 'rejected' ? 'danger' : 'warning'} label={hiF.services.status[listing.status]} />
          )}
        </div>
      </div>
    </m.a>
  );
}
