import type { IconType } from 'react-icons';
import {
  LuBadgeCheck, LuChevronRight, LuCircleCheckBig, LuClipboardList, LuFlag, LuHandCoins, LuHandshake, LuIndianRupee, LuLifeBuoy,
  LuPackage, LuQrCode, LuShieldAlert, LuStore, LuTicket, LuUsers,
} from 'react-icons/lu';
import { fetchStats } from '../../api/admin';
import type { Attention } from '../../api/adminConsole';
import type { ErrorCode } from '../../api/types';
import { fetchAudit } from '../../api/pilotAdmin';
import { AuditRow } from '../../components/admin/AuditRow';
import { LoadState } from '../../components/admin/LoadState';
import { StatTile } from '../../components/admin/StatTile';
import { useFlags } from '../../hooks/useFlags';
import { routes, type AdminTab } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { hiAdmin } from '../../strings/hiAdmin';
import { cn } from '../../utils/cn';
import { formatRupees } from '../../utils/money';

const RECENT_CHANGES = 5;
const PANEL = 'rounded-2xl border border-line bg-surface';

interface OverviewProps {
  attention: { data: Attention | undefined; errorCode: ErrorCode | null; reload: () => void };
}

/** Home of the panel: first what needs a person now, then shortcuts, numbers and the latest changes. */
export function AdminOverview({ attention }: OverviewProps) {
  const stats = useLoad(fetchStats, []);
  const recent = useLoad(() => fetchAudit(1), []);
  const text = hiAdmin.console;
  const label = hiAdmin.stats;

  const shortcuts: { tab: AdminTab; icon: IconType; title: string }[] = [
    { tab: 'invites', icon: LuTicket, title: hiAdmin.invites.create },
    { tab: 'sellers', icon: LuStore, title: hiAdmin.addSeller },
    { tab: 'newListing', icon: LuHandshake, title: hiAdmin.tabs.newListing },
    { tab: 'users', icon: LuUsers, title: text.findPerson },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="text-lg font-bold">{text.todo}</h2>
          <LoadState data={attention.data} errorCode={attention.errorCode} reload={attention.reload}>
            {(work) => <WorkList work={work} />}
          </LoadState>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{text.shortcuts}</h2>
          <ul className={cn(PANEL, 'divide-y divide-line')}>
            {shortcuts.map(({ tab, icon: Icon, title }) => (
              <li key={tab}>
                <a href={routes.admin(tab)} className="flex min-h-14 items-center gap-3 px-4 text-base font-bold text-primary-700 hover:bg-primary-50">
                  <Icon aria-hidden="true" className="size-5" />
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{text.numbers}</h2>
        <LoadState data={stats.data} errorCode={stats.errorCode} reload={stats.reload}>
          {(data) => (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatTile icon={LuStore} label={label.sellers} value={String(data.sellers.total)} detail={`${label.verified}: ${data.sellers.verified}`} href={routes.admin('sellers')} />
              <StatTile icon={LuUsers} label={label.buyers} value={String(data.buyers)} href={routes.admin('users')} />
              <StatTile icon={LuPackage} label={label.listings} value={String(data.listings.total)} detail={`${label.visible}: ${data.listings.visible}`} href={routes.admin('listings')} />
              <StatTile icon={LuClipboardList} label={label.orders} value={String(data.orders.total)} detail={`${label.open}: ${data.orders.open} · ${label.completed}: ${data.orders.completed}`} href={routes.admin('orders')} />
              <StatTile icon={LuIndianRupee} label={label.sales} value={formatRupees(data.salesPaise)} />
              <StatTile
                icon={LuHandCoins}
                label={`${label.commission} (${data.commissionPercent}%)`}
                value={formatRupees(data.commission.totalPaise)}
                detail={`${label.collected}: ${formatRupees(data.commission.collectedPaise)}`}
                href={routes.admin('ledger')}
              />
            </div>
          )}
        </LoadState>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{text.recent}</h2>
        <LoadState data={recent.data} errorCode={recent.errorCode} reload={recent.reload}>
          {({ items }) =>
            items.length === 0 ? (
              <p className={cn(PANEL, 'p-4 text-base text-ink-700')}>{hiAdmin.audit.none}</p>
            ) : (
              <ul className={cn(PANEL, 'divide-y divide-line')}>
                {items.slice(0, RECENT_CHANGES).map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )
          }
        </LoadState>
      </section>
    </div>
  );
}

function WorkList({ work }: { work: Attention }) {
  const { complaints } = useFlags();
  const text = hiAdmin.console.work;
  const tasks: { count: number; tab: AdminTab; icon: IconType; title: string; urgent?: boolean; note?: string }[] = [
    { count: work.overdueComplaints, tab: complaints ? 'complaints' : 'reports', icon: LuShieldAlert, title: text.overdue, urgent: true },
    { count: work.sellersNeedingUpi, tab: 'sellers', icon: LuQrCode, title: text.needUpi, urgent: true },
    { count: work.waitingListings, tab: 'listings', icon: LuPackage, title: text.listings, urgent: true },
    { count: work.newOrders, tab: 'orders', icon: LuClipboardList, title: text.orders },
    { count: work.pendingSellers, tab: 'sellers', icon: LuStore, title: text.sellers },
    { count: work.complaints, tab: complaints ? 'complaints' : 'reports', icon: LuFlag, title: text.complaints },
    { count: work.helpRequests, tab: 'help', icon: LuLifeBuoy, title: text.help },
    { count: work.serviceApprovals, tab: 'services', icon: LuBadgeCheck, title: text.services },
    { count: work.duePaise, tab: 'ledger', icon: LuHandCoins, title: text.dues, note: formatRupees(work.duePaise) },
  ];
  const waiting = tasks.filter((task) => task.count > 0);

  return (
    <>
      {work.demoCoordinators > 0 && (
        <p role="alert" className="flex gap-3 rounded-2xl border-2 border-danger-400 bg-danger-50 p-4 text-base font-bold text-danger-800">
          <LuShieldAlert aria-hidden="true" className="size-6 shrink-0" />
          {hiAdmin.console.demoWarning}
        </p>
      )}
      {waiting.length === 0 ? (
        <p className={cn(PANEL, 'flex items-center gap-3 p-4 text-base font-bold text-success-800')}>
          <LuCircleCheckBig aria-hidden="true" className="size-6" />
          {hiAdmin.console.allClear}
        </p>
      ) : (
        <ul className={cn(PANEL, 'divide-y divide-line')}>
          {waiting.map(({ count, tab, icon: Icon, title, urgent, note }) => (
            <li key={title}>
              <a href={routes.admin(tab)} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-primary-50">
                <Icon aria-hidden="true" className={cn('size-5 shrink-0', urgent ? 'text-danger-700' : 'text-primary-700')} />
                <span className={cn('min-w-0 flex-1 text-base font-bold', urgent ? 'text-danger-800' : 'text-ink-900')}>{title}</span>
                <span className={cn('rounded-full px-3 text-base font-bold tabular-nums', urgent ? 'bg-danger-100 text-danger-800' : 'bg-accent-200 text-ink-900')}>{note ?? count}</span>
                <LuChevronRight aria-hidden="true" className="size-5 text-ink-500" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
