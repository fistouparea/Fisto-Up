import { LuFlag } from 'react-icons/lu';
import { fetchComplaint } from '../../api/complaints';
import { ComplaintThread } from '../../components/complaints/ComplaintThread';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLoad } from '../../hooks/useLoad';
import { hi, marketErrorMessage } from '../../strings/hi';

/** One complaint with its conversation (reporter, the other side, coordinator). */
export function ComplaintPage({ id }: { id: string }) {
  const { data, errorCode, reload } = useLoad(() => fetchComplaint(id), [id]);
  if (errorCode) return <EmptyState icon={LuFlag} tone="warning" message={marketErrorMessage(errorCode)} />;
  if (!data) return <Skeleton className="h-64" />;
  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.complaints.one} icon={LuFlag} onBack={() => window.history.back()} backLabel={hi.back} />
      <ComplaintThread complaint={data} onChanged={reload} />
    </section>
  );
}
