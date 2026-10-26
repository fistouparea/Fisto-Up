import { useState } from 'react';
import { LuHistory } from 'react-icons/lu';
import { fetchAudit } from '../../api/pilotAdmin';
import { LoadState } from '../../components/admin/LoadState';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLoad } from '../../hooks/useLoad';
import { hi } from '../../strings/hi';
import { formatDate } from '../../utils/formatDate';

/** Read-only list of coordinator actions (append-only on the server). */
export function AdminAudit() {
  const [page, setPage] = useState(1);
  const audit = useLoad(() => fetchAudit(page), [page]);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg text-ink-700">{hi.admin.audit.intro}</p>
      <LoadState data={audit.data} errorCode={audit.errorCode} reload={audit.reload}>
        {({ items, hasMore }) =>
          items.length === 0 ? (
            <EmptyState icon={LuHistory} message={hi.admin.audit.none} />
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-line rounded-3xl border-2 border-line bg-surface">
                {items.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-1 p-3">
                    <p className="font-bold text-ink-900">{entry.action}</p>
                    <p className="break-all text-sm text-ink-500">
                      {formatDate(entry.at)} · {entry.target.type} {entry.target.id}
                    </p>
                    {entry.details && (
                      <p className="break-words text-sm text-ink-700">
                        {Object.entries(entry.details)
                          .filter(([, value]) => value !== null && value !== undefined)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(' · ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {hasMore && (
                <Button variant="secondary" onClick={() => setPage((current) => current + 1)}>
                  {hi.admin.audit.more}
                </Button>
              )}
            </>
          )
        }
      </LoadState>
    </div>
  );
}
