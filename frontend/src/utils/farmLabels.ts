import type { FarmLocation } from '../api/types';
import { hi } from '../strings/hi';

/** e.g. "सरदारशहर, चूरू" or "मेरी जगह (GPS) · चूरू, चूरू". */
export function locationLabel(location: FarmLocation): string {
  const place = [location.tehsil, location.district].filter(Boolean).join(', ');
  if (location.source === 'gps') return place ? `${hi.farm.location.myLocation} · ${place}` : hi.farm.location.myLocation;
  return place;
}
