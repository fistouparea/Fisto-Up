import { useContext } from 'react';
import { MarketNotificationsContext, type MarketNotificationsState } from '../context/marketNotificationsContext';

export function useMarketNotifications(): MarketNotificationsState {
  const state = useContext(MarketNotificationsContext);
  if (!state) throw new Error('useMarketNotifications must be used inside <MarketNotificationsProvider>');
  return state;
}
