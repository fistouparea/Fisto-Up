import { useState } from 'react';
import { LuMessageSquareText, LuSend, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';
import { sendDiagnosisFeedback } from '../api/feedback';
import { useFlags } from '../hooks/useFlags';
import { useSubmit } from '../hooks/useSubmit';
import { errorMessages, hi } from '../strings/hi';
import { cn } from '../utils/cn';
import { VoiceTextBox } from './VoiceTextBox';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const COMMENT_MAX = 500;

/**
 * "क्या जवाब सही था?" right after a diagnosis: one tap on 👍 or 👎 is saved at once; a comment (spoken or typed)
 * is optional. Only shown when the diagnosis was saved (it has a history id) and the flag is on.
 */
export function FeedbackCard({ historyId }: { historyId: string }) {
  const { aiFeedback } = useFlags();
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [commentSent, setCommentSent] = useState(false);
  const { busy, errorCode, run } = useSubmit();

  if (!aiFeedback) return null;

  const answer = async (value: boolean) => {
    setHelpful(value);
    setCommentSent(false);
    await run(() => sendDiagnosisFeedback(historyId, value));
  };
  const sendComment = async () => {
    if (helpful === null || !comment.trim()) return;
    const done = await run(async () => {
      await sendDiagnosisFeedback(historyId, helpful, comment.trim());
      return true;
    });
    if (done) setCommentSent(true);
  };

  return (
    <Card icon={LuMessageSquareText} title={hi.feedback.question} speakText={hi.feedback.question}>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label={hi.feedback.question}>
        <ThumbButton up selected={helpful === true} disabled={busy} onClick={() => void answer(true)} />
        <ThumbButton up={false} selected={helpful === false} disabled={busy} onClick={() => void answer(false)} />
      </div>
      {helpful !== null && !errorCode && <p className="mt-3 text-lg font-bold text-success-700" role="status">{hi.feedback.thanks}</p>}
      {errorCode && <p className="mt-3 text-lg font-bold text-danger-700" role="alert">{errorMessages[errorCode]}</p>}
      {helpful !== null && !commentSent && (
        <div className="mt-4 flex flex-col gap-3">
          <VoiceTextBox
            id={`feedback-${historyId}`}
            label={hi.feedback.tellMore}
            placeholder={hi.feedback.tellMorePlaceholder}
            value={comment}
            onChange={setComment}
            maxLength={COMMENT_MAX}
          />
          <Button variant="secondary" size="md" icon={LuSend} disabled={busy || !comment.trim()} onClick={() => void sendComment()}>
            {hi.feedback.send}
          </Button>
        </div>
      )}
    </Card>
  );
}

function ThumbButton({ up, selected, disabled, onClick }: { up: boolean; selected: boolean; disabled: boolean; onClick: () => void }) {
  const Icon = up ? LuThumbsUp : LuThumbsDown;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-lg font-bold transition-colors',
        selected
          ? up
            ? 'border-success-700 bg-success-700 text-white'
            : 'border-danger-700 bg-danger-700 text-white'
          : 'border-line bg-surface text-ink-900 hover:border-primary-300',
      )}
    >
      <Icon aria-hidden="true" className="size-8" />
      {up ? hi.feedback.yes : hi.feedback.no}
    </button>
  );
}
