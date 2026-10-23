import { useCallback, useState } from 'react';
import { ApiError } from '../api/client';
import type { ErrorCode } from '../api/types';

/** Runs one form submit at a time and keeps the error code for the screen to show. */
export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setErrorCode(null);
    try {
      return await action();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : 'UNKNOWN');
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, errorCode, setErrorCode, run };
}
