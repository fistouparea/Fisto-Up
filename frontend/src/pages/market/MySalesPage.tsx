import { useEffect, useState } from 'react';
import { LuClipboardList, LuPlus, LuRefreshCw, LuStore, LuWheat } from 'react-icons/lu';
import { fetchMyListings } from '../../api/listings';
import type { Account, SellerListing } from '../../api/marketTypes';
import { MyListingCard } from '../../components/market/MyListingCard';
import { SellerStatusCallout } from '../../components/market/SellerStatusCallout';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useCachedResource } from '../../hooks/useCachedResource';
import { routes } from '../../hooks/useHashRoute';
import { hi } from '../../strings/hi';
import { navigateTo } from '../../utils/navigate';
import { fetchOrders } from '../../api/orders';
import { OrderActions } from '../../components/market/order/OrderActions';
import { OrderCard } from '../../components/market/order/OrderCard';

const CHECK_STATUS_MS = 15_000;

/** "मेरी बिक्री": the big बेचें button, then the seller's listings. Works offline with the last copy. */
export function MySalesPage({ user }: { user: Account }) {
  const seller = user.seller;
  const status = seller?.status;
  // A new status (verified, refused) loads the listings again: their "बाज़ार में" state follows it.
  const { data, loading, errorCode, reload } = useCachedResource(`market:myListings:${user.id}:${status}`, fetchMyListings);
  const [changed, setChanged] = useState<Record<string, SellerListing>>({});
  const listings = (data ?? []).map((listing) => changed[`${status}:${listing.id}`] ?? listing);
  useFreshSellerStatus(status !== 'verified');
  const startSelling = () => navigateTo(seller?.profileComplete ? routes.sellNew : routes.sellerProfile);

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.sell.mySales} icon={LuStore} />
      {seller && <SellerStatusCallout seller={seller} />}

      <Button variant="accent" size="hero" icon={LuWheat} onClick={startSelling}>
        {hi.sell.sellButton}
      </Button>

      <NewOrdersSection userId={user.id} />

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
        <MyListingCard
          key={listing.id}
          listing={listing}
          sellerStatus={status}
          onChanged={(next) => setChanged((all) => ({ ...all, [`${status}:${next.id}`]: next }))}
        />
      ))}
    </section>
  );
}

/**
 * The coordinator decides while the seller waits on this screen: ask again on opening it, on coming back to the app
 * and every CHECK_STATUS_MS. (It used to say "जाँच के बाद" until the app was restarted.)
 */
function useFreshSellerStatus(waiting: boolean) {
  const { refresh } = useAuth();
  useEffect(() => {
    if (!waiting) return;
    refresh();
    const check = () => document.visibilityState === 'visible' && refresh();
    const timer = window.setInterval(check, CHECK_STATUS_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [waiting, refresh]);
}

/** Requests waiting for the seller's answer, each with big स्वीकार / मना करें buttons. */
function NewOrdersSection({ userId }: { userId: string }) {
  const { data, reload } = useCachedResource(`market:newOrders:${userId}`, async () => (await fetchOrders('requested')).items);
  return (
    <section className="flex flex-col gap-3">
      {data && data.length > 0 && (
        <>
          <h3 className="text-xl font-bold">
            {hi.orders.newOrders} ({data.length})
          </h3>
          {data.map((order) => (
            <div key={order.id} className="flex flex-col gap-2 rounded-3xl border-2 border-accent-300 bg-surface-cream p-2">
              <OrderCard order={order} />
              <OrderActions order={order} text={hi.orders} onChanged={reload} />
            </div>
          ))}
        </>
      )}
      <Button variant="secondary" icon={LuClipboardList} onClick={() => navigateTo(routes.orders)}>
        {hi.orders.seeAllOrders}
      </Button>
    </section>
  );
}
