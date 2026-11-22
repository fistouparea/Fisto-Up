import type { ReactNode } from 'react';
import { LuRefreshCw } from 'react-icons/lu';
import type { ErrorCode } from '../../api/types';
import { hi } from '../../strings/hi';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

/** Skeleton while loading the first time, a retry on error, else the content. */
export function LoadState<T>({ data, errorCode, reload, children }: { data: T | undefined; errorCode: ErrorCode | null; reload: () => void; children: (data: T) => ReactNode }) {
  if (data !== undefined) {
    return (
      <>
        {/* A failed refresh or filter must not look like fresh data. */}
        {errorCode && (
          <p role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-warning-50 px-3 text-base font-bold text-warning-800">
            {hi.admin.loadFailed}
            <button type="button" onClick={reload} className="min-h-12 underline">
              {hi.tryAgain}
            </button>
          </p>
        )}
        {children(data)}
      </>
    );
  }
  if (errorCode) {
    return (
      <EmptyState icon={LuRefreshCw} tone="warning" message={hi.admin.loadFailed}>
        <Button variant="accent" icon={LuRefreshCw} onClick={reload}>
          {hi.tryAgain}
        </Button>
      </EmptyState>
    );
  }
  return <Skeleton className="h-48" />;
}
