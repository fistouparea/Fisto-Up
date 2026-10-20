import { fetchMandi } from '../api/mandi';
import { useCachedResource } from './useCachedResource';
import { useFarmProfile } from './useFarmProfile';

/** Mandi prices for the farmer's crops (optional feature; empty when unavailable). */
export function useMandi() {
  const { profile } = useFarmProfile();
  const crops = profile?.crops.map((entry) => entry.crop).join(',') ?? '';
  const { data } = useCachedResource(crops ? `mandi:${crops}` : null, fetchMandi);
  return data?.available ? data.prices : [];
}
