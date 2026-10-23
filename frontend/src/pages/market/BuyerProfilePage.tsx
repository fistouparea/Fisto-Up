import { useState, type FormEvent } from 'react';
import { LuHouse, LuSave, LuShoppingBasket, LuStore } from 'react-icons/lu';
import { saveBuyerProfile } from '../../api/auth';
import type { Account, BuyerType } from '../../api/marketTypes';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { PageHeader } from '../../components/ui/PageHeader';
import { SelectCard } from '../../components/ui/SelectCard';
import { TextField } from '../../components/ui/TextField';
import { notifySuccess } from '../../components/ui/notify';
import { useSubmit } from '../../hooks/useSubmit';
import { hi, marketErrorMessage } from '../../strings/hi';

interface BuyerProfilePageProps {
  user: Account;
  onSaved: (user: Account) => void;
}

export function BuyerProfilePage({ user, onSaved }: BuyerProfilePageProps) {
  const [name, setName] = useState(user.name);
  const [buyerType, setBuyerType] = useState<BuyerType>(user.buyer?.buyerType ?? 'household');
  const [businessName, setBusinessName] = useState(user.buyer?.businessName ?? '');
  const [village, setVillage] = useState(user.buyer?.village ?? '');
  const [address, setAddress] = useState(user.buyer?.address ?? '');
  const { busy, errorCode, run } = useSubmit();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    const optional = (value: string) => value.trim() || undefined;
    const saved = await run(() =>
      saveBuyerProfile({
        name: name.trim(),
        buyerType,
        businessName: buyerType === 'business' ? optional(businessName) : undefined,
        village: optional(village),
        address: optional(address),
      }),
    );
    if (saved) {
      notifySuccess(hi.sellerProfile.saved);
      onSaved(saved);
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
      <PageHeader title={hi.buyerProfile.title} icon={LuShoppingBasket} />
      <TextField label={hi.auth.name} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <SelectCard label={hi.auth.household} icon={LuHouse} selected={buyerType === 'household'} onClick={() => setBuyerType('household')} />
        <SelectCard label={hi.auth.business} icon={LuStore} selected={buyerType === 'business'} onClick={() => setBuyerType('business')} />
      </div>
      {buyerType === 'business' && (
        <TextField label={hi.buyerProfile.businessName} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
      )}
      <TextField label={hi.buyerProfile.village} value={village} onChange={(e) => setVillage(e.target.value)} />
      <TextField label={hi.buyerProfile.address} value={address} onChange={(e) => setAddress(e.target.value)} />
      {errorCode && <Callout tone="danger" icon={LuStore} text={marketErrorMessage(errorCode)} />}
      <Button type="submit" variant="accent" size="lg" icon={LuSave} disabled={busy}>
        {hi.save}
      </Button>
    </form>
  );
}
