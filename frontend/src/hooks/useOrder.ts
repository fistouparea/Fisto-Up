import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import type { Order } from '../api/marketTypes';
import { fetchOrder } from '../api/orders';
import type { ErrorCode } from '../api/types';
import { NOTIFICATION_POLL_MS } from '../context/marketNotificationsContext';

/** One order, refreshed now and then so the other side's steps show up without reloading. */
export function useOrder(id: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchOrder(id)
        .then((loaded) => {
          if (cancelled) return;
          setOrder(loaded);
          setErrorCode(null);
        })
        .catch((error: unknown) => !cancelled && setErrorCode(error instanceof ApiError ? error.code : 'UNKNOWN'));
    void load();
    const timer = window.setInterval(() => void load(), NOTIFICATION_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  return { order, setOrder, errorCode, retry };
}
