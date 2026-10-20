import { useState } from 'react';
import type { IconType } from 'react-icons';
import { LuFrown, LuMeh, LuSmile } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { answerFollowUp } from '../../api/notifications';
import type { AppNotification, FollowUpAnswer } from '../../api/types';
import { routes } from '../../hooks/useHashRoute';
import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';
import { navigateTo } from '../../utils/navigate';
import { CropIcon } from '../CropIcon';
import { notifyError, notifySuccess, notifyWarning } from '../ui/notify';
import { SpeakButton } from '../ui/SpeakButton';

const ANSWERS: { answer: FollowUpAnswer; label: string; icon: IconType; className: string }[] = [
  { answer: 'better', label: hi.followUp.better, icon: LuSmile, className: 'bg-success-700 text-white' },
  { answer: 'same', label: hi.followUp.same, icon: LuMeh, className: 'bg-warning-400 text-ink-900' },
  { answer: 'worse', label: hi.followUp.worse, icon: LuFrown, className: 'bg-danger-700 text-white' },
];

interface FollowUpCardProps {
  notification: AppNotification;
  onAnswered: () => void;
}

/** "क्या फसल ठीक हुई?" with three big face buttons. "और खराब" opens a new photo check and suggests KVK. */
export function FollowUpCard({ notification, onAnswered }: FollowUpCardProps) {
  const [sending, setSending] = useState(false);
  const { diagnosisId, crop } = notification;
  if (!diagnosisId) return null;

  const answer = async (choice: FollowUpAnswer) => {
    setSending(true);
    try {
      await answerFollowUp(diagnosisId, choice);
      onAnswered();
      if (choice === 'better') notifySuccess(hi.followUp.thanksBetter);
      if (choice === 'same') notifyWarning(hi.followUp.thanksSame);
      if (choice === 'worse') {
        notifyWarning(hi.followUp.worseAdvice);
        navigateTo(routes.diagnose);
      }
    } catch (error) {
      notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-3xl border-2 border-accent-300 bg-surface-cream p-4 shadow-card">
      <header className="flex items-center gap-3">
        {crop && (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface">
            <CropIcon crop={crop} className="size-11" />
          </span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <h3 className="text-xl font-bold text-ink-900">{hi.followUp.question}</h3>
          <p className="text-base text-ink-700">{notification.body}</p>
        </div>
        <SpeakButton text={`${hi.followUp.question} ${notification.body}`} />
      </header>
      <div className="grid grid-cols-3 gap-2">
        {ANSWERS.map(({ answer: choice, label, icon: Icon, className }) => (
          <button
            key={choice}
            type="button"
            disabled={sending}
            onClick={() => void answer(choice)}
            className={cn('flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl text-lg font-bold shadow-card disabled:opacity-60', className)}
          >
            <Icon aria-hidden="true" className="size-9" />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
