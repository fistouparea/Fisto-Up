import { LuArrowLeft, LuClipboardList, LuMapPin, LuPhone, LuRefreshCw, LuSearchX, LuTruck } from 'react-icons/lu';
import type { Order } from '../../api/marketTypes';
import { ListingPhoto } from '../../components/market/ListingPhoto';
import { OrderActions } from '../../components/market/order/OrderActions';
import { OrderStatusBadge } from '../../components/market/order/OrderStatusBadge';
import { orderTextFor } from '../../components/market/order/orderText';
import { RatingForm } from '../../components/market/order/RatingForm';
import { ReportForm } from '../../components/market/order/ReportForm';
import { UpiPayCard } from '../../components/market/order/UpiPayCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { SpeakButton } from '../../components/ui/SpeakButton';
import { routes } from '../../hooks/useHashRoute';
import { useLang } from '../../hooks/useLang';
import { useOrder } from '../../hooks/useOrder';
import type { OrdersText } from '../../strings/en';
import { hi, unitLabels } from '../../strings/hi';
import { formatDate } from '../../utils/formatDate';
import { formatRupees } from '../../utils/money';
import { navigateTo } from '../../utils/navigate';

export function OrderPage({ id }: { id: string }) {
  const { lang, tOrders } = useLang();
  const { order, setOrder, errorCode, retry } = useOrder(id);
  const back = (
    <Button variant="ghost" size="md" fullWidth={false} icon={LuArrowLeft} onClick={() => navigateTo(routes.orders)}>
      {hi.orders.title}
    </Button>
  );

  if (!order && !errorCode) return <Skeleton className="h-96" />;
  if (!order) {
    const missing = errorCode === 'NOT_FOUND';
    return (
      <section className="flex flex-col gap-4">
        {back}
        <EmptyState icon={missing ? LuSearchX : LuRefreshCw} tone={missing ? 'neutral' : 'warning'} message={missing ? hi.market.notFound : hi.orders.loadFailed}>
          {!missing && (
            <Button variant="accent" icon={LuRefreshCw} onClick={retry}>
              {hi.orders.retry}
            </Button>
          )}
        </EmptyState>
      </section>
    );
  }

  const text = orderTextFor(order, tOrders);
  const shownLang = order.viewerRole === 'buyer' ? lang : 'hi';
  const unit = unitLabels[order.item.unit][shownLang];
  const title = order.item.title[shownLang] || order.item.title.hi;
  const summary = `${title}। ${order.quantity} ${unitLabels[order.item.unit].hi}। ${hi.orders.total} ${order.totalPaise / 100} रुपये। ${hi.orders.status[order.status]}`;

  return (
    <section className="flex flex-col gap-4" lang={shownLang}>
      {back}
      <div className="flex items-start gap-3">
        <ListingPhoto url={order.item.photoUrl} product={order.item.product} className="size-20 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-tight">{title}</h2>
          <p className="text-base text-ink-500">
            {text.orderNo}: <strong className="tracking-wider">{order.ref}</strong>
          </p>
          <OrderStatusBadge status={order.status} text={text} />
        </div>
        <SpeakButton text={summary} />
      </div>

      <Card icon={LuClipboardList} title={text.whatNext}>
        {order.allowedNext.length > 0 ? (
          <OrderActions order={order} text={text} onChanged={setOrder} />
        ) : (
          <p>{text.nothingToDo}</p>
        )}
      </Card>

      <UpiPayCard order={order} text={text} />
      {order.canRate && <RatingForm order={order} text={text} onRated={setOrder} />}

      <Card>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-base">
          <Row label={text.quantity} value={`${order.quantity} ${unit}`} />
          <Row label={text.price} value={`${formatRupees(order.pricePerUnitPaise)} / ${unit}`} />
          {order.isPriceRequest && <Row label={text.listedPrice} value={`${formatRupees(order.listedPricePerUnitPaise)} (${text.priceRequest})`} />}
          <Row label={text.total} value={formatRupees(order.totalPaise)} strong />
          <Row label={text.payment} value={order.paidVia ? `${text[order.paidVia]} ✓` : text[order.paymentMethod]} />
          <Row label={order.fulfilment === 'delivery' ? text.delivery : text.pickup} value={order.deliveryAddress ?? ''} />
          {order.note && <Row label={text.note} value={order.note} />}
          {order.commissionPaise !== undefined && <Row label={text.commission} value={formatRupees(order.commissionPaise)} />}
          {order.rating && <Row label={text.yourRating} value={`${'★'.repeat(order.rating.stars)} ${order.rating.comment ?? ''}`} />}
        </dl>
      </Card>

      <ContactCard order={order} text={text} />
      <Timeline order={order} text={text} />
      {order.viewerRole !== 'coordinator' && <ReportForm target={{ orderId: order.id }} text={text} />}
    </section>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <>
      <dt className="text-ink-500">{label}</dt>
      <dd className={strong ? 'text-lg font-bold' : ''}>{value}</dd>
    </>
  );
}

/** Names always; phone numbers only after acceptance (the server leaves them out before). */
function ContactCard({ order, text }: { order: Order; text: OrdersText }) {
  const people = [
    order.viewerRole !== 'seller' && { role: text.seller, person: order.seller, phone: order.contact?.sellerPhone },
    order.viewerRole !== 'buyer' && { role: text.buyer, person: order.buyer, phone: order.contact?.buyerPhone },
  ].filter((entry) => entry !== false);
  const pickup = order.contact?.pickup;

  return (
    <Card icon={LuPhone} title={people.map((entry) => entry.role).join(' / ')}>
      <div className="flex flex-col gap-3">
        {people.map(({ role, person, phone }) => (
          <div key={role} className="flex items-center gap-3">
            <p className="min-w-0 flex-1">
              <strong>{person.name}</strong>
              {person.village && `, ${person.village}`}
            </p>
            {phone && <CallButton phone={phone} label={text.call} />}
          </div>
        ))}
        {!order.contact && <p className="text-base text-ink-500">{text.phoneAfterAccept}</p>}
        {pickup && (
          <p className="flex items-start gap-2">
            <LuMapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-ink-500" />
            {text.pickupPlace}: {[pickup.address, pickup.tehsil, pickup.district].filter(Boolean).join(', ')}
          </p>
        )}
        {order.deliveryPerson && (
          <div className="flex items-center gap-3">
            <LuTruck aria-hidden="true" className="size-6 shrink-0 text-ink-500" />
            <p className="min-w-0 flex-1">
              {text.deliveryPerson}: <strong>{order.deliveryPerson.name}</strong>
            </p>
            <CallButton phone={order.deliveryPerson.phone} label={text.call} />
          </div>
        )}
      </div>
    </Card>
  );
}

function CallButton({ phone, label }: { phone: string; label: string }) {
  return (
    <a
      href={`tel:+91${phone}`}
      className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-primary-700 px-4 font-bold text-white"
      aria-label={`${label} ${phone}`}
    >
      <LuPhone aria-hidden="true" className="size-5" />
      {phone}
    </a>
  );
}

function Timeline({ order, text }: { order: Order; text: OrdersText }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-4">
      <h3 className="mb-2 text-lg font-bold">{text.history}</h3>
      <ol className="flex flex-col gap-2">
        {order.history.map((entry) => (
          <li key={`${entry.status}-${entry.at}`} className="flex items-center gap-3 text-base">
            <span aria-hidden="true" className="size-3 shrink-0 rounded-full bg-primary-500" />
            <span className="flex-1 font-bold">{text.status[entry.status]}</span>
            <span className="text-sm text-ink-500">{formatDate(entry.at)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
