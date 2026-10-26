import { useState } from 'react';
import { LuCheck, LuLifeBuoy, LuPhone } from 'react-icons/lu';
import { fetchHelpRequests, resolveHelpRequest, type AdminHelpRequest } from '../../api/pilotAdmin';
import { LoadState } from '../../components/admin/LoadState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { TextField } from '../../components/ui/TextField';
import { useLoad } from '../../hooks/useLoad';
import { hi, roleLabels } from '../../strings/hi';
import { formatDate } from '../../utils/formatDate';
import { runAdminAction } from './adminAction';

/** Open "मदद/शिकायत" requests from the app, newest first. */
export function AdminHelp() {
  const requests = useLoad(fetchHelpRequests, []);
  return (
    <LoadState data={requests.data} errorCode={requests.errorCode} reload={requests.reload}>
      {(items) =>
        items.length === 0 ? (
          <EmptyState icon={LuLifeBuoy} tone="success" message={hi.admin.help.none} />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <HelpCard key={item.id} request={item} onDone={requests.reload} />
            ))}
          </div>
        )
      }
    </LoadState>
  );
}

function HelpCard({ request, onDone }: { request: AdminHelpRequest; onDone: () => void }) {
  const [resolution, setResolution] = useState('');
  const who = request.from ? `${request.from.name} (${roleLabels[request.from.role as keyof typeof roleLabels] ?? request.from.role})` : hi.admin.help.anonymous;
  return (
    <article className="flex flex-col gap-3 rounded-3xl border-2 border-accent-300 bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warning" label={hi.help.categories[request.category]} />
        <span className="text-sm text-ink-500">{formatDate(request.createdAt)}</span>
      </div>
      <p className="text-lg">“{request.message}”</p>
      <p className="text-base">{who}</p>
      {request.phone && (
        <a href={`tel:${request.phone}`} className="inline-flex items-center gap-2 text-lg font-bold text-primary-700">
          <LuPhone aria-hidden="true" className="size-5" />
          {hi.admin.help.call}: {request.phone}
        </a>
      )}
      <TextField label={hi.admin.help.resolution} value={resolution} onChange={(event) => setResolution(event.target.value)} />
      <Button
        variant="accent"
        size="md"
        icon={LuCheck}
        onClick={() => void runAdminAction(() => resolveHelpRequest(request.id, resolution.trim() || undefined), hi.admin.help.resolved, onDone)}
      >
        {hi.admin.help.resolve}
      </Button>
    </article>
  );
}
