import { useCallback, useState } from 'react';
import { ApiError } from '../api/client';
import { markCropWatered } from '../api/farm';
import type { CropId } from '../api/types';
import { fetchWater } from '../api/water';
import { notifyError, notifySuccess } from '../components/ui/notify';
import { hi } from '../strings/hi';
import { farmDataKey } from '../utils/farmDataKey';
import { useCachedResource } from './useCachedResource';
import { useFarmProfile } from './useFarmProfile';

/** Water advice for the farm, plus "आज पानी दिया" which updates the profile (and so the advice). */
export function useWater() {
  const { profile, setProfile } = useFarmProfile();
  const resource = useCachedResource(profile ? `water:${farmDataKey(profile)}` : null, fetchWater);
  const [savingCrop, setSavingCrop] = useState<CropId | null>(null);

  const markWatered = useCallback(
    async (crop: CropId) => {
      setSavingCrop(crop);
      try {
        const updated = await markCropWatered(crop);
        if (updated) setProfile(updated);
        notifySuccess(hi.water.wateredSaved);
      } catch (error) {
        notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
      } finally {
        setSavingCrop(null);
      }
    },
    [setProfile],
  );

  return { ...resource, savingCrop, markWatered, hasCrops: (profile?.crops.length ?? 0) > 0 };
}
