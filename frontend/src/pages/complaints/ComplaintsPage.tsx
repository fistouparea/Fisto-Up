import { LuFlag } from 'react-icons/lu';
import { fetchMyComplaints } from '../../api/complaints';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useFlags } from '../../hooks/useFlags';
import { routes } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { hi, marketErrorMessage } from '../../strings/hi';
import { hiF } from '../../strings/hiFeatures';

/** "मेरी शिकायतें": complaints I made and complaints about me. */
export function ComplaintsPage() {
  const { complaints } = useFlags();
  const { data, errorCode } = useLoad(() => (complaints ? fetchMyComplaints() : Promise.resolve([])), [complaints]);
  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hiF.complaints.title} icon={LuFlag} />
      {!complaints && <EmptyState icon={LuFlag} message={hiF.schemes.off} />}
      {complaints && errorCode && <EmptyState icon={LuFlag} tone="warning" message={marketErrorMessage(errorCode)} />}
      {complaints && !errorCode && data === undefined && <Skeleton className="h-48" />}
      {data?.length === 0 && complaints && <EmptyState icon={LuFlag} message={hiF.complaints.empty} />}
      <ul className="flex flex-col gap-2">
        {data?.map((complaint) => (
          <li key={complaint.id}>
            <a href={routes.complaint(complaint.id)} className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card">
              <LuFlag aria-hidden="true" className="size-7 shrink-0 text-danger-700" />
              {/* The status sits under the title: next to it the title was cut to "महिंद्रा 57…" at 360 px. */}
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="block font-bold">{complaint.target.title}</span>
                <span className="block text-sm text-ink-500">
                  {hi.orders.reasons[complaint.category]} · {complaint.viewerRole === 'against' ? hiF.complaints.aboutMe : hiF.complaints.byMe}
                </span>
                <Badge tone={complaint.status === 'resolved' ? 'success' : complaint.status === 'rejected' ? 'neutral' : 'warning'} label={hiF.complaints.status[complaint.status]} />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
