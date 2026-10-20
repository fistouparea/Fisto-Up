import { useSyncExternalStore } from 'react';
import { getConnectivity, subscribeConnectivity, type Connectivity } from '../utils/connectivity';

export function useConnectivity(): Connectivity {
  return useSyncExternalStore(subscribeConnectivity, getConnectivity);
}
