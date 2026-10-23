import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MarketNotification } from '../api/marketTypes';
import { fetchMarketNotifications, markMarketNotificationsRead } from '../api/orders';
import { useAuth } from '../hooks/useAuth';
import { linkExistingPushSubscription } from '../utils/marketPush';
import { MarketNotificationsContext, NOTIFICATION_POLL_MS, type MarketNotificationsState } from './marketNotificationsContext';

/**
 * Order notifications for the logged-in user, checked every 30 seconds while the app is open.
 * If this phone already allows push (see PushPermissionCard), it is linked to the account so order
 * notifications also arrive when the app is closed.
 */
export function MarketNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [data, setData] = useState<{ userId: string; items: MarketNotification[]; unreadCount: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const linkedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = () =>
      fetchMarketNotifications()
        .then((result) => !cancelled && setData({ userId, ...result }))
        .catch(() => undefined); // offline: keep what we have
    void load();
    const timer = window.setInterval(() => document.visibilityState === 'visible' && void load(), NOTIFICATION_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [userId, attempt]);

  useEffect(() => {
    if (!userId || linkedFor.current === userId) return;
    linkedFor.current = userId;
    void linkExistingPushSubscription();
  }, [userId]);

  const markRead = useCallback((ids?: string[]) => {
    setData((current) =>
      current && {
        ...current,
        items: current.items.map((item) => (!ids || ids.includes(item.id) ? { ...item, read: true } : item)),
        unreadCount: ids ? current.items.filter((item) => !item.read && !ids.includes(item.id)).length : 0,
      },
    );
    void markMarketNotificationsRead(ids).catch(() => undefined);
  }, []);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  const value = useMemo<MarketNotificationsState>(() => {
    const current = data && data.userId === userId ? data : null;
    return { items: current?.items ?? [], unreadCount: current?.unreadCount ?? 0, markRead, reload };
  }, [data, userId, markRead, reload]);

  return <MarketNotificationsContext.Provider value={value}>{children}</MarketNotificationsContext.Provider>;
}
