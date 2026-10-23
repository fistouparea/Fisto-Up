import { useState } from 'react';
import { LuBanknote, LuCircleCheckBig, LuCircleX, LuQrCode } from 'react-icons/lu';
import { ApiError } from '../../../api/client';
import type { Order, OrderStatus, PaymentMethod } from '../../../api/marketTypes';
import { moveOrder } from '../../../api/orders';
import type { OrdersText } from '../../../strings/en';
import { Button } from '../../ui/Button';
import { notifyError, notifySuccess } from '../../ui/notify';

const STOPPING: ReadonlySet<OrderStatus> = new Set(['cancelled', 'rejected']);

interface OrderActionsProps {
  order: Order;
  text: OrdersText;
  onChanged: (order: Order) => void;
  /** Bigger buttons for the seller's "नया ऑर्डर" alert. */
  size?: 'lg' | 'hero';
}

/** One big button per step the server allows this person now. Stopping an order asks once more. */
export function OrderActions({ order, text, onChanged, size = 'lg' }: OrderActionsProps) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const [askingPayment, setAskingPayment] = useState(false);

  const run = async (to: OrderStatus, paidVia?: PaymentMethod) => {
    setBusy(true);
    try {
      const updated = await moveOrder(order.id, to, paidVia);
      notifySuccess(text.updated);
      setConfirming(null);
      setAskingPayment(false);
      onChanged(updated);
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };

  const label = (to: OrderStatus) =>
    to === 'delivered' && order.viewerRole === 'buyer' ? text.actions.deliveredByBuyer : text.actions[to as keyof OrdersText['actions']];

  if (confirming) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border-2 border-danger-400/60 bg-danger-50 p-4" role="alertdialog" aria-label={label(confirming)}>
        <p className="text-xl font-bold">{confirming === 'rejected' ? text.confirmReject : text.confirmCancel}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="danger" disabled={busy} onClick={() => void run(confirming)}>
            {text.yes}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(null)}>
            {text.no}
          </Button>
        </div>
      </div>
    );
  }

  if (askingPayment) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border-2 border-success-600/40 bg-success-50 p-4">
        <p className="text-xl font-bold">{text.paidHow}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button icon={LuQrCode} disabled={busy} onClick={() => void run('paid', 'upi')}>
            {text.upi}
          </Button>
          <Button icon={LuBanknote} disabled={busy} onClick={() => void run('paid', 'cash')}>
            {text.cash}
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setAskingPayment(false)}>
          {text.no}
        </Button>
      </div>
    );
  }

  // Side by side in the new-order alert: icon above a short label so both fit a 360px phone.
  const sideBySide = size === 'hero' ? 'flex-col gap-1 px-2 text-xl' : undefined;
  const forward = order.allowedNext.filter((to) => !STOPPING.has(to));
  const stopping = order.allowedNext.filter((to) => STOPPING.has(to));
  if (order.allowedNext.length === 0) return null;

  return (
    <div className={size === 'hero' && forward.length > 0 && stopping.length > 0 ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
      {forward.map((to) => (
        <Button
          key={to}
          variant="accent"
          size={size}
          icon={LuCircleCheckBig}
          disabled={busy}
          className={sideBySide}
          onClick={() => (to === 'paid' ? setAskingPayment(true) : void run(to))}
        >
          {label(to)}
        </Button>
      ))}
      {stopping.map((to) => (
        <Button key={to} variant={size === 'hero' ? 'danger' : 'ghost'} size={size} icon={LuCircleX} disabled={busy} className={sideBySide} onClick={() => setConfirming(to)}>
          {label(to)}
        </Button>
      ))}
    </div>
  );
}
