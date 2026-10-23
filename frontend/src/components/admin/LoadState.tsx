import type { ReactNode } from 'react';
import { LuRefreshCw } from 'react-icons/lu';
import type { ErrorCode } from '../../api/types';
import { hi } from '../../strings/hi';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

/** Skeleton while loading the first time, a retry on error, else the content. */
export function LoadState<T>({ data, errorCode, reload, children }: { data: T | undefined; errorCode: ErrorCode | null; reload: () => void; children: (data: T) => ReactNode }) {
  if (data !== undefined) return <>{children(data)}</>;
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
