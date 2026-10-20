import { fetchDashboard } from '../api/dashboard';
import { farmDataKey } from '../utils/farmDataKey';
import { useCachedResource } from './useCachedResource';
import { useFarmProfile } from './useFarmProfile';

/** Home screen data in one request; shown from the saved copy first (fast, works offline). */
export function useDashboard() {
  const { profile } = useFarmProfile();
  const key = profile === undefined ? null : `dashboard:${profile ? farmDataKey(profile) : 'none'}`;
  return useCachedResource(key, fetchDashboard);
}
