import { useState } from 'react';
import { LuBadgeCheck, LuCircleX } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { approveService, fetchPendingServices, rejectService, type ServiceListing } from '../../api/services';
import { LoadState } from '../../components/admin/LoadState';
import { ServiceCard } from '../../components/services/ServiceCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { TextField } from '../../components/ui/TextField';
import { notifyError, notifySuccess } from '../../components/ui/notify';
import { useLoad } from '../../hooks/useLoad';
import { hiF } from '../../strings/hiFeatures';

/** Listings waiting for a coordinator (every animal listing): approve, or refuse with a reason. Audited. */
export function AdminServices() {
  const { data, errorCode, reload } = useLoad(fetchPendingServices, []);
  return (
    <LoadState data={data} errorCode={errorCode} reload={reload}>
      {(items) =>
        items.length === 0 ? (
          <EmptyState icon={LuBadgeCheck} message={hiF.services.admin.empty} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((listing) => (
              <Review key={listing.id} listing={listing} onDone={reload} />
            ))}
          </div>
        )
      }
    </LoadState>
  );
}

function Review({ listing, onDone }: { listing: ServiceListing; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      notifySuccess(done);
      onDone();
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
      setBusy(false);
    }
  };
  return (
    <article className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-3">
      <ServiceCard listing={listing} showStatus />
      {listing.description && <p className="text-base">{listing.description}</p>}
      <Button variant="accent" size="md" icon={LuBadgeCheck} disabled={busy} onClick={() => void act(() => approveService(listing.id), hiF.services.admin.approved)}>
        {hiF.services.admin.approve}
      </Button>
      <TextField label={hiF.services.admin.reason} value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} />
      <Button variant="danger" size="md" icon={LuCircleX} disabled={busy || reason.trim().length < 2} onClick={() => void act(() => rejectService(listing.id, reason.trim()), hiF.services.admin.rejected)}>
        {hiF.services.admin.reject}
      </Button>
    </article>
  );
}
