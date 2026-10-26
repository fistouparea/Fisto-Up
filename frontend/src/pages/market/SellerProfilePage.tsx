import { useState, type FormEvent } from 'react';
import { LuFlaskConical, LuSave, LuStore, LuWheat } from 'react-icons/lu';
import { SelectCard } from '../../components/ui/SelectCard';
import { saveSellerProfile } from '../../api/auth';
import type { Account, Place, SellerKind } from '../../api/marketTypes';
import { TehsilPicker } from '../../components/market/TehsilPicker';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { PageHeader } from '../../components/ui/PageHeader';
import { StickyActions } from '../../components/ui/StickyActions';
import { TextField } from '../../components/ui/TextField';
import { notifySuccess } from '../../components/ui/notify';
import { useSubmit } from '../../hooks/useSubmit';
import { hi, marketErrorMessage } from '../../strings/hi';

const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
/** Mirrors LICENCE_NUMBER_PATTERN in backend/src/config/inputRules.ts. */
const LICENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/\- ]{3,39}$/;

interface SellerProfilePageProps {
  user: Account;
  onSaved: (user: Account) => void;
}

/** Name, village, SHG, UPI ID and pickup place. Needed before the first listing. */
export function SellerProfilePage({ user, onSaved }: SellerProfilePageProps) {
  const seller = user.seller;
  const [name, setName] = useState(user.name);
  const [village, setVillage] = useState(seller?.village ?? '');
  const [shgName, setShgName] = useState(seller?.shgName ?? '');
  const [upiId, setUpiId] = useState(seller?.upiId ?? '');
  const [pickup, setPickup] = useState<Place | undefined>(seller?.pickup);
  const [kind, setKind] = useState<SellerKind>(seller?.kind ?? 'producer');
  const [licenceNumber, setLicenceNumber] = useState(seller?.licenceNumber ?? '');
  const [showErrors, setShowErrors] = useState(false);
  const { busy, errorCode, run } = useSubmit();

  const errors = {
    name: name.trim().length < 2 ? hi.auth.nameInvalid : undefined,
    village: village.trim() ? undefined : hi.sellerProfile.required,
    upiId: UPI_PATTERN.test(upiId.trim()) ? undefined : hi.sellerProfile.upiInvalid,
    pickup: pickup ? undefined : hi.sellerProfile.required,
    licence: kind === 'input_dealer' && !LICENCE_PATTERN.test(licenceNumber.trim()) ? hi.sellerProfile.licenceInvalid : undefined,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (!pickup || Object.values(errors).some(Boolean)) return;
    const address = pickup.address?.trim();
    const saved = await run(() =>
      saveSellerProfile({
        name: name.trim(),
        village: village.trim(),
        upiId: upiId.trim(),
        ...(shgName.trim() && { shgName: shgName.trim() }),
        pickup: { ...pickup, address: address || undefined },
        kind,
        ...(kind === 'input_dealer' && { licenceNumber: licenceNumber.trim() }),
      }),
    );
    if (saved) {
      notifySuccess(hi.sellerProfile.saved);
      onSaved(saved);
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
      <PageHeader title={hi.sellerProfile.title} icon={LuStore} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-bold text-ink-900">{hi.sellerProfile.kind}</legend>
        <div className="grid grid-cols-2 gap-2">
          <SelectCard icon={LuWheat} label={hi.sellerProfile.kindProducer} selected={kind === 'producer'} onClick={() => setKind('producer')} />
          <SelectCard icon={LuFlaskConical} label={hi.sellerProfile.kindDealer} selected={kind === 'input_dealer'} onClick={() => setKind('input_dealer')} />
        </div>
      </fieldset>
      {kind === 'input_dealer' && (
        <TextField
          label={hi.sellerProfile.licence}
          hint={hi.sellerProfile.licenceHint}
          autoCapitalize="characters"
          value={licenceNumber}
          maxLength={40}
          onChange={(e) => setLicenceNumber(e.target.value)}
          error={showErrors ? errors.licence : undefined}
        />
      )}
      {kind === 'input_dealer' && seller?.kind === 'input_dealer' && !seller.licenceVerified && (
        <Callout tone="warning" icon={LuFlaskConical} text={hi.sellerProfile.licencePending} />
      )}
      <TextField label={hi.sellerProfile.name} value={name} onChange={(e) => setName(e.target.value)} error={showErrors ? errors.name : undefined} />
      <TextField
        label={hi.sellerProfile.village}
        value={village}
        onChange={(e) => setVillage(e.target.value)}
        error={showErrors ? errors.village : undefined}
      />
      <TextField label={hi.sellerProfile.shgName} value={shgName} onChange={(e) => setShgName(e.target.value)} />
      <TextField
        label={hi.sellerProfile.upiId}
        hint={seller?.status === 'verified' ? `${hi.sellerProfile.upiHint} ${hi.sellerProfile.upiChangedNote}` : hi.sellerProfile.upiHint}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
        error={showErrors ? errors.upiId : undefined}
      />

      <h3 className="text-xl font-bold text-ink-900">{hi.sellerProfile.pickup}</h3>
      <TehsilPicker value={pickup} onChange={setPickup} />
      {showErrors && errors.pickup && <p className="text-base font-bold text-danger-700">{hi.sellerProfile.chooseTehsil}</p>}
      {pickup && (
        <TextField
          label={hi.sellerProfile.pickupAddress}
          value={pickup.address ?? ''}
          onChange={(e) => setPickup({ ...pickup, address: e.target.value })}
        />
      )}

      {errorCode && <Callout tone="danger" icon={LuStore} text={marketErrorMessage(errorCode)} />}
      <StickyActions>
        <Button type="submit" variant="accent" size="lg" icon={LuSave} disabled={busy}>
          {hi.save}
        </Button>
      </StickyActions>
    </form>
  );
}
