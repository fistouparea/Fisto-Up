import { useEffect } from 'react';
import { LuCamera, LuChevronDown, LuHistory, LuInbox, LuRefreshCw, LuServerCrash } from 'react-icons/lu';
import { HistoryRow } from '../components/HistoryRow';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { notifyError } from '../components/ui/notify';
import { routes } from '../hooks/useHashRoute';
import { useHistoryList } from '../hooks/useHistory';
import { errorMessages, hi } from '../strings/hi';

export function HistoryPage() {
  const { items, hasMore, loading, errorCode, loadMore } = useHistoryList();
  const firstLoad = items.length === 0;

  // A failed "load more" keeps the list and shows a toast; a failed first load gets a full error state.
  useEffect(() => {
    if (errorCode && !firstLoad) notifyError(errorCode);
  }, [errorCode, firstLoad]);

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.history.title} icon={LuHistory} />

      {firstLoad && loading && <HistorySkeleton />}

      {firstLoad && !loading && errorCode && (
        <EmptyState icon={LuServerCrash} tone="danger" message={errorMessages[errorCode]}>
          <Button variant="accent" icon={LuRefreshCw} onClick={loadMore}>
            {hi.tryAgain}
          </Button>
        </EmptyState>
      )}

      {firstLoad && !loading && !errorCode && (
        <EmptyState icon={LuInbox} message={hi.history.empty}>
          <Button variant="accent" icon={LuCamera} onClick={() => (window.location.hash = routes.diagnose)}>
            {hi.nav.newCheck}
          </Button>
        </EmptyState>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <HistoryRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      {!firstLoad && loading && <Skeleton className="h-24" />}

      {!firstLoad && hasMore && !loading && (
        <Button variant="secondary" icon={LuChevronDown} onClick={loadMore}>
          {hi.history.loadMore}
        </Button>
      )}
    </section>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label={hi.history.loading} role="status">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-3">
          <Skeleton className="size-16 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
