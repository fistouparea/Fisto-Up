import { useState, type FormEvent } from 'react';
import { AlreadyLoggedIn } from '../../components/market/AlreadyLoggedIn';
import { LuLogIn, LuUserPlus } from 'react-icons/lu';
import { login } from '../../api/auth';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PhoneField, PinField } from '../../components/ui/TextField';
import { useAuth } from '../../hooks/useAuth';
import { routes } from '../../hooks/useHashRoute';
import { useSubmit } from '../../hooks/useSubmit';
import { hi, marketErrorMessage } from '../../strings/hi';
import { afterLoginTarget } from '../../utils/loginRedirect';
import { navigateTo } from '../../utils/navigate';

export function LoginPage() {
  const { user: current, setUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const { busy, errorCode, run } = useSubmit();

  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const pinOk = /^\d{4}$/.test(pin);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (!phoneOk || !pinOk) return;
    const user = await run(() => login(phone, pin));
    if (user) setUser(user, afterLoginTarget(user.role));
  };

  if (current) return <AlreadyLoggedIn user={current} />;

  return (
    <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
      <PageHeader title={hi.auth.loginTitle} icon={LuLogIn} speakText={`${hi.auth.loginTitle}। ${hi.auth.loginHint}`} />
      <p className="text-lg text-ink-700">{hi.auth.loginHint}</p>

      <PhoneField
        label={hi.auth.phone}
        hint={hi.auth.phoneHint}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        error={showErrors && !phoneOk ? hi.auth.phoneInvalid : undefined}
      />
      <PinField
        label={hi.auth.pin}
        value={pin}
        onChange={(event) => setPin(event.target.value)}
        error={showErrors && !pinOk ? hi.auth.pinInvalid : undefined}
      />

      {errorCode && <Callout tone="danger" icon={LuLogIn} text={marketErrorMessage(errorCode)} />}

      <Button type="submit" variant="accent" size="lg" icon={LuLogIn} disabled={busy}>
        {busy ? hi.auth.loggingIn : hi.auth.login}
      </Button>
      <Button variant="secondary" icon={LuUserPlus} onClick={() => navigateTo(routes.register)}>
        {hi.auth.noAccount}
      </Button>
      <p className="text-center text-base text-ink-500">{hi.auth.forgotPin}</p>
      <p className="text-center text-base text-ink-500">{hi.auth.advisorFree}</p>
    </form>
  );
}
