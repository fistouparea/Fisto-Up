import { useState } from 'react';
import { LuPlus, LuRefreshCw, LuStore, LuWheat } from 'react-icons/lu';
import { fetchMyListings } from '../../api/listings';
import type { Account, SellerListing } from '../../api/marketTypes';
import { MyListingCard } from '../../components/market/MyListingCard';
import { SellerStatusCallout } from '../../components/market/SellerStatusCallout';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCachedResource } from '../../hooks/useCachedResource';
import { routes } from '../../hooks/useHashRoute';
import { hi } from '../../strings/hi';
import { navigateTo } from '../../utils/navigate';

/** "मेरी बिक्री": the big बेचें button, then the seller's listings. Works offline with the last copy. */
export function MySalesPage({ user }: { user: Account }) {
  const { data, loading, errorCode, reload } = useCachedResource(`market:myListings:${user.id}`, fetchMyListings);
  const [changed, setChanged] = useState<Record<string, SellerListing>>({});
  const listings = (data ?? []).map((listing) => changed[listing.id] ?? listing);
  const seller = user.seller;
  const startSelling = () => navigateTo(seller?.profileComplete ? routes.sellNew : routes.sellerProfile);

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.sell.mySales} icon={LuStore} />
      {seller && <SellerStatusCallout seller={seller} />}

      <Button variant="accent" size="hero" icon={LuWheat} onClick={startSelling}>
        {hi.sell.sellButton}
      </Button>

      {!data && loading && <Skeleton className="h-40" />}
      {!data && errorCode && (
        <EmptyState icon={LuStore} tone="warning" message={hi.sell.loadFailed}>
          <Button variant="secondary" icon={LuRefreshCw} onClick={reload}>
            {hi.tryAgain}
          </Button>
        </EmptyState>
      )}
      {data && listings.length === 0 && (
        <EmptyState icon={LuStore} message={hi.sell.empty}>
          <Button variant="secondary" icon={LuPlus} onClick={startSelling}>
            {hi.sell.newListing}
          </Button>
        </EmptyState>
      )}
      {listings.map((listing) => (
        <MyListingCard key={listing.id} listing={listing} onChanged={(next) => setChanged((all) => ({ ...all, [next.id]: next }))} />
      ))}
    </section>
  );
}
