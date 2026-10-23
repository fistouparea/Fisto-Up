import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { searchListings } from '../api/market';
import type { PublicListing, SearchFilters } from '../api/marketTypes';
import type { ErrorCode } from '../api/types';

interface SearchState {
  key: string;
  items: PublicListing[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  errorCode: ErrorCode | null;
}

/** Listings for these filters, page by page ("और देखें"). New filters start again from page 1. */
export function useMarketSearch(filters: SearchFilters) {
  const key = JSON.stringify(filters);
  const [state, setState] = useState<SearchState>({ key, items: [], page: 0, hasMore: false, loading: true, errorCode: null });
  const [request, setRequest] = useState({ key, page: 1, attempt: 0 });

  if (state.key !== key) {
    setState({ key, items: [], page: 0, hasMore: false, loading: true, errorCode: null });
    setRequest({ key, page: 1, attempt: request.attempt });
  }

  useEffect(() => {
    let cancelled = false;
    const wanted: SearchFilters = JSON.parse(request.key) as SearchFilters;
    searchListings(wanted, request.page)
      .then((result) => {
        if (cancelled) return;
        setState((current) =>
          current.key !== request.key
            ? current
            : {
                ...current,
                items: request.page === 1 ? result.items : [...current.items, ...result.items],
                page: request.page,
                hasMore: result.hasMore,
                loading: false,
                errorCode: null,
              },
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState((current) => ({ ...current, loading: false, errorCode: error instanceof ApiError ? error.code : 'UNKNOWN' }));
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  // Always the page after the last one that loaded, so a failed page is asked for again.
  const loadMore = () => {
    setState((current) => ({ ...current, loading: true, errorCode: null }));
    setRequest((current) => ({ ...current, page: state.page + 1, attempt: current.attempt + 1 }));
  };

  const retry = useCallback(() => {
    setState((current) => ({ ...current, loading: true, errorCode: null }));
    setRequest((current) => ({ ...current, attempt: current.attempt + 1 }));
  }, []);

  return { ...state, loadMore, retry };
}
