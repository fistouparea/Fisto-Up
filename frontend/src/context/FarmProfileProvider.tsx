import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '../api/client';
import { fetchFarmProfile, saveFarmProfile } from '../api/farm';
import type { ErrorCode, FarmProfile } from '../api/types';
import { readFromCache, saveToCache } from '../utils/offlineCache';
import { FarmProfileContext, type FarmProfileState } from './farmProfileContext';

const CACHE_KEY = 'farmProfile';

/** Loads "मेरा खेत" once for the whole app; falls back to the last saved copy when offline. */
export function FarmProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<FarmProfile | null | undefined>(undefined);
  const [fromCache, setFromCache] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  const setProfile = useCallback((next: FarmProfile | null) => {
    setProfileState(next);
    setFromCache(false);
    saveToCache(CACHE_KEY, next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchFarmProfile()
      .then((loaded) => !cancelled && setProfile(loaded))
      .catch((error: unknown) => {
        if (cancelled) return;
        const cached = readFromCache<FarmProfile | null>(CACHE_KEY);
        setErrorCode(error instanceof ApiError ? error.code : 'UNKNOWN');
        setFromCache(cached !== null);
        setProfileState(cached ? cached.data : null);
      });
    return () => {
      cancelled = true;
    };
  }, [setProfile]);

  const save = useCallback(
    async (next: FarmProfile) => {
      try {
        setProfile(await saveFarmProfile(next));
        setErrorCode(null);
        return true;
      } catch (error) {
        setErrorCode(error instanceof ApiError ? error.code : 'UNKNOWN');
        return false;
      }
    },
    [setProfile],
  );

  const value = useMemo<FarmProfileState>(
    () => ({ profile, fromCache, errorCode, save, setProfile }),
    [profile, fromCache, errorCode, save, setProfile],
  );
  return <FarmProfileContext.Provider value={value}>{children}</FarmProfileContext.Provider>;
}
