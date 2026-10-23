import { useState } from 'react';
import { LuClipboardList, LuTruck } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { assignDeliveryPerson, fetchAdminOrders } from '../../api/admin';
import { FINISHED_ORDER_STATUSES, type Order, type OrderStatus } from '../../api/marketTypes';
import { LoadState } from '../../components/admin/LoadState';
import { OrderActions } from '../../components/market/order/OrderActions';
import { OrderCard } from '../../components/market/order/OrderCard';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { PhoneField, TextField } from '../../components/ui/TextField';
import { notifyError, notifySuccess } from '../../components/ui/notify';
import { useLoad } from '../../hooks/useLoad';
import { hi } from '../../strings/hi';

const BOARD_ORDER: OrderStatus[] = ['requested', 'accepted', 'ready', 'out_for_delivery', 'ready_for_pickup', 'delivered', 'paid', 'completed', 'rejected', 'cancelled'];
type Filter = 'active' | OrderStatus;

/** Orders board: grouped by status, with the steps a coordinator can take for a seller. */
export function AdminOrders() {
  const [filter, setFilter] = useState<Filter>('active');
  const { data, errorCode, reload } = useLoad(() => fetchAdminOrders(), []);

  const counts = new Map<OrderStatus, number>();
  for (const order of data ?? []) counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  const shownStatuses = filter === 'active' ? BOARD_ORDER.filter((status) => !FINISHED_ORDER_STATUSES.includes(status)) : [filter];

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip label={hi.admin.activeOrders} selected={filter === 'active'} onClick={() => setFilter('active')} />
        {BOARD_ORDER.map((status) => (
          <Chip key={status} label={`${hi.orders.status[status]} (${counts.get(status) ?? 0})`} selected={filter === status} onClick={() => setFilter(status)} />
        ))}
      </div>
      <LoadState data={data} errorCode={errorCode} reload={reload}>
        {(orders) => {
          const groups = shownStatuses.map((status) => ({ status, orders: orders.filter((order) => order.status === status) })).filter((group) => group.orders.length > 0);
          if (groups.length === 0) return <EmptyState icon={LuClipboardList} message={hi.admin.noOrders} />;
          return (
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <section key={group.status} className="flex flex-col gap-3">
                  <h3 className="text-xl font-bold">
                    {hi.orders.status[group.status]} ({group.orders.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {group.orders.map((order) => (
                      <BoardOrder key={order.id} order={order} onChanged={reload} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          );
        }}
      </LoadState>
    </div>
  );
}

function BoardOrder({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const needsDelivery = order.fulfilment === 'delivery' && !FINISHED_ORDER_STATUSES.includes(order.status) && order.status !== 'requested';
  return (
    <article className="flex flex-col gap-3 rounded-3xl border border-line bg-surface-page p-2">
      <OrderCard order={order} />
      {order.allowedNext.length > 0 && (
        <div className="px-2">
          <p className="mb-2 text-sm font-bold text-ink-500">{hi.admin.onBehalf}</p>
          <OrderActions order={order} text={hi.orders} onChanged={onChanged} />
        </div>
      )}
      {needsDelivery && <DeliveryPersonForm order={order} onSaved={onChanged} />}
    </article>
  );
}

function DeliveryPersonForm({ order, onSaved }: { order: Order; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(order.deliveryPerson?.name ?? '');
  const [phone, setPhone] = useState(order.deliveryPerson?.phone ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await assignDeliveryPerson(order.id, { name: name.trim(), phone });
      notifySuccess(hi.admin.deliverySaved);
      setOpen(false);
      onSaved();
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button variant="ghost" size="md" icon={LuTruck} onClick={() => setOpen(true)}>
        {order.deliveryPerson ? `${hi.admin.deliveryPerson}: ${order.deliveryPerson.name}` : hi.admin.assignDelivery}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2 px-2 pb-2">
      <TextField label={hi.admin.deliveryName} value={name} onChange={(e) => setName(e.target.value)} />
      <PhoneField label={hi.admin.deliveryPhone} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="accent" size="md" disabled={busy || name.trim().length < 2 || !/^[6-9]\d{9}$/.test(phone)} onClick={() => void save()}>
          {hi.save}
        </Button>
        <Button variant="secondary" size="md" onClick={() => setOpen(false)}>
          {hi.sell.actions.cancel}
        </Button>
      </div>
    </div>
  );
}
