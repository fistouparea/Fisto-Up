import { CATEGORIES, PRODUCT_IDS, type ProductId } from '../../api/marketTypes';
import { PRODUCT_CATALOG } from '../../data/marketCatalog';
import { hi, productLabels } from '../../strings/hi';
import { SelectCard } from '../ui/SelectCard';
import { ProductIcon } from './ProductIcon';

const GROUP_TITLES = { crop: hi.sell.crops, shg: hi.sell.shgProducts } as const;

/** Picture cards for every product, grains first, then SHG products. */
export function ProductPicker({ value, onChange }: { value: ProductId | null; onChange: (product: ProductId) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {CATEGORIES.map((category) => (
        <section key={category} className="flex flex-col gap-2">
          <h4 className="text-lg font-bold text-ink-700">{GROUP_TITLES[category]}</h4>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_IDS.filter((id) => PRODUCT_CATALOG[id].category === category).map((id) => (
              <SelectCard
                key={id}
                label={productLabels[id].hi}
                picture={<ProductIcon product={id} />}
                selected={value === id}
                onClick={() => onChange(id)}
                className="min-h-24 text-base"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
