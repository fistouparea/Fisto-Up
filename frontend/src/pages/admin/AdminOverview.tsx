import { LuClipboardList, LuFlag, LuHandCoins, LuIndianRupee, LuPackage, LuPercent, LuShoppingBasket, LuStore } from 'react-icons/lu';
import { fetchStats } from '../../api/admin';
import { LoadState } from '../../components/admin/LoadState';
import { StatTile } from '../../components/admin/StatTile';
import { routes } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { hi } from '../../strings/hi';
import { formatRupees } from '../../utils/money';

const text = hi.admin.stats;

export function AdminOverview() {
  const { data, errorCode, reload } = useLoad(fetchStats, []);
  return (
    <LoadState data={data} errorCode={errorCode} reload={reload}>
      {(stats) => (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={LuStore}
            label={text.sellers}
            value={String(stats.sellers.total)}
            detail={`${text.pending}: ${stats.sellers.pending} · ${text.verified}: ${stats.sellers.verified}`}
            href={routes.admin('sellers')}
            highlight={stats.sellers.pending > 0}
          />
          <StatTile icon={LuShoppingBasket} label={text.buyers} value={String(stats.buyers)} />
          <StatTile icon={LuPackage} label={text.listings} value={String(stats.listings.total)} detail={`${text.visible}: ${stats.listings.visible}`} />
          <StatTile
            icon={LuClipboardList}
            label={text.orders}
            value={String(stats.orders.total)}
            detail={`${text.open}: ${stats.orders.open} · ${text.completed}: ${stats.orders.completed}`}
            href={routes.admin('orders')}
          />
          <StatTile icon={LuIndianRupee} label={text.sales} value={formatRupees(stats.salesPaise)} />
          <StatTile
            icon={LuHandCoins}
            label={text.commission}
            value={formatRupees(stats.commission.totalPaise)}
            detail={`${text.collected}: ${formatRupees(stats.commission.collectedPaise)}`}
            href={routes.admin('ledger')}
          />
          <StatTile
            icon={LuHandCoins}
            label={text.due}
            value={formatRupees(stats.commission.duePaise)}
            href={routes.admin('ledger')}
            highlight={stats.commission.duePaise > 0}
          />
          <StatTile
            icon={LuFlag}
            label={text.openReports}
            value={String(stats.openReports)}
            href={routes.admin('reports')}
            highlight={stats.openReports > 0}
          />
          <StatTile icon={LuPercent} label={text.rate} value={`${stats.commissionPercent}%`} />
        </div>
      )}
    </LoadState>
  );
}
