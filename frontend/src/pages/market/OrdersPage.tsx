import { useState } from 'react';
import { LuClipboardList, LuRefreshCw } from 'react-icons/lu';
import { FINISHED_ORDER_STATUSES, type Account } from '../../api/marketTypes';
import { fetchOrders } from '../../api/orders';
import { OrderCard } from '../../components/market/order/OrderCard';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCachedResource } from '../../hooks/useCachedResource';
import { useLang } from '../../hooks/useLang';
import { hi } from '../../strings/hi';

/** Buyer: orders placed. Seller: orders received. Last copy is shown offline. */
export function OrdersPage({ user }: { user: Account }) {
  const { tOrders } = useLang();
  const text = user.role === 'buyer' ? tOrders : hi.orders;
  const [tab, setTab] = useState<'active' | 'finished'>('active');
  const { data, loading, errorCode, reload } = useCachedResource(`market:orders:${user.id}`, async () => (await fetchOrders()).items);
  const orders = (data ?? []).filter((order) => FINISHED_ORDER_STATUSES.includes(order.status) === (tab === 'finished'));

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={user.role === 'seller' ? text.sellerTitle : text.title} icon={LuClipboardList} />
      <div className="flex gap-2" role="group">
        <Chip label={text.active} selected={tab === 'active'} onClick={() => setTab('active')} />
        <Chip label={text.finished} selected={tab === 'finished'} onClick={() => setTab('finished')} />
      </div>
      {!data && loading && <Skeleton className="h-32" />}
      {!data && errorCode && (
        <EmptyState icon={LuRefreshCw} tone="warning" message={text.loadFailed}>
          <Button variant="accent" icon={LuRefreshCw} onClick={reload}>
            {text.retry}
          </Button>
        </EmptyState>
      )}
      {data && orders.length === 0 && <EmptyState icon={LuClipboardList} message={text.empty} />}
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </section>
  );
}
