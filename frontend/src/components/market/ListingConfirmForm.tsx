import { useState, type ReactNode } from 'react';
import { LuIndianRupee, LuPackage, LuPencil, LuScale, LuStore } from 'react-icons/lu';
import { PRODUCT_CATALOG } from '../../data/marketCatalog';
import { hi, productLabels, unitLabels } from '../../strings/hi';
import { changeProduct, type ListingForm, type ListingFormField } from '../../utils/listingForm';
import { formatRupees, rupeesToPaise, totalPaise } from '../../utils/money';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { NumberStepper } from '../ui/NumberStepper';
import { TextField } from '../ui/TextField';
import { ProductIcon } from './ProductIcon';
import { ProductPicker } from './ProductPicker';

interface ListingConfirmFormProps {
  form: ListingForm;
  onChange: (form: ListingForm) => void;
  errors: Partial<Record<ListingFormField, string>>;
  /** Fair price hint under the price card (Task 3), if any. */
  priceHint?: ReactNode;
}

/** Three big cards (product, quantity, price) with speaker buttons, then optional details. */
export function ListingConfirmForm({ form, onChange, errors, priceHint }: ListingConfirmFormProps) {
  const [pickingProduct, setPickingProduct] = useState(form.product === null);
  const [showDetails, setShowDetails] = useState(false);
  const set = (change: Partial<ListingForm>) => onChange({ ...form, ...change });

  const product = form.product;
  const unitName = form.unit ? unitLabels[form.unit].hi : '';
  const price = rupeesToPaise(form.priceInput);
  const productName = product ? productLabels[product].hi : '';

  return (
    <div className="flex flex-col gap-4">
      <Card icon={LuStore} title={hi.sell.product} speakText={product ? `${hi.sell.product}: ${productName}` : hi.sell.chooseProduct}>
        {product && !pickingProduct ? (
          <div className="flex items-center gap-3">
            <ProductIcon product={product} className="size-16" />
            <p className="flex-1 text-2xl font-bold">{productName}</p>
            <Button variant="secondary" size="md" fullWidth={false} icon={LuPencil} onClick={() => setPickingProduct(true)}>
              {hi.sell.change}
            </Button>
          </div>
        ) : (
          <ProductPicker
            value={product}
            onChange={(next) => {
              onChange(changeProduct(form, next));
              setPickingProduct(false);
            }}
          />
        )}
        <FieldError message={errors.product} />
      </Card>

      <Card
        icon={LuScale}
        title={hi.sell.quantity}
        speakText={form.quantity && form.unit ? `${hi.sell.quantity}: ${form.quantity} ${unitName}` : hi.sell.missing.quantity}
      >
        <NumberStepper
          value={form.quantity}
          onChange={(quantity) => set({ quantity })}
          label={hi.sell.quantity}
          unitLabel={unitName}
          lessLabel={hi.sell.less}
          moreLabel={hi.sell.more}
        />
        {product && (
          <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label={hi.sell.chooseUnit}>
            {PRODUCT_CATALOG[product].units.map((unit) => (
              <Chip key={unit} label={unitLabels[unit].hi} selected={form.unit === unit} onClick={() => set({ unit })} />
            ))}
          </div>
        )}
        <FieldError message={errors.quantity ?? errors.unit} />
      </Card>

      <Card
        icon={LuIndianRupee}
        title={hi.sell.price}
        speakText={price && form.unit ? `${hi.sell.price}: ${price / 100} रुपये ${hi.sell.per} ${unitName}` : hi.sell.missing.price}
      >
        <TextField
          label={form.unit ? `${hi.sell.per} ${unitName} (₹)` : hi.sell.priceIn}
          inputMode="decimal"
          prefix="₹"
          value={form.priceInput}
          onChange={(event) => set({ priceInput: event.target.value.replace(/[^\d.]/g, '') })}
          error={errors.price}
          inputClassName="text-3xl font-bold"
        />
        {price && form.quantity ? (
          <p className="mt-2 text-lg">
            {hi.sell.total}: <strong>{formatRupees(totalPaise(form.quantity, price))}</strong>
          </p>
        ) : null}
        {priceHint}
      </Card>

      <Card icon={LuPackage} title={hi.sell.minOrder}>
        <p className="mb-3 text-base text-ink-500">{hi.sell.minOrderHint}</p>
        <NumberStepper
          value={form.minOrderQty}
          onChange={(value) => set({ minOrderQty: value ?? 1 })}
          label={hi.sell.minOrder}
          unitLabel={unitName}
          lessLabel={hi.sell.less}
          moreLabel={hi.sell.more}
        />
        <FieldError message={errors.minOrder} />
      </Card>

      {product && PRODUCT_CATALOG[product].food && PRODUCT_CATALOG[product].category === 'shg' && (
        <TextField
          label={hi.sell.fssai}
          inputMode="numeric"
          maxLength={14}
          value={form.fssai}
          onChange={(event) => set({ fssai: event.target.value.replace(/\D/g, '') })}
          error={errors.fssai}
        />
      )}

      <Button variant="ghost" icon={LuPencil} aria-expanded={showDetails} onClick={() => setShowDetails((open) => !open)}>
        {hi.sell.moreDetails}
      </Button>
      {(showDetails || errors.title) && (
        <div className="flex flex-col gap-4">
          <TextField label={hi.sell.titleHi} value={form.titleHi} onChange={(e) => set({ titleHi: e.target.value })} error={errors.title} />
          <TextField label={hi.sell.titleEn} value={form.titleEn} onChange={(e) => set({ titleEn: e.target.value })} />
          <TextField label={hi.sell.qualityNotes} value={form.qualityNotes} onChange={(e) => set({ qualityNotes: e.target.value })} />
          <TextField
            label={hi.sell.descriptionHi}
            value={form.descriptionHi}
            onChange={(e) => set({ descriptionHi: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  return message ? <p className="mt-2 text-base font-bold text-danger-700">{message}</p> : null;
}
