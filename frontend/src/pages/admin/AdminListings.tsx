import { useState } from 'react';
import { LuBadgeCheck, LuPackage, LuPhone } from 'react-icons/lu';
import { verifySeller } from '../../api/admin';
import { fetchAdminListings, type AdminListing } from '../../api/adminConsole';
import { ConfirmAction } from '../../components/admin/ConfirmAction';
import { LoadState } from '../../components/admin/LoadState';
import { Pager } from '../../components/admin/Pager';
import { ListingPhoto } from '../../components/market/ListingPhoto';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { routes } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { unitLabels } from '../../strings/hi';
import { hiAdmin } from '../../strings/hiAdmin';
import { formatDate } from '../../utils/formatDate';
import { formatRupees } from '../../utils/money';
import { runAdminAction } from './adminAction';

/** Every listing and whether buyers see it; a waiting one is approved right here (it verifies the seller). */
export function AdminListings({ onChanged }: { onChanged: () => void }) {
  const [show, setShow] = useState<'waiting' | 'all'>('waiting');
  const [page, setPage] = useState(1);
  const listings = useLoad(() => fetchAdminListings(show, page), [show, page]);
  const choose = (next: 'waiting' | 'all') => {
    setShow(next);
    setPage(1);
  };
  const changed = () => {
    listings.reload();
    onChanged();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-ink-700">{hiAdmin.allListings.intro}</p>
      <div className="flex flex-wrap gap-2">
        <Chip label={hiAdmin.allListings.waiting} selected={show === 'waiting'} onClick={() => choose('waiting')} />
        <Chip label={hiAdmin.allListings.all} selected={show === 'all'} onClick={() => choose('all')} />
      </div>
      <LoadState data={listings.data} errorCode={listings.errorCode} reload={listings.reload}>
        {({ items, hasMore }) =>
          items.length === 0 ? (
            <EmptyState icon={LuPackage} message={show === 'waiting' ? hiAdmin.allListings.noneWaiting : hiAdmin.allListings.none} />
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {items.map((listing) => (
                  <ListingRow key={listing.id} listing={listing} onChanged={changed} />
                ))}
              </ul>
              <Pager page={page} hasMore={hasMore} onPage={setPage} />
            </>
          )
        }
      </LoadState>
    </div>
  );
}

function ListingRow({ listing, onChanged }: { listing: AdminListing; onChanged: () => void }) {
  const text = hiAdmin.allListings;
  const { seller, notVisibleReason: reason } = listing;
  const unit = unitLabels[listing.unit].hi;
  const waiting = reason === 'seller' && seller.status === 'pending';
  const state = !reason ? text.visible : reason === 'seller' && seller.status === 'rejected' ? text.sellerRejected : text.reasons[reason];

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3">
      <div className="flex gap-3">
        <ListingPhoto url={listing.photoUrls[0]} product={listing.product} className="size-20 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-bold">{listing.title.hi}</h2>
          <p className="text-base">
            {formatRupees(listing.pricePerUnitPaise)} / {unit} · {listing.quantityAvailable} {unit}
          </p>
          <p className="text-sm text-ink-700">
            {seller.name}
            {seller.village && `, ${seller.village}`} · {formatDate(listing.createdAt)}
          </p>
          <a href={`tel:+91${seller.phone}`} className="inline-flex min-h-10 items-center gap-1 text-base font-bold text-primary-700">
            <LuPhone aria-hidden="true" className="size-4" />
            {seller.phone}
          </a>
        </div>
      </div>
      <Badge tone={reason ? 'warning' : 'success'} label={state} className="self-start" />
      {waiting &&
        (seller.kind === 'input_dealer' ? (
          <a href={routes.admin('sellers')} className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-primary-700 px-3 text-base font-bold text-primary-700">
            {text.checkLicence}
          </a>
        ) : (
          <ConfirmAction question={`${seller.name}: ${text.approveAsk}`} onConfirm={() => runAdminAction(() => verifySeller(seller.id), text.approved, onChanged)}>
            {(ask) => (
              <Button variant="accent" size="md" icon={LuBadgeCheck} onClick={ask}>
                {text.approve}
              </Button>
            )}
          </ConfirmAction>
        ))}
    </li>
  );
}
