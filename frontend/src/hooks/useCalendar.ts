import { fetchCalendar } from '../api/calendar';
import { farmDataKey } from '../utils/farmDataKey';
import { useCachedResource } from './useCachedResource';
import { useFarmProfile } from './useFarmProfile';

export function useCalendar() {
  const { profile } = useFarmProfile();
  return { ...useCachedResource(profile ? `calendar:${farmDataKey(profile)}` : null, fetchCalendar), hasCrops: (profile?.crops.length ?? 0) > 0 };
}
