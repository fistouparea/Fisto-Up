import { useSyncExternalStore } from 'react';
import { getSettings, subscribeSettings, type AppSettings } from '../utils/settings';

export function useSettings(): AppSettings {
  return useSyncExternalStore(subscribeSettings, getSettings);
}
