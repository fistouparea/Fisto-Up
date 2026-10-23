import { createContext } from 'react';
import type { MarketNotification } from '../api/marketTypes';

/** Mirrors NOTIFICATION_RULES.pollSeconds in backend/src/config/marketRules.ts. */
export const NOTIFICATION_POLL_MS = 30_000;

export interface MarketNotificationsState {
  items: MarketNotification[];
  unreadCount: number;
  markRead: (ids?: string[]) => void;
  reload: () => void;
}

export const MarketNotificationsContext = createContext<MarketNotificationsState | null>(null);
