import { useState, type FormEvent } from 'react';
import { LuLifeBuoy, LuSend } from 'react-icons/lu';
import { HELP_CATEGORIES, sendHelpRequest, type HelpCategory } from '../api/help';
import { VoiceTextBox } from '../components/VoiceTextBox';
import { Button } from '../components/ui/Button';
import { Callout } from '../components/ui/Callout';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { PhoneField } from '../components/ui/TextField';
import { notifySuccess } from '../components/ui/notify';
import { useAuth } from '../hooks/useAuth';
import { useFlags } from '../hooks/useFlags';
import { routes } from '../hooks/useHashRoute';
import { useSubmit } from '../hooks/useSubmit';
import { hi, marketErrorMessage } from '../strings/hi';

const MESSAGE_MAX = 1000;

/** "मदद/शिकायत": pick a topic, speak or type, optionally leave a number to be called back. */
export function HelpPage() {
  const { helpRequests } = useFlags();
  const { user } = useAuth();
  const [category, setCategory] = useState<HelpCategory | null>(null);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const { busy, errorCode, run } = useSubmit();

  if (!helpRequests) {
    return (
      <section className="flex flex-col gap-4">
        <PageHeader title={hi.help.title} icon={LuLifeBuoy} />
        <EmptyState icon={LuLifeBuoy} message={hi.help.off} />
      </section>
    );
  }

  const messageError = message.trim().length < 3 ? hi.help.messageShort : undefined;
  const phoneError = phone && !/^[6-9]\d{9}$/.test(phone) ? hi.auth.phoneInvalid : undefined;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrors(true);
    if (!category || messageError || phoneError) return;
    const done = await run(async () => {
      await sendHelpRequest({ category, message: message.trim(), ...(phone && { callbackPhone: phone }) });
      return true;
    });
    if (!done) return;
    notifySuccess(hi.help.sent);
    window.location.hash = routes.home;
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
      <PageHeader title={hi.help.title} icon={LuLifeBuoy} speakText={`${hi.help.title}. ${hi.help.intro}`} />
      <p className="text-lg text-ink-700">{hi.help.intro}</p>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xl font-bold text-ink-900">{hi.help.category}</legend>
        <div className="flex flex-wrap gap-2">
          {HELP_CATEGORIES.map((item) => (
            <Chip key={item} label={hi.help.categories[item]} selected={category === item} onClick={() => setCategory(item)} />
          ))}
        </div>
        {showErrors && !category && <p className="text-base font-bold text-danger-700">{hi.help.category}</p>}
      </fieldset>

      <VoiceTextBox id="help-message" label={hi.help.message} placeholder={hi.help.messagePlaceholder} value={message} onChange={setMessage} maxLength={MESSAGE_MAX} />
      {showErrors && messageError && <p className="-mt-3 text-base font-bold text-danger-700">{messageError}</p>}

      {/* With an account the coordinator already has the number. */}
      {!user && (
        <PhoneField
          label={hi.help.callback}
          hint={hi.help.callbackHint}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={showErrors ? phoneError : undefined}
        />
      )}

      {errorCode && <Callout tone="danger" icon={LuLifeBuoy} text={marketErrorMessage(errorCode)} />}
      <Button type="submit" variant="accent" size="lg" icon={LuSend} disabled={busy}>
        {hi.help.send}
      </Button>
    </form>
  );
}
