import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { fetchHistory, fetchHistoryRecord } from '../api/history';
import type { ErrorCode, HistoryPage, HistoryRecord, HistorySummary } from '../api/types';

function toErrorCode(error: unknown): ErrorCode {
  return error instanceof ApiError ? error.code : 'UNKNOWN';
}

/** Paginated "मेरी जाँच" list. Starts loading page 1 on mount. */
export function useHistoryList() {
  const [items, setItems] = useState<HistorySummary[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  const showPage = useCallback((result: HistoryPage, loadedPage: number) => {
    setItems((previous) => (loadedPage === 1 ? result.items : [...previous, ...result.items]));
    setPage(loadedPage);
    setHasMore(result.hasMore);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchHistory(1)
      .then((result) => !cancelled && showPage(result, 1))
      .catch((error: unknown) => !cancelled && setErrorCode(toErrorCode(error)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [showPage]);

  /** Loads the next page; also used to retry after an error. */
  const loadMore = async () => {
    const nextPage = page + 1;
    setLoading(true);
    setErrorCode(null);
    try {
      showPage(await fetchHistory(nextPage), nextPage);
    } catch (error) {
      setErrorCode(toErrorCode(error));
    } finally {
      setLoading(false);
    }
  };

  return { items, hasMore, loading, errorCode, loadMore: () => void loadMore() };
}

type RecordState =
  | { status: 'loading' }
  | { status: 'ok'; record: HistoryRecord }
  | { status: 'error'; code: ErrorCode };

/** One saved diagnosis. Mount with `key={id}` so a new id starts from "loading". */
export function useHistoryRecord(id: string) {
  const [state, setState] = useState<RecordState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchHistoryRecord(id)
      .then((record) => !cancelled && setState({ status: 'ok', record }))
      .catch((error: unknown) => !cancelled && setState({ status: 'error', code: toErrorCode(error) }));
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  };

  return { state, retry };
}
