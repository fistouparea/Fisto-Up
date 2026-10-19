import { fetchWeather } from '../api/weather';
import { useCachedResource } from './useCachedResource';
import { useFarmProfile } from './useFarmProfile';

/** Weather + alerts for the farm. Refetches when the location or crops change. */
export function useWeather() {
  const { profile } = useFarmProfile();
  const key = profile?.location ? `weather:${profile.location.lat},${profile.location.lon}:${cropsKey(profile.crops)}` : null;
  return { ...useCachedResource(key, fetchWeather), hasLocation: Boolean(profile?.location), profileLoaded: profile !== undefined };
}

function cropsKey(crops: { crop: string; sowingDate: string }[]): string {
  return crops.map((entry) => `${entry.crop}@${entry.sowingDate}`).join('|');
}
