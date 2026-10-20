import { LuIndianRupee } from 'react-icons/lu';
import type { MandiPrice } from '../../api/types';
import { cropLabels, hi } from '../../strings/hi';
import { shortDate } from '../../utils/dayLabel';
import { CropIcon } from '../CropIcon';
import { Card } from '../ui/Card';

const rupees = new Intl.NumberFormat('hi-IN');
const MAX_ROWS = 4;

/** Latest modal prices of the farmer's crops at nearby mandis, with the date of the data. */
export function MandiCard({ prices }: { prices: MandiPrice[] }) {
  const rows = prices.slice(0, MAX_ROWS);
  const latest = rows.map((price) => price.date).sort().at(-1);
  const speech = `${hi.mandi.title}: ${rows
    .map((price) => `${cropLabels[price.crop].hindi}, ${price.market} मंडी, ${price.modalPrice} रुपये क्विंटल`)
    .join('। ')}`;

  return (
    <Card icon={LuIndianRupee} title={hi.mandi.title} speakText={speech}>
      <ul className="flex flex-col gap-3">
        {rows.map((price) => (
          <li key={`${price.crop}-${price.market}`} className="flex items-center gap-3">
            <CropIcon crop={price.crop} className="size-10 shrink-0" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block font-bold">{cropLabels[price.crop].hindi}</span>
              <span className="text-base text-ink-500">{price.market}</span>
            </span>
            <span className="text-right leading-tight">
              <span className="block text-xl font-bold">₹{rupees.format(price.modalPrice)}</span>
              <span className="text-xs text-ink-500">{hi.mandi.perQuintal}</span>
            </span>
          </li>
        ))}
      </ul>
      {latest && (
        <p className="mt-3 text-base text-ink-500">
          {hi.mandi.dataOf}: {shortDate(latest)}
        </p>
      )}
    </Card>
  );
}
