import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { fetchListing } from '../api/market';
import type { PublicListing } from '../api/marketTypes';
import type { ErrorCode } from '../api/types';

export function useListing(id: string) {
  const [state, setState] = useState<{ listing: PublicListing | null; errorCode: ErrorCode | null; loading: boolean }>({
    listing: null,
    errorCode: null,
    loading: true,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchListing(id)
      .then((listing) => !cancelled && setState({ listing, errorCode: null, loading: false }))
      .catch((error: unknown) => {
        if (!cancelled) setState({ listing: null, errorCode: error instanceof ApiError ? error.code : 'UNKNOWN', loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true }));
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, retry };
}
