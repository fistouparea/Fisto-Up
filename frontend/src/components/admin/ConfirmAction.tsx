import { useState, type ReactNode } from 'react';
import { hiAdmin } from '../../strings/hiAdmin';
import { Button } from '../ui/Button';

interface ConfirmActionProps {
  /** What will happen, in one line. */
  question: string;
  onConfirm: () => Promise<unknown>;
  /** The normal control; call `ask` instead of acting. */
  children: (ask: () => void) => ReactNode;
}

/** Asks once before an action that is hard to undo (money, access, switches). */
export function ConfirmAction({ question, onConfirm, children }: ConfirmActionProps) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) return <>{children(() => setAsking(true))}</>;

  const confirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    setAsking(false);
  };
  return (
    <div role="alertdialog" aria-label={question} className="flex w-full flex-col gap-3 rounded-2xl border-2 border-accent-300 bg-surface-cream p-3">
      <p className="text-base font-bold text-ink-900">{question}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button size="md" disabled={busy} onClick={() => void confirm()}>
          {hiAdmin.console.confirm}
        </Button>
        <Button variant="secondary" size="md" autoFocus disabled={busy} onClick={() => setAsking(false)}>
          {hiAdmin.console.cancel}
        </Button>
      </div>
    </div>
  );
}
