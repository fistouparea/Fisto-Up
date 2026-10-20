import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { fetchNotifications } from '../api/notifications';
import { useCachedResource } from '../hooks/useCachedResource';
import { useFarmProfile } from '../hooks/useFarmProfile';
import { farmDataKey } from '../utils/farmDataKey';
import { loadReadIds, saveReadIds } from '../utils/readNotifications';
import { NotificationsContext, type NotificationsState } from './notificationsContext';

/** Loads सूचनाएँ once for the whole app (bell + screen). Read state stays on the phone. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { profile } = useFarmProfile();
  const key = profile === undefined ? null : `notifications:${profile ? farmDataKey(profile) : 'none'}`;
  const { data, loading, reload } = useCachedResource(key, fetchNotifications);
  const [readIds, setReadIds] = useState(loadReadIds);

  const updateRead = useCallback((change: (ids: Set<string>) => void) => {
    setReadIds((current) => {
      const next = new Set(current);
      change(next);
      saveReadIds(next);
      return next;
    });
  }, []);

  const value = useMemo<NotificationsState>(() => {
    const items = data ?? [];
    return {
      items,
      unreadCount: items.filter((item) => !readIds.has(item.id)).length,
      isUnread: (id) => !readIds.has(id),
      markRead: (id) => updateRead((ids) => ids.add(id)),
      markAllRead: () => updateRead((ids) => items.forEach((item) => ids.add(item.id))),
      reload,
      loading,
    };
  }, [data, readIds, updateRead, reload, loading]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
