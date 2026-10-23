import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import type { ErrorCode } from '../api/types';

/**
 * Loads data for a screen; `reload` after a change. `deps` are the inputs (e.g. a filter).
 * Old data stays visible while new data loads, so lists do not flash empty.
 */
export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([...deps, attempt]);
  const [state, setState] = useState<{ key: string | null; data: T | undefined; errorCode: ErrorCode | null }>({
    key: null,
    data: undefined,
    errorCode: null,
  });

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => !cancelled && setState({ key, data, errorCode: null }))
      .catch((error: unknown) => {
        if (!cancelled) setState((current) => ({ ...current, key, errorCode: error instanceof ApiError ? error.code : 'UNKNOWN' }));
      });
    return () => {
      cancelled = true;
    };
    // `load` is a new function each render; `key` covers its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { data: state.data, errorCode: state.errorCode, loading: state.key !== key, reload };
}
