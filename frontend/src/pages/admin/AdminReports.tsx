import { useState } from 'react';
import { LuCheck, LuEye, LuEyeOff, LuFlag, LuPackage } from 'react-icons/lu';
import { fetchHiddenListings, fetchReports, hideListing, resolveReport, unhideListing, type AdminReport } from '../../api/admin';
import { LoadState } from '../../components/admin/LoadState';
import { ListingPhoto } from '../../components/market/ListingPhoto';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { TextField } from '../../components/ui/TextField';
import { routes } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { runAdminAction } from './adminAction';
import { hi, roleLabels } from '../../strings/hi';
import { hiAdmin } from '../../strings/hiAdmin';
import { formatDate } from '../../utils/formatDate';


/** Open reports (flagged listings and order problems) and listings hidden by coordinators. */
export function AdminReports() {
  const reports = useLoad(() => fetchReports('open'), []);
  const hidden = useLoad(fetchHiddenListings, []);
  const reloadAll = () => {
    reports.reload();
    hidden.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <LoadState data={reports.data} errorCode={reports.errorCode} reload={reports.reload}>
        {(items) =>
          items.length === 0 ? (
            <EmptyState icon={LuFlag} tone="success" message={hiAdmin.noReports} />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {items.map((report) => (
                <ReportCard key={report.id} report={report} onChanged={reloadAll} />
              ))}
            </div>
          )
        }
      </LoadState>

      <section className="flex flex-col gap-3">
        <h3 className="text-xl font-bold">{hiAdmin.hiddenListings}</h3>
        <LoadState data={hidden.data} errorCode={hidden.errorCode} reload={hidden.reload}>
          {(listings) =>
            listings.length === 0 ? (
              <p className="text-ink-500">—</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {listings.map((listing) => (
                  <div key={listing.id} className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-3">
                    <ListingPhoto url={listing.photoUrls[0]} product={listing.product} className="size-16 shrink-0 rounded-2xl" />
                    <p className="min-w-0 flex-1 font-bold">{listing.title.hi}</p>
                    <Button variant="secondary" size="md" fullWidth={false} icon={LuEye} onClick={() => void runAdminAction(() => unhideListing(listing.id), hi.sell.saved, reloadAll)}>
                      {hiAdmin.showListing}
                    </Button>
                  </div>
                ))}
              </div>
            )
          }
        </LoadState>
      </section>
    </div>
  );
}

function ReportCard({ report, onChanged }: { report: AdminReport; onChanged: () => void }) {
  const [hideReason, setHideReason] = useState('');
  const [resolution, setResolution] = useState('');

  return (
    <article className="flex flex-col gap-3 rounded-3xl border-2 border-accent-300 bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warning" label={hi.orders.reasons[report.reason]} />
        <span className="text-sm text-ink-500">{formatDate(report.createdAt)}</span>
      </div>
      {report.text && <p className="text-lg">“{report.text}”</p>}
      <p className="text-base">
        {hiAdmin.reportedBy}: <strong>{report.reporter.name}</strong> ({roleLabels[report.reporter.role as keyof typeof roleLabels] ?? report.reporter.role})
      </p>
      {report.listing && (
        <a href={routes.listing(report.listing.id)} className="flex items-center gap-2 font-bold text-primary-700">
          <LuPackage aria-hidden="true" className="size-5" />
          {report.listing.title} · {report.listing.sellerName}
          {report.listing.hidden && <Badge tone="danger" label={hiAdmin.hidden} />}
        </a>
      )}
      {report.orderId && (
        <a href={routes.order(report.orderId)} className="font-bold text-primary-700">
          {hiAdmin.openOrder}
        </a>
      )}

      {report.listing && !report.listing.hidden && (
        <div className="flex flex-col gap-2">
          <TextField label={hiAdmin.hideReason} value={hideReason} onChange={(e) => setHideReason(e.target.value)} />
          <Button
            variant="danger"
            size="md"
            icon={LuEyeOff}
            disabled={hideReason.trim().length < 2}
            onClick={() => report.listing && void runAdminAction(() => hideListing(report.listing?.id ?? '', hideReason.trim()), hi.sell.saved, onChanged)}
          >
            {hiAdmin.hideListing}
          </Button>
        </div>
      )}
      <TextField label={hiAdmin.resolution} value={resolution} onChange={(e) => setResolution(e.target.value)} />
      <Button variant="accent" size="md" icon={LuCheck} onClick={() => void runAdminAction(() => resolveReport(report.id, resolution.trim() || undefined), hiAdmin.resolved, onChanged)}>
        {hiAdmin.resolve}
      </Button>
    </article>
  );
}
