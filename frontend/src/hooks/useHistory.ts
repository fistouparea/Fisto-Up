import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { fetchHistory, fetchHistoryRecord } from '../api/history';
import type { ErrorCode, HistoryPage, HistoryRecord, HistorySummary } from '../api/types';
import { readFromCache, saveToCache } from '../utils/offlineCache';

const FIRST_PAGE_KEY = 'history:page1';
const recordKey = (id: string) => `history:item:${id}`;

function toErrorCode(error: unknown): ErrorCode {
  return error instanceof ApiError ? error.code : 'UNKNOWN';
}

/** Paginated "मेरी जाँच" list. Shows the saved first page at once (works offline), then refreshes. */
export function useHistoryList() {
  const [cachedFirstPage] = useState(() => readFromCache<HistoryPage>(FIRST_PAGE_KEY)?.data);
  const [items, setItems] = useState<HistorySummary[]>(cachedFirstPage?.items ?? []);
  const [page, setPage] = useState(cachedFirstPage ? 1 : 0);
  const [hasMore, setHasMore] = useState(cachedFirstPage?.hasMore ?? false);
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
      .then((result) => {
        if (cancelled) return;
        saveToCache(FIRST_PAGE_KEY, result);
        showPage(result, 1);
      })
      // With a saved copy on screen, a failed refresh is not an error (the offline banner explains it).
      .catch((error: unknown) => !cancelled && !cachedFirstPage && setErrorCode(toErrorCode(error)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [showPage, cachedFirstPage]);

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

/** One saved diagnosis (also kept for offline). Mount with `key={id}` so a new id starts fresh. */
export function useHistoryRecord(id: string) {
  const [state, setState] = useState<RecordState>(() => {
    const cached = readFromCache<HistoryRecord>(recordKey(id));
    return cached ? { status: 'ok', record: cached.data } : { status: 'loading' };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchHistoryRecord(id)
      .then((record) => {
        if (cancelled) return;
        saveToCache(recordKey(id), record);
        setState({ status: 'ok', record });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState((current) => (current.status === 'ok' ? current : { status: 'error', code: toErrorCode(error) }));
      });
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
