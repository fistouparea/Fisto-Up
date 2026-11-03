import { useState } from 'react';
import { LuFlag } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { COMPLAINT_STATUSES, fetchComplaintQueue, setComplaintStatus, type Complaint, type ComplaintStatus } from '../../api/complaints';
import { LoadState } from '../../components/admin/LoadState';
import { ComplaintThread } from '../../components/complaints/ComplaintThread';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { TextField } from '../../components/ui/TextField';
import { notifyError, notifySuccess } from '../../components/ui/notify';
import { useLoad } from '../../hooks/useLoad';
import { hi } from '../../strings/hi';

/** Coordinator queue: open and in-progress complaints, most urgent SLA first; message both sides; close with a note. */
export function AdminComplaints() {
  const [status, setStatus] = useState<ComplaintStatus | undefined>(undefined);
  const { data, errorCode, reload } = useLoad(() => fetchComplaintQueue(status), [status]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Chip label={hi.complaints.admin.active} selected={!status} onClick={() => setStatus(undefined)} />
        {COMPLAINT_STATUSES.map((item) => (
          <Chip key={item} label={hi.complaints.status[item]} selected={status === item} onClick={() => setStatus(item)} />
        ))}
      </div>
      <LoadState data={data} errorCode={errorCode} reload={reload}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon={LuFlag} message={hi.complaints.admin.empty} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {items.map((complaint) => (
                <QueueItem key={complaint.id} complaint={complaint} onChanged={reload} />
              ))}
            </div>
          )
        }
      </LoadState>
    </div>
  );
}

function QueueItem({ complaint, onChanged }: { complaint: Complaint; onChanged: () => void }) {
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const step = async (to: ComplaintStatus) => {
    setBusy(true);
    try {
      const { flagged } = await setComplaintStatus(complaint.id, to, to === 'in_progress' ? undefined : resolution.trim());
      notifySuccess(flagged ? hi.complaints.admin.flagged : hi.complaints.status[to]);
      onChanged();
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
      setBusy(false);
    }
  };
  const closing = complaint.allowedNext.filter((to) => to !== 'in_progress');
  return (
    <article className="flex flex-col gap-3 rounded-3xl border border-line bg-surface-page p-3">
      <ComplaintThread complaint={complaint} onChanged={onChanged} />
      {complaint.allowedNext.includes('in_progress') && (
        <Button variant="secondary" size="md" disabled={busy} onClick={() => void step('in_progress')}>
          {hi.complaints.admin.take}
        </Button>
      )}
      {closing.length > 0 && (
        <>
          <TextField label={hi.complaints.admin.note} value={resolution} maxLength={500} onChange={(event) => setResolution(event.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            {closing.map((to) => (
              <Button key={to} variant={to === 'resolved' ? 'accent' : 'ghost'} size="md" disabled={busy || resolution.trim().length < 3} onClick={() => void step(to)}>
                {hi.complaints.admin.to[to as 'resolved' | 'rejected']}
              </Button>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
