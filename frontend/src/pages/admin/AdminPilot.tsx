import { useState, type ReactNode } from 'react';
import { LuChartColumn, LuFileDown, LuHandCoins, LuIndianRupee, LuPackageCheck, LuStore, LuUsers } from 'react-icons/lu';
import { downloadDashboardCsv, fetchPilotDashboard, type DashboardExport, type PilotDashboard } from '../../api/pilotDashboard';
import { LoadState } from '../../components/admin/LoadState';
import { StatTile } from '../../components/admin/StatTile';
import { WeeklyBars, type BarSeries } from '../../components/admin/WeeklyBars';
import { Chip } from '../../components/ui/Chip';
import { notifyError } from '../../components/ui/notify';
import { ApiError } from '../../api/client';
import { useLoad } from '../../hooks/useLoad';
import { cropLabels, hi, productLabels } from '../../strings/hi';
import { saveBlob } from '../../utils/download';
import { formatRupees } from '../../utils/money';

const WEEK_CHOICES = [4, 8, 12, 26] as const;
const text = hi.admin.pilot;

/** Validated pair (dataviz validator): primary-500 #1b7445 + accent-500 #e2a10a; a legend and a table back them up. */
const ONE: BarSeries[] = [{ key: 'value', label: '', colorClass: 'bg-primary-500' }];
const DIAGNOSIS_SERIES: BarSeries[] = [
  { key: 'ok', label: text.diagnosesOk, colorClass: 'bg-primary-500' },
  { key: 'unclear', label: text.diagnosesUnclear, colorClass: 'bg-accent-500' },
];

