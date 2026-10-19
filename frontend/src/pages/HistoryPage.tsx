import { cropLabels, errorMessages, hi } from '../strings/hi';
import { BigButton } from '../components/BigButton';
import { NoticeView } from '../components/NoticeView';
import { routes } from '../hooks/useHashRoute';
import { useHistoryList } from '../hooks/useHistory';
import { formatDate } from '../utils/formatDate';

export function HistoryPage() {
  const { items, hasMore, loading, errorCode, loadMore } = useHistoryList();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-bold text-gray-900">{hi.history.title}</h2>

      {items.length === 0 && !loading && !errorCode && (
        <NoticeView icon="📋" message={hi.history.empty}>
          <a href={routes.diagnose} className="text-center text-xl font-bold text-green-800 underline">
            {hi.nav.newCheck}
          </a>
        </NoticeView>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const crop = cropLabels[item.crop];
          return (
            <li key={item.id}>
              <a
                href={routes.historyItem(item.id)}
                className="flex items-center gap-3 rounded-2xl border-2 border-green-200 bg-white p-4 shadow-sm active:bg-green-50"
              >
                <span className="text-4xl" aria-hidden="true">
                  {crop.emoji}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-xl font-bold text-gray-900">{item.problemName}</span>
                  <span className="text-base text-gray-600">
                    {crop.hindi} · {formatDate(item.createdAt)}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      {loading && <p className="py-4 text-center text-xl text-gray-600">{hi.history.loading}</p>}

      {errorCode && (
        <NoticeView icon="😟" message={errorMessages[errorCode]}>
          <BigButton onClick={loadMore}>{hi.tryAgain}</BigButton>
        </NoticeView>
      )}

      {hasMore && !loading && !errorCode && (
        <BigButton variant="secondary" onClick={loadMore}>
          {hi.history.loadMore}
        </BigButton>
      )}
    </section>
  );
}
