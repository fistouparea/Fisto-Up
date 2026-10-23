import type { Order } from '../../../api/marketTypes';
import { routes } from '../../../hooks/useHashRoute';
import { useLang } from '../../../hooks/useLang';
import { unitLabels } from '../../../strings/hi';
import { formatRupees } from '../../../utils/money';
import { ListingPhoto } from '../ListingPhoto';
import { OrderStatusBadge } from './OrderStatusBadge';
import { orderTextFor } from './orderText';

/** One row in "मेरे ऑर्डर". */
export function OrderCard({ order }: { order: Order }) {
  const { lang, tOrders } = useLang();
  const text = orderTextFor(order, tOrders);
  const shownLang = order.viewerRole === 'buyer' ? lang : 'hi';
  const other = order.viewerRole === 'seller' ? order.buyer : order.seller;

  return (
    <a href={routes.order(order.id)} className="flex gap-3 rounded-3xl border border-line bg-surface p-3 shadow-card hover:shadow-raised">
      <ListingPhoto url={order.item.photoUrl} product={order.item.product} className="size-20 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold">{order.item.title[shownLang] || order.item.title.hi}</p>
        <p className="text-base">
          {order.quantity} {unitLabels[order.item.unit][shownLang]} · <strong>{formatRupees(order.totalPaise)}</strong>
        </p>
        <p className="truncate text-sm text-ink-500">
          {other.name}
          {other.village && `, ${other.village}`} · {order.ref}
        </p>
        <div className="mt-1">
          <OrderStatusBadge status={order.status} text={text} />
        </div>
      </div>
    </a>
  );
}
