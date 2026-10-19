import { BigButton } from '../components/BigButton';
import { ChatPanel } from '../components/ChatPanel';
import { NoticeView } from '../components/NoticeView';
import { ResultView } from '../components/ResultView';
import { SelectedCrop } from '../components/SelectedCrop';
import { routes } from '../hooks/useHashRoute';
import { useHistoryRecord } from '../hooks/useHistory';
import { errorMessages, hi } from '../strings/hi';
import { formatDate } from '../utils/formatDate';

interface HistoryDetailPageProps {
  id: string;
}

export function HistoryDetailPage({ id }: HistoryDetailPageProps) {
  const { state, retry } = useHistoryRecord(id);

  return (
    <div className="flex flex-col gap-4">
      <a href={routes.history} className="min-h-12 self-start py-2 text-xl font-bold text-green-800 underline">
        {hi.history.back}
      </a>

      {state.status === 'loading' && <p className="py-6 text-center text-xl text-gray-600">{hi.history.loading}</p>}

      {state.status === 'error' && (
        <NoticeView icon="😟" message={errorMessages[state.code]}>
          {state.code !== 'NOT_FOUND' && <BigButton onClick={retry}>{hi.tryAgain}</BigButton>}
        </NoticeView>
      )}

      {state.status === 'ok' && (
        <>
          <div>
            <SelectedCrop crop={state.record.crop} />
            <p className="-mt-2 text-lg text-gray-600">
              {hi.history.checkedOn}: {formatDate(state.record.createdAt)}
            </p>
          </div>
          <ResultView diagnosis={state.record.diagnosis} />
          <ChatPanel crop={state.record.crop} diagnosis={state.record.diagnosis} />
          <BigButton onClick={() => (window.location.hash = routes.diagnose)}>{hi.newCheck}</BigButton>
        </>
      )}
    </div>
  );
}
