import { fetchWeather } from '../api/weather';
import { farmDataKey } from '../utils/farmDataKey';
import { useCachedResource } from './useCachedResource';
import { useFarmProfile } from './useFarmProfile';

/** Weather + alerts for the farm. Refetches when the location or crops change. */
export function useWeather() {
  const { profile } = useFarmProfile();
  const key = profile?.location ? `weather:${farmDataKey(profile)}` : null;
  return { ...useCachedResource(key, fetchWeather), hasLocation: Boolean(profile?.location), profileLoaded: profile !== undefined };
}