const shortDate = (week: string) => (week ? new Date(`${week}T00:00:00`).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' }) : text.weekOf);

/** Coordinator's Pilot Dashboard: anonymous counts only, every section downloadable as CSV. */
export function AdminPilot() {
  const [weeks, setWeeks] = useState<number>(8);
  const dashboard = useLoad(() => fetchPilotDashboard(weeks), [weeks]);

  const download = async (name: DashboardExport | 'feedback-comments') => {
    try {
      saveBlob(await downloadDashboardCsv(name, weeks), `agriai-${name}.csv`);
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg text-ink-700">{text.intro}</p>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={text.weeks}>
        <span className="text-base font-bold text-ink-900">{text.weeks}:</span>
        {WEEK_CHOICES.map((choice) => (
          <Chip key={choice} label={String(choice)} selected={weeks === choice} onClick={() => setWeeks(choice)} />
        ))}
      </div>
      <LoadState data={dashboard.data} errorCode={dashboard.errorCode} reload={dashboard.reload}>
        {(data) => <DashboardBody data={data} onDownload={(name) => void download(name)} />}
      </LoadState>
    </div>
  );
}

function DashboardBody({ data, onDownload }: { data: PilotDashboard; onDownload: (name: DashboardExport | 'feedback-comments') => void }) {
  const chartProps = { weekLabel: shortDate, weekHeader: text.weekOf, tableLabel: text.table };
  const thisWeek = data.weeklyActiveFarmers.at(-1)?.farmers ?? 0;

  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile icon={LuUsers} label={text.activeFarmersNow} value={String(thisWeek)} />
        <StatTile icon={LuStore} label={text.activeListings} value={String(data.totals.activeListings)} detail={`${text.newListings}: ${data.totals.listings}`} />
        <StatTile icon={LuPackageCheck} label={text.completedOrders} value={String(data.totals.completedOrders)} detail={`${text.newOrders}: ${data.totals.orders}`} />
        <StatTile icon={LuIndianRupee} label={text.sales} value={formatRupees(data.totals.salesPaise)} detail={text.totalsNote} />
        <StatTile icon={LuHandCoins} label={text.commission} value={formatRupees(data.totals.commissionPaise)} detail={text.totalsNote} />
      </section>

      <Section title={text.activeFarmers} csv="weekly-active-farmers" onDownload={onDownload}>
        <WeeklyBars series={ONE} rows={data.weeklyActiveFarmers.map((row) => ({ week: row.week, values: { value: row.farmers } }))} {...chartProps} />
      </Section>

      <Section title={text.diagnoses} csv="diagnoses" onDownload={onDownload}>
        <WeeklyBars series={DIAGNOSIS_SERIES} rows={data.diagnoses.map((row) => ({ week: row.week, values: { ok: row.ok, unclear: row.unclear } }))} {...chartProps} />
      </Section>

      <Section title={text.aiFeedback} csv="ai-feedback-by-crop" onDownload={onDownload}>
        {data.aiFeedbackByCrop.length === 0 ? (
          <p className="text-ink-500">{text.aiNone}</p>
        ) : (
          <ul className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
            {data.aiFeedbackByCrop.map((row) => (
              <li key={row.crop} className="flex flex-col gap-1">
                <div className="flex justify-between gap-2 text-base">
                  <span className="font-bold text-ink-900">{cropLabels[row.crop].hindi}</span>
                  <span className="tabular-nums text-ink-700">
                    👍 {row.helpfulPercent}% · {row.answers} {text.aiAnswers}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-line" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${row.helpfulPercent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => onDownload('feedback-comments')} className="self-start text-base font-bold text-primary-700 underline">
          {text.comments}
        </button>
      </Section>

      <Section title={text.followUps} csv="follow-ups" onDownload={onDownload}>
        <div className="grid grid-cols-3 gap-3">
          {(['better', 'same', 'worse'] as const).map((answer) => (
            <div key={answer} className="rounded-3xl border border-line bg-surface p-3 text-center">
              <p className="text-base text-ink-500">{text[answer]}</p>
              <p className="text-2xl font-bold tabular-nums text-ink-900">{data.followUps[answer]}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={text.market} csv="market" onDownload={onDownload}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <WeeklyBars title={text.newOrders} series={ONE} rows={data.market.map((row) => ({ week: row.week, values: { value: row.orders } }))} {...chartProps} />
          <WeeklyBars title={text.completedOrders} series={ONE} rows={data.market.map((row) => ({ week: row.week, values: { value: row.completed } }))} {...chartProps} />
          <WeeklyBars title={text.newListings} series={ONE} rows={data.market.map((row) => ({ week: row.week, values: { value: row.listings } }))} {...chartProps} />
          <WeeklyBars title={text.sales} series={ONE} format={formatRupees} rows={data.market.map((row) => ({ week: row.week, values: { value: row.salesPaise } }))} {...chartProps} />
        </div>
      </Section>

      <Section title={text.priceVsMandi} csv="price-vs-mandi" onDownload={onDownload}>
        {data.priceVsMandi.length === 0 ? (
          <p className="text-ink-500">{text.noPrices}</p>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="text-ink-500">
                  <th className="p-2 sm:p-3 font-normal" />
                  <th className="p-2 sm:p-3 text-right font-normal">{text.listed}</th>
                  <th className="p-2 sm:p-3 text-right font-normal">{text.sold}</th>
                  <th className="p-2 sm:p-3 text-right font-normal">{text.mandiPrice}</th>
                </tr>
              </thead>
              <tbody>
                {data.priceVsMandi.map((row) => (
                  <tr key={row.product} className="border-t border-line">
                    <th className="p-2 sm:p-3 font-bold text-ink-900">{productLabels[row.product].hi}</th>
                    <td className="p-2 sm:p-3 text-right tabular-nums">{money(row.listedPerQuintalPaise)}</td>
                    <td className="p-2 sm:p-3 text-right tabular-nums">{money(row.soldPerQuintalPaise)}</td>
                    <td className="p-2 text-right tabular-nums sm:p-3">{money(row.mandiPerQuintalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.priceVsMandi.some((row) => row.mandiPerQuintalPaise === null) && <p className="text-sm text-ink-500">— {text.noMandi}</p>}
      </Section>
    </>
  );
}

const money = (paise: number | null) => (paise === null ? '—' : formatRupees(paise));

function Section({ title, csv, onDownload, children }: { title: string; csv: DashboardExport; onDownload: (name: DashboardExport) => void; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xl font-bold text-ink-900">
          <LuChartColumn aria-hidden="true" className="size-6 shrink-0 text-primary-700" />
          {title}
        </h3>
        <button
          type="button"
          onClick={() => onDownload(csv)}
          aria-label={`${title}: ${text.csv}`}
          className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border-2 border-primary-700 px-4 text-base font-bold text-primary-700"
        >
          <LuFileDown aria-hidden="true" className="size-5" />
          {text.csv}
        </button>
      </div>
      {children}
    </section>
  );
}
