import { useState, type FormEvent } from 'react';
import { LuSave, LuStore } from 'react-icons/lu';
import { saveSellerProfile } from '../../api/auth';
import type { Account, Place } from '../../api/marketTypes';
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
  const [showErrors, setShowErrors] = useState(false);
  const { busy, errorCode, run } = useSubmit();

  const errors = {
    name: name.trim().length < 2 ? hi.auth.nameInvalid : undefined,
    village: village.trim() ? undefined : hi.sellerProfile.required,
    upiId: UPI_PATTERN.test(upiId.trim()) ? undefined : hi.sellerProfile.upiInvalid,
    pickup: pickup ? undefined : hi.sellerProfile.required,
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
