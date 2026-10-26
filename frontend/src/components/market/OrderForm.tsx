import { useState } from 'react';
import { LuBanknote, LuHandCoins, LuLogIn, LuQrCode, LuSend, LuShoppingCart, LuStore, LuTruck } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import type { Fulfilment, PaymentMethod, PublicListing } from '../../api/marketTypes';
import { placeOrder } from '../../api/orders';
import { isKitReferral } from '../../utils/kitReferral';
import { useAuth } from '../../hooks/useAuth';
import { routes } from '../../hooks/useHashRoute';
import { useLang } from '../../hooks/useLang';
import { marketErrorMessage, unitLabels } from '../../strings/hi';
import { goToLogin } from '../../utils/loginRedirect';
import { formatRupees, rupeesToPaise, totalPaise } from '../../utils/money';
import { navigateTo } from '../../utils/navigate';
import { Button } from '../ui/Button';
import { Callout } from '../ui/Callout';
import { NumberStepper } from '../ui/NumberStepper';
import { SelectCard } from '../ui/SelectCard';
import { TextField } from '../ui/TextField';
import { notifySuccess } from '../ui/notify';

/** "ऑर्डर करें" on the listing page. Opens a short form; guests are sent to login first. */
export function OrderForm({ listing }: { listing: PublicListing }) {
  const { user } = useAuth();
  const { lang, tOrders: text } = useLang();
  const [open, setOpen] = useState(false);

  if (user && user.role !== 'buyer') {
    return <p className="text-base text-ink-500">{text.buyersOnly}</p>;
  }
  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="accent" size="lg" icon={LuShoppingCart} onClick={() => (user ? setOpen(true) : goToLogin())}>
          {user ? text.placeTitle : text.loginToOrder}
        </Button>
        {!user && (
          <p className="flex items-center justify-center gap-2 text-base text-ink-500">
            <LuLogIn aria-hidden="true" className="size-5" />
            {text.buyersOnly}
          </p>
        )}
      </div>
    );
  }
  return <OpenOrderForm listing={listing} defaultAddress={user?.buyer?.address} lang={lang} />;
}

function OpenOrderForm({ listing, defaultAddress, lang }: { listing: PublicListing; defaultAddress?: string; lang: 'hi' | 'en' }) {
  const { tOrders: text } = useLang();
  const [quantity, setQuantity] = useState<number | null>(listing.minOrderQty);
  const [fulfilment, setFulfilment] = useState<Fulfilment>('pickup');
  const [address, setAddress] = useState(defaultAddress ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [asking, setAsking] = useState(false);
  const [offerInput, setOfferInput] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unit = unitLabels[listing.unit][lang];
  const offer = asking ? rupeesToPaise(offerInput) : null;
  const price = offer ?? listing.pricePerUnitPaise;
  const canAskPrice = listing.minOrderQty > 1;

  const submit = async () => {
    if (!quantity) return;
    if (fulfilment === 'delivery' && address.trim().length < 5) return setError(text.addressNeeded);
    if (asking && (offer === null || offer >= listing.pricePerUnitPaise)) return setError(text.offerInvalid);
    setError(null);
    setBusy(true);
    try {
      const order = await placeOrder({
        listingId: listing.id,
        quantity,
        fulfilment,
        paymentMethod,
        ...(fulfilment === 'delivery' && { deliveryAddress: address.trim() }),
        ...(offer !== null && { offeredPricePerUnitPaise: offer }),
        ...(note.trim() && { note: note.trim() }),
        ...(listing.category === 'input' && isKitReferral(listing.id) && { referral: 'ai_kit' as const }),
      });
      notifySuccess(text.placed);
      navigateTo(routes.order(order.id));
    } catch (failure) {
      setError(marketErrorMessage(failure instanceof ApiError ? failure.code : 'UNKNOWN'));
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-3xl border-2 border-primary-200 bg-surface p-4" aria-label={text.placeTitle}>
      <h3 className="text-xl font-bold">{text.howMuch}</h3>
      <NumberStepper
        value={quantity}
        onChange={setQuantity}
        min={listing.minOrderQty}
        max={listing.quantityAvailable}
        label={text.quantity}
        unitLabel={unit}
        lessLabel="−"
        moreLabel="+"
      />

      <h3 className="text-xl font-bold">{text.howGet}</h3>
      <div className="grid grid-cols-2 gap-3">
        <SelectCard label={text.pickup} icon={LuStore} selected={fulfilment === 'pickup'} onClick={() => setFulfilment('pickup')} />
        <SelectCard label={text.delivery} icon={LuTruck} selected={fulfilment === 'delivery'} onClick={() => setFulfilment('delivery')} />
      </div>
      {fulfilment === 'delivery' && <TextField label={text.address} value={address} onChange={(e) => setAddress(e.target.value)} />}

      <h3 className="text-xl font-bold">{text.howPay}</h3>
      <div className="grid grid-cols-2 gap-3">
        <SelectCard label={text.upi} icon={LuQrCode} selected={paymentMethod === 'upi'} onClick={() => setPaymentMethod('upi')} />
        <SelectCard label={text.cash} icon={LuBanknote} selected={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')} />
      </div>

      {canAskPrice && (
        <>
          <Button variant={asking ? 'primary' : 'secondary'} size="md" icon={LuHandCoins} aria-pressed={asking} onClick={() => setAsking(!asking)}>
            {text.askPrice}
          </Button>
          {asking && (
            <TextField
              label={`${text.yourPrice} ${text.per} ${unit}`}
              hint={text.offerHint}
              prefix="₹"
              inputMode="decimal"
              value={offerInput}
              onChange={(e) => setOfferInput(e.target.value.replace(/[^\d.]/g, ''))}
            />
          )}
        </>
      )}
      <TextField label={text.messageForSeller} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />

      {quantity && (
        <p className="text-xl">
          {text.total}: <strong>{formatRupees(totalPaise(quantity, price))}</strong>
        </p>
      )}
      {error && <Callout tone="danger" icon={LuShoppingCart} text={error} />}
      <Button variant="accent" size="lg" icon={LuSend} disabled={busy || !quantity} onClick={() => void submit()}>
        {asking ? text.sendRequest : text.send}
      </Button>
    </section>
  );
}
