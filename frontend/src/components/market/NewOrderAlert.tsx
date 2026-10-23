import { m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { LuBellRing, LuEye } from 'react-icons/lu';
import type { Order } from '../../api/marketTypes';
import { fetchOrder } from '../../api/orders';
import { useAuth } from '../../hooks/useAuth';
import { routes } from '../../hooks/useHashRoute';
import { useMarketNotifications } from '../../hooks/useMarketNotifications';
import { useSpeechOutput } from '../../hooks/useSpeech';
import { hi } from '../../strings/hi';
import { navigateTo } from '../../utils/navigate';
import { Button } from '../ui/Button';
import { SpeakButton } from '../ui/SpeakButton';
import { OrderActions } from './order/OrderActions';

/**
 * Seller: a new order pops up over any screen, is read aloud (when the phone allows it) and has two big
 * buttons, स्वीकार / मना करें. "बाद में" keeps it in मेरी बिक्री.
 */
export function NewOrderAlert() {
  const { user } = useAuth();
  const { items, markRead } = useMarketNotifications();
  const { speak } = useSpeechOutput();
  const [order, setOrder] = useState<Order | null>(null);
  const spokenFor = useRef<string | null>(null);

  const pending = user?.role === 'seller' ? items.find((item) => !item.read && item.kind === 'requested' && item.orderId) : undefined;
  const message = pending ? `${pending.title}। ${pending.body}` : '';

  useEffect(() => {
    if (!pending?.orderId) return;
    let cancelled = false;
    fetchOrder(pending.orderId)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded.status !== 'requested') markRead([pending.id]); // already handled elsewhere
        else setOrder(loaded);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pending?.orderId, pending?.id, markRead]);

  // Read it out once. Some phones only allow speech after a tap; the 🔊 button is always there.
  useEffect(() => {
    if (order && pending && spokenFor.current !== pending.id) {
      spokenFor.current = pending.id;
      speak(message);
    }
  }, [order, pending, message, speak]);

  if (!pending || !order || order.id !== pending.orderId) return null;

  const close = () => {
    markRead([pending.id]);
    setOrder(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/50 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="new-order-title">
      <m.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex w-full max-w-lg flex-col gap-4 rounded-3xl bg-surface p-5 shadow-raised"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-400 text-ink-900">
            <LuBellRing aria-hidden="true" className="size-8" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="new-order-title" className="text-2xl font-bold">
              {hi.orders.newOrderTitle}
            </h2>
            <p className="text-lg leading-snug">{pending.body}</p>
          </div>
          <SpeakButton text={message} />
        </div>
        <OrderActions
          order={order}
          text={hi.orders}
          size="hero"
          onChanged={() => {
            close();
            navigateTo(routes.order(order.id));
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="md" icon={LuEye} onClick={() => (close(), navigateTo(routes.order(order.id)))}>
            {hi.home.seeAll}
          </Button>
          <Button variant="ghost" size="md" onClick={close}>
            {hi.orders.later}
          </Button>
        </div>
      </m.div>
    </div>
  );
}
