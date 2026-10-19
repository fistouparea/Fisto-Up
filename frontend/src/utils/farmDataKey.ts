import type { FarmProfile } from '../api/types';

/** Changes whenever anything that affects advice changes, so cached advice is refetched. */
export function farmDataKey(profile: FarmProfile): string {
  const place = profile.location ? `${profile.location.lat},${profile.location.lon}` : 'none';
  const crops = profile.crops.map((entry) => `${entry.crop}@${entry.sowingDate}@${entry.lastWateredOn ?? ''}`).join('|');
  return `${place}:${profile.irrigation ?? ''}:${crops}`;
}
