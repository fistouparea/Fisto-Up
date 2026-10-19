import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import type { ErrorCode } from '../api/types';
import { readFromCache, saveToCache } from '../utils/offlineCache';

export interface CachedResource<T> {
  data: T | undefined;
  loading: boolean;
  /** Shown data is the saved copy, because refreshing failed (e.g. no internet). */
  fromCache: boolean;
  /** ISO time of the last successful update. */
  savedAt: string | null;
  errorCode: ErrorCode | null;
  reload: () => void;
}

/**
 * Shows the last saved copy immediately (fast on slow internet, works offline),
 * then refreshes from the server and saves the new copy.
 * `key` identifies the data; change it (e.g. include the location) to refetch.
 */
export function useCachedResource<T>(key: string | null, fetcher: () => Promise<T>): CachedResource<T> {
  const [state, setState] = useState(() => initialState<T>(key));
  const [attempt, setAttempt] = useState(0);
  const [prevKey, setPrevKey] = useState(key);

  // Reset when the key changes (adjusting state during render, as React recommends).
  if (key !== prevKey) {
    setPrevKey(key);
    setState(initialState<T>(key));
  }

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (cancelled) return;
        saveToCache(key, data);
        setState({ data, loading: false, fromCache: false, savedAt: new Date().toISOString(), errorCode: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const errorCode = error instanceof ApiError ? error.code : 'UNKNOWN';
        setState((current) => ({ ...current, loading: false, fromCache: current.data !== undefined, errorCode }));
      });
    return () => {
      cancelled = true;
    };
    // `fetcher` is intentionally not a dependency: callers pass a new function each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, errorCode: null }));
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, reload };
}

function initialState<T>(key: string | null): Omit<CachedResource<T>, 'reload'> {
  const cached = key ? readFromCache<T>(key) : null;
  return {
    data: cached?.data,
    loading: key !== null,
    fromCache: cached !== null,
    savedAt: cached?.savedAt ?? null,
    errorCode: null,
  };
}
