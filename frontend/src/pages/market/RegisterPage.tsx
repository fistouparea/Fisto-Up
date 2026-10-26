import { useState, type FormEvent } from 'react';
import { AlreadyLoggedIn } from '../../components/market/AlreadyLoggedIn';
import { LuHouse, LuLogIn, LuShoppingBasket, LuStore, LuUserPlus, LuWheat } from 'react-icons/lu';
import { register } from '../../api/auth';
import type { BuyerType } from '../../api/marketTypes';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { PageHeader } from '../../components/ui/PageHeader';
import { SelectCard } from '../../components/ui/SelectCard';
import { PhoneField, PinField, TextField } from '../../components/ui/TextField';
import { useAuth } from '../../hooks/useAuth';
import { useFlags } from '../../hooks/useFlags';
import { routes } from '../../hooks/useHashRoute';
import { useSubmit } from '../../hooks/useSubmit';
import { hi, marketErrorMessage } from '../../strings/hi';
import { afterLoginTarget } from '../../utils/loginRedirect';
import { navigateTo } from '../../utils/navigate';

export function RegisterPage() {
  const { user: current, setUser } = useAuth();
  const [role, setRole] = useState<'seller' | 'buyer' | null>(null);
  const [buyerType, setBuyerType] = useState<BuyerType>('household');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const { inviteOnly } = useFlags();
  const [showErrors, setShowErrors] = useState(false);
  const { busy, errorCode, run } = useSubmit();

  const errors = {
    name: name.trim().length < 2 ? hi.auth.nameInvalid : undefined,
    phone: /^[6-9]\d{9}$/.test(phone) ? undefined : hi.auth.phoneInvalid,
    pin: /^\d{4}$/.test(pin) ? undefined : hi.auth.pinInvalid,
    pinAgain: pin === pinAgain ? undefined : hi.auth.pinMismatch,
    inviteCode: inviteOnly && inviteCode.replace(/[\s-]/g, '').length !== 6 ? hi.auth.inviteInvalid : undefined,
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (!role || Object.values(errors).some(Boolean)) return;
    const user = await run(() =>
      register({ role, name: name.trim(), phone, pin, ...(role === 'buyer' && { buyerType }), ...(inviteCode.trim() && { inviteCode: inviteCode.trim() }) }),
    );
    if (!user) return;
    // A new seller fills village, UPI ID and pickup place next.
    setUser(user, user.role === 'seller' ? routes.sellerProfile : afterLoginTarget(user.role));
  };

  if (current) return <AlreadyLoggedIn user={current} />;

  return (
    <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
      <PageHeader title={hi.auth.registerTitle} icon={LuUserPlus} />

      <h3 className="text-xl font-bold text-ink-900">{hi.auth.whoAreYou}</h3>
      <div className="grid grid-cols-2 gap-3">
        <SelectCard
          label={hi.auth.roleSeller}
          sublabel={hi.auth.roleSellerHint}
          icon={LuWheat}
          selected={role === 'seller'}
          onClick={() => setRole('seller')}
        />
        <SelectCard
          label={hi.auth.roleBuyer}
          sublabel={hi.auth.roleBuyerHint}
          icon={LuShoppingBasket}
          selected={role === 'buyer'}
          onClick={() => setRole('buyer')}
        />
      </div>

      {role && (
        <>
          {role === 'buyer' && (
            <>
              <h3 className="text-xl font-bold text-ink-900">{hi.auth.buyerType}</h3>
              <div className="grid grid-cols-2 gap-3">
                <SelectCard
                  label={hi.auth.household}
                  icon={LuHouse}
                  selected={buyerType === 'household'}
                  onClick={() => setBuyerType('household')}
                />
                <SelectCard
                  label={hi.auth.business}
                  icon={LuStore}
                  selected={buyerType === 'business'}
                  onClick={() => setBuyerType('business')}
                />
              </div>
            </>
          )}
          {inviteOnly && (
            <TextField
              label={hi.auth.inviteCode}
              hint={hi.auth.inviteHint}
              autoCapitalize="characters"
              autoComplete="off"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              error={showErrors ? errors.inviteCode : undefined}
            />
          )}
          <TextField
            label={hi.auth.name}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={showErrors ? errors.name : undefined}
          />
          <PhoneField
            label={hi.auth.phone}
            hint={hi.account.phonePrivate}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={showErrors ? errors.phone : undefined}
          />
          <PinField
            label={hi.auth.newPin}
            hint={hi.auth.pinHint}
            autoComplete="new-password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            error={showErrors ? errors.pin : undefined}
          />
          <PinField
            label={hi.auth.pinAgain}
            autoComplete="new-password"
            value={pinAgain}
            onChange={(event) => setPinAgain(event.target.value)}
            error={showErrors ? errors.pinAgain : undefined}
          />

          {errorCode && <Callout tone="danger" icon={LuUserPlus} text={marketErrorMessage(errorCode)} />}

          <Button type="submit" variant="accent" size="lg" icon={LuUserPlus} disabled={busy}>
            {busy ? hi.auth.loggingIn : hi.auth.createAccount}
          </Button>
        </>
      )}

      <Button variant="ghost" icon={LuLogIn} onClick={() => navigateTo(routes.login)}>
        {hi.auth.haveAccount}
      </Button>
    </form>
  );
}
