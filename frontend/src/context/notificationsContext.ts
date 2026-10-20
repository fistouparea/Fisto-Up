import { createContext } from 'react';
import type { AppNotification } from '../api/types';

export interface NotificationsState {
  items: AppNotification[];
  unreadCount: number;
  isUnread: (id: string) => boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Refetch, e.g. after answering a follow-up. */
  reload: () => void;
  loading: boolean;
}

export const NotificationsContext = createContext<NotificationsState | null>(null);
