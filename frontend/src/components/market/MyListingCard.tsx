import { useState } from 'react';
import { LuCircleCheckBig, LuIndianRupee, LuPause, LuPlay, LuScale, LuX } from 'react-icons/lu';
import { updateListing } from '../../api/listings';
import type { ListingChange, SellerListing } from '../../api/marketTypes';
import { ApiError } from '../../api/client';
import { hi, listingStatusLabels, unitLabels } from '../../strings/hi';
import { formatRupees, paiseToRupeesInput, rupeesToPaise } from '../../utils/money';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { NumberStepper } from '../ui/NumberStepper';
import { SpeakButton } from '../ui/SpeakButton';
import { TextField } from '../ui/TextField';
import { notifyError, notifySuccess } from '../ui/notify';
import { ListingPhoto } from './ListingPhoto';

type Editing = null | 'price' | 'quantity';

/** One listing on "मेरी बिक्री" with big buttons: price, quantity, pause/resume, sold out. */
export function MyListingCard({ listing, onChanged }: { listing: SellerListing; onChanged: (listing: SellerListing) => void }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [priceInput, setPriceInput] = useState(paiseToRupeesInput(listing.pricePerUnitPaise));
  const [quantity, setQuantity] = useState<number | null>(listing.quantityAvailable);
  const [busy, setBusy] = useState(false);
  const unit = unitLabels[listing.unit].hi;

  const apply = async (change: ListingChange) => {
    setBusy(true);
    try {
      const saved = await updateListing(listing.id, change);
      notifySuccess(hi.sell.saved);
      setEditing(null);
      onChanged(saved);
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setBusy(false);
    }
  };

  const price = rupeesToPaise(priceInput);
  const statusTone = listing.status === 'active' ? (listing.visible ? 'success' : 'warning') : 'neutral';
  const speakText = `${listing.title.hi}। ${hi.sell.price} ${listing.pricePerUnitPaise / 100} रुपये ${hi.sell.per} ${unit}। ${hi.sell.available} ${listing.quantityAvailable} ${unit}। ${listingStatusLabels[listing.status]}`;

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <div className="flex gap-3 p-3">
        <ListingPhoto url={listing.photoUrls[0]} product={listing.product} className="size-24 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-xl font-bold leading-snug">{listing.title.hi}</h3>
            <SpeakButton text={speakText} />
          </div>
          <p className="text-lg">
            <strong>{formatRupees(listing.pricePerUnitPaise)}</strong> / {unit}
          </p>
          <p className="text-base text-ink-700">
            {hi.sell.available}: {listing.quantityAvailable} {unit}
            {listing.minOrderQty > 1 && ` · ${hi.sell.minOrderShort} ${listing.minOrderQty}`}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge tone={statusTone} label={listingStatusLabels[listing.status]} />
          </div>
        </div>
      </div>

      {listing.hidden && <p className="bg-danger-50 px-4 py-2 font-bold text-danger-800">{hi.sell.hiddenByCoordinator}</p>}
      {!listing.hidden && listing.status === 'active' && !listing.visible && (
        <p className="bg-warning-50 px-4 py-2 font-bold text-warning-800">{hi.sell.waitingVerification}</p>
      )}

      {editing === 'price' && (
        <div className="flex flex-col gap-3 border-t border-line p-3">
          <TextField
            label={`${hi.sell.per} ${unit} (₹)`}
            prefix="₹"
            inputMode="decimal"
            value={priceInput}
            onChange={(event) => setPriceInput(event.target.value.replace(/[^\d.]/g, ''))}
            error={price === null ? hi.sell.missing.price : undefined}
          />
          <EditActions busy={busy} disabled={price === null} onSave={() => price && void apply({ pricePerUnitPaise: price })} onCancel={() => setEditing(null)} />
        </div>
      )}
      {editing === 'quantity' && (
        <div className="flex flex-col gap-3 border-t border-line p-3">
          <NumberStepper
            value={quantity}
            onChange={setQuantity}
            min={0}
            label={hi.sell.quantity}
            unitLabel={unit}
            lessLabel={hi.sell.less}
            moreLabel={hi.sell.more}
          />
          <EditActions
            busy={busy}
            disabled={quantity === null}
            onSave={() => quantity !== null && void apply({ quantityAvailable: quantity })}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {editing === null && (
        <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
          <Button variant="secondary" size="md" className="px-2" icon={LuIndianRupee} onClick={() => setEditing('price')}>
            {hi.sell.actions.editPrice}
          </Button>
          <Button variant="secondary" size="md" className="px-2" icon={LuScale} onClick={() => setEditing('quantity')}>
            {hi.sell.actions.editQuantity}
          </Button>
          {listing.status === 'active' ? (
            <Button variant="ghost" size="md" className="px-2" icon={LuPause} disabled={busy} onClick={() => void apply({ status: 'paused' })}>
              {hi.sell.actions.pause}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="md"
              className="px-2"
              icon={LuPlay}
              disabled={busy || listing.quantityAvailable === 0}
              onClick={() => void apply({ status: 'active' })}
            >
              {hi.sell.actions.resume}
            </Button>
          )}
          <Button
            variant="ghost"
            size="md"
            className="px-2"
            icon={LuCircleCheckBig}
            disabled={busy || listing.status === 'sold_out'}
            onClick={() => void apply({ status: 'sold_out' })}
          >
            {hi.sell.actions.soldOut}
          </Button>
        </div>
      )}
    </article>
  );
}

function EditActions({ busy, disabled, onSave, onCancel }: { busy: boolean; disabled: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <Button variant="accent" size="md" icon={LuCircleCheckBig} disabled={busy || disabled} onClick={onSave} className="flex-1">
        {hi.sell.actions.save}
      </Button>
      <Button variant="secondary" size="md" fullWidth={false} icon={LuX} onClick={onCancel}>
        {hi.sell.actions.cancel}
      </Button>
    </div>
  );
}
