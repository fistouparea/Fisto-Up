import { LuCamera, LuRefreshCw, LuSearchX, LuServerCrash } from 'react-icons/lu';
import { ChatPanel } from '../components/ChatPanel';
import { ResultView } from '../components/ResultView';
import { SelectedCrop } from '../components/SelectedCrop';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { routes } from '../hooks/useHashRoute';
import { useHistoryRecord } from '../hooks/useHistory';
import { errorMessages, hi } from '../strings/hi';
import { formatDate } from '../utils/formatDate';

interface HistoryDetailPageProps {
  id: string;
}

export function HistoryDetailPage({ id }: HistoryDetailPageProps) {
  const { state, retry } = useHistoryRecord(id);
  const goToNewCheck = () => (window.location.hash = routes.diagnose);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={hi.history.title}
        onBack={() => (window.location.hash = routes.history)}
        backLabel={hi.back}
      />

      {state.status === 'loading' && (
        <div className="flex flex-col gap-4" role="status" aria-label={hi.history.loading}>
          <Skeleton className="h-20" />
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      )}

      {state.status === 'error' && (
        <EmptyState
          icon={state.code === 'NOT_FOUND' ? LuSearchX : LuServerCrash}
          tone={state.code === 'NOT_FOUND' ? 'warning' : 'danger'}
          message={errorMessages[state.code]}
        >
          {state.code === 'NOT_FOUND' ? (
            <Button variant="accent" icon={LuCamera} onClick={goToNewCheck}>
              {hi.newCheck}
            </Button>
          ) : (
            <Button variant="accent" icon={LuRefreshCw} onClick={retry}>
              {hi.tryAgain}
            </Button>
          )}
        </EmptyState>
      )}

      {state.status === 'ok' && (
        <>
          <SelectedCrop
            crop={state.record.crop}
            detail={`${hi.history.checkedOn}: ${formatDate(state.record.createdAt)}`}
          />
          <ResultView diagnosis={state.record.diagnosis} />
          <ChatPanel crop={state.record.crop} diagnosis={state.record.diagnosis} />
          <Button icon={LuCamera} onClick={goToNewCheck}>
            {hi.newCheck}
          </Button>
        </>
      )}
    </div>
  );
}
