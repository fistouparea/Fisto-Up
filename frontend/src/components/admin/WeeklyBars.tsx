import { useState } from 'react';
import { cn } from '../../utils/cn';

export interface BarSeries {
  key: string;
  label: string;
  /** Background class of the bar segment (validated pair: primary-500 + accent-500). */
  colorClass: string;
}

interface WeeklyBarsProps {
  title: string;
  /** One row per week, oldest first; `values[series.key]`. */
  rows: { week: string; values: Record<string, number> }[];
  series: BarSeries[];
  format?: (value: number) => string;
  weekLabel: (week: string) => string;
  /** Header of the week column in the table view. */
  weekHeader: string;
  tableLabel: string;
}

/**
 * Weekly bar chart: one bar per week (stacked when there are two series), the latest total labelled, the value
 * of any bar shown when it is tapped or hovered, and the same numbers as a table for screen readers and print.
 */
export function WeeklyBars({ title, rows, series, format = String, weekLabel, weekHeader, tableLabel }: WeeklyBarsProps) {
  const [active, setActive] = useState<number | null>(null);
  const totals = rows.map((row) => series.reduce((sum, item) => sum + (row.values[item.key] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const shown = active ?? rows.length - 1;
  const shownRow = rows[shown];

  return (
    <figure className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-lg font-bold text-ink-900">{title}</span>
        {shownRow && (
          <span className="text-base text-ink-700" aria-live="polite">
            {weekLabel(shownRow.week)}:{' '}
            <strong className="tabular-nums text-ink-900">
              {series.length > 1 ? series.map((item) => `${item.label} ${format(shownRow.values[item.key] ?? 0)}`).join(' · ') : format(totals[shown] ?? 0)}
            </strong>
          </span>
        )}
      </figcaption>

      {series.length > 1 && (
        <ul className="flex flex-wrap gap-3 text-sm text-ink-700">
          {series.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <span aria-hidden="true" className={cn('size-3 rounded-sm', item.colorClass)} />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div className="flex h-32 items-end gap-1 border-b border-line" aria-hidden="true" onMouseLeave={() => setActive(null)}>
        {rows.map((row, index) => (
          <button
            key={row.week}
            type="button"
            tabIndex={-1}
            onMouseEnter={() => setActive(index)}
            onClick={() => setActive(index)}
            className={cn('flex h-full min-w-0 flex-1 flex-col-reverse items-stretch rounded-t-md pt-1', index === shown && 'bg-surface-green')}
          >
            {series.map((item) => {
              const value = row.values[item.key] ?? 0;
              return value > 0 ? (
                <span
                  key={item.key}
                  className={cn('mx-auto w-full max-w-8 border-t-2 border-surface first:rounded-b-none last:rounded-t-[4px]', item.colorClass)}
                  style={{ height: `${(value / max) * 100}%` }}
                />
              ) : null;
            })}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-sm text-ink-500" aria-hidden="true">
        <span>{rows[0] && weekLabel(rows[0].week)}</span>
        <span>{rows.at(-1) && weekLabel(rows.at(-1)?.week ?? '')}</span>
      </div>

      <details>
        <summary className="cursor-pointer text-base font-bold text-primary-700">{tableLabel}</summary>
        <table className="mt-2 w-full text-left text-base">
          <thead>
            <tr className="text-ink-500">
              <th className="py-1 font-normal">{weekHeader}</th>
              {series.map((item) => (
                <th key={item.key} className="py-1 text-right font-normal">
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.week} className="border-t border-line">
                <td className="py-1">{row.week}</td>
                {series.map((item) => (
                  <td key={item.key} className="py-1 text-right tabular-nums">
                    {format(row.values[item.key] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
