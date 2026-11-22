import { useState } from 'react';
import { LuHistory } from 'react-icons/lu';
import { fetchAudit } from '../../api/pilotAdmin';
import { AuditRow } from '../../components/admin/AuditRow';
import { LoadState } from '../../components/admin/LoadState';
import { Pager } from '../../components/admin/Pager';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLoad } from '../../hooks/useLoad';
import { hiAdmin } from '../../strings/hiAdmin';

/** Read-only list of coordinator actions (append-only on the server). */
export function AdminAudit() {
  const [page, setPage] = useState(1);
  const audit = useLoad(() => fetchAudit(page), [page]);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-ink-700">{hiAdmin.audit.intro}</p>
      <LoadState data={audit.data} errorCode={audit.errorCode} reload={audit.reload}>
        {({ items, hasMore }) =>
          items.length === 0 ? (
            <EmptyState icon={LuHistory} message={hiAdmin.audit.none} />
          ) : (
            <>
              <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
                {items.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </ul>
              <Pager page={page} hasMore={hasMore} onPage={setPage} />
            </>
          )
        }
      </LoadState>
    </div>
  );
}
