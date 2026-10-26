import { useState } from 'react';
import { LuFileDown, LuHandCoins, LuPhone } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { downloadLedgerCsv, fetchMonthTotals, fetchReferralTotals, fetchSellerDues, markCollected, type SellerDues } from '../../api/admin';
import { LoadState } from '../../components/admin/LoadState';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { notifyError, notifySuccess } from '../../components/ui/notify';
import { useLoad } from '../../hooks/useLoad';
import { hi } from '../../strings/hi';
import { saveBlob } from '../../utils/download';
import { formatRupees } from '../../utils/money';

const monthName = new Intl.DateTimeFormat('hi-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthLabel = (month: string) => monthName.format(new Date(`${month}-01T00:00:00Z`));
const num = 'text-right tabular-nums';

/** Commission ledger: monthly totals, dues per seller ("वसूल किया"), CSV export. All amounts from integer paise. */
export function AdminLedger() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const months = useLoad(fetchMonthTotals, []);
  const referrals = useLoad(fetchReferralTotals, []);
  const dues = useLoad(() => fetchSellerDues(month), [month]);
  const reloadAll = () => {
    months.reload();
    dues.reload();
  };

  const download = async () => {
    try {
      saveBlob(await downloadLedgerCsv(month), `agriai-commission-${month ?? 'all'}.csv`);
    } catch {
      notifyError('UNKNOWN');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {referrals.data && referrals.data.length > 0 && (
        <section className="rounded-3xl border-2 border-accent-300 bg-surface-cream p-4">
          <h3 className="text-xl font-bold">{hi.admin.referrals}</h3>
          <ul className="mt-2 flex flex-col gap-1 text-base">
            {referrals.data.map((row) => (
              <li key={row.month} className="flex justify-between gap-3">
                <span>{monthLabel(row.month)} · {row.orders} {hi.admin.ordersCount}</span>
                <strong className="tabular-nums">{formatRupees(row.commissionPaise)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
      <LoadState data={months.data} errorCode={months.errorCode} reload={months.reload}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState icon={LuHandCoins} message={hi.admin.noLedger} />
          ) : (
            <section className="flex flex-col gap-3">
              <h3 className="text-xl font-bold">{hi.admin.monthly}</h3>
              <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
                <table className="w-full min-w-[34rem] text-base">
                  <thead className="bg-surface-green text-left">
                    <tr>
                      <th className="p-3">{hi.admin.month}</th>
                      <th className={`p-3 ${num}`}>{hi.admin.ordersCount}</th>
                      <th className={`p-3 ${num}`}>{hi.admin.sales}</th>
                      <th className={`p-3 ${num}`}>{hi.admin.commission}</th>
                      <th className={`p-3 ${num}`}>{hi.admin.collected}</th>
                      <th className={`p-3 ${num}`}>{hi.admin.due}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.month} className="border-t border-line">
                        <td className="p-3 font-bold">{monthLabel(row.month)}</td>
                        <td className={`p-3 ${num}`}>{row.orders}</td>
                        <td className={`p-3 ${num}`}>{formatRupees(row.salesPaise)}</td>
                        <td className={`p-3 ${num}`}>{formatRupees(row.commissionPaise)}</td>
                        <td className={`p-3 ${num}`}>{formatRupees(row.collectedPaise)}</td>
                        <td className={`p-3 font-bold ${num}`}>{formatRupees(row.duePaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={hi.admin.month}>
                <Chip label={hi.admin.allTime} selected={month === undefined} onClick={() => setMonth(undefined)} />
                {rows.map((row) => (
                  <Chip key={row.month} label={monthLabel(row.month)} selected={month === row.month} onClick={() => setMonth(row.month)} />
                ))}
              </div>
            </section>
          )
        }
      </LoadState>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold">
            {hi.admin.perSeller} · {month ? monthLabel(month) : hi.admin.allTime}
          </h3>
          <Button variant="secondary" size="md" fullWidth={false} icon={LuFileDown} onClick={() => void download()}>
            {hi.admin.exportCsv}
          </Button>
        </div>
        <LoadState data={dues.data} errorCode={dues.errorCode} reload={dues.reload}>
          {(rows) => (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {rows.map((row) => (
                <DuesCard key={row.sellerId} row={row} month={month} onCollected={reloadAll} />
              ))}
            </div>
          )}
        </LoadState>
      </section>
    </div>
  );
}

function DuesCard({ row, month, onCollected }: { row: SellerDues; month: string | undefined; onCollected: () => void }) {
  const [busy, setBusy] = useState(false);
  const collect = async () => {
    setBusy(true);
    try {
      const result = await markCollected(row.sellerId, month);
      notifySuccess(`${hi.admin.collectedDone}: ${formatRupees(result.amountPaise)}`);
      onCollected();
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <h4 className="min-w-0 flex-1 text-lg font-bold">
          {row.name}
          {row.village && <span className="font-normal text-ink-500">, {row.village}</span>}
        </h4>
        <a href={`tel:+91${row.phone}`} aria-label={`${hi.orders.call} ${row.phone}`} className="flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <LuPhone aria-hidden="true" className="size-5" />
        </a>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 text-base">
        <dt className="text-ink-500">
          {hi.admin.sales} ({row.orders} {hi.admin.ordersCount})
        </dt>
        <dd className={num}>{formatRupees(row.salesPaise)}</dd>
        <dt className="text-ink-500">{hi.admin.commission}</dt>
        <dd className={num}>{formatRupees(row.commissionPaise)}</dd>
        <dt className="text-ink-500">{hi.admin.collected}</dt>
        <dd className={num}>{formatRupees(row.collectedPaise)}</dd>
        <dt className="font-bold">{hi.admin.due}</dt>
        <dd className={`text-xl font-bold ${num}`}>{formatRupees(row.duePaise)}</dd>
      </dl>
      <Button variant={row.duePaise > 0 ? 'accent' : 'secondary'} size="md" icon={LuHandCoins} disabled={busy || row.duePaise === 0} onClick={() => void collect()}>
        {row.duePaise > 0 ? `${hi.admin.markCollected} (${formatRupees(row.duePaise)})` : hi.admin.nothingDue}
      </Button>
    </article>
  );
}
