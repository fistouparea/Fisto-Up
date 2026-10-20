import { useContext } from 'react';
import { NotificationsContext, type NotificationsState } from '../context/notificationsContext';

export function useNotifications(): NotificationsState {
  const state = useContext(NotificationsContext);
  if (!state) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return state;
}
