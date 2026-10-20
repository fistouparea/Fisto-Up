import { LuBellRing } from 'react-icons/lu';
import { usePushPermission } from '../../hooks/usePushPermission';
import { hi } from '../../strings/hi';
import { Button } from '../ui/Button';
import { SpeakButton } from '../ui/SpeakButton';

/** Asks for push permission with a clear Hindi explanation, only when it makes sense (see usePushPermission). */
export function PushPermissionCard() {
  const { show, allow, later } = usePushPermission();
  if (!show) return null;

  return (
    <section className="flex flex-col gap-3 rounded-3xl border-2 border-primary-200 bg-surface-green p-4 shadow-card">
      <header className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-700 text-white">
          <LuBellRing aria-hidden="true" className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-snug text-ink-900">{hi.push.question}</h3>
          <p className="text-base text-ink-700">{hi.push.explain}</p>
        </div>
        <SpeakButton text={`${hi.push.question} ${hi.push.explain}`} />
      </header>
      <div className="flex gap-2">
        <Button variant="accent" size="md" icon={LuBellRing} onClick={allow} className="flex-1">
          {hi.push.allow}
        </Button>
        <Button variant="ghost" size="md" fullWidth={false} onClick={later}>
          {hi.push.later}
        </Button>
      </div>
    </section>
  );
}
