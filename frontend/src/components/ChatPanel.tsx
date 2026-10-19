import { AnimatePresence, m } from 'framer-motion';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { LuMessageCircleQuestion, LuSendHorizontal, LuSprout, LuUser } from 'react-icons/lu';
import type { ChatMessage, CropId, Diagnosis } from '../api/types';
import { useChat } from '../hooks/useChat';
import { hi } from '../strings/hi';
import { cn } from '../utils/cn';
import { MicButton } from './MicButton';
import { Card } from './ui/Card';
import { IconButton } from './ui/IconButton';
import { SpeakButton } from './ui/SpeakButton';
import { notifyError } from './ui/notify';

const MAX_QUESTION_LENGTH = 500;

interface ChatPanelProps {
  crop: CropId;
  diagnosis: Diagnosis;
}

export function ChatPanel({ crop, diagnosis }: ChatPanelProps) {
  const { messages, pending, errorCode, ask } = useChat(crop, diagnosis);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (errorCode) notifyError(errorCode);
  }, [errorCode]);

  const send = async (question: string) => {
    setDraft(question);
    if (await ask(question)) setDraft('');
  };

  // Spoken text goes into the box so the farmer can check it before sending.
  const handleTranscript = useCallback((text: string) => setDraft(text.slice(0, MAX_QUESTION_LENGTH)), []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  return (
    <Card icon={LuMessageCircleQuestion} title={hi.chat.title} speakText={hi.chat.title}>
      <div className="flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            {hi.chat.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={pending}
                onClick={() => void send(suggestion)}
                className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-primary-100 bg-surface-green px-4 text-left text-lg text-primary-800 hover:border-primary-300 disabled:opacity-60"
              >
                <LuMessageCircleQuestion aria-hidden="true" className="size-6 shrink-0" />
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <ul className="flex flex-col gap-3" aria-live="polite">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <ChatBubble key={index} message={message} />
              ))}
            </AnimatePresence>
          </ul>
        )}

        {pending && <TypingIndicator />}

        <MicButton onTranscript={handleTranscript} disabled={pending} />

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder={hi.chat.placeholder}
            aria-label={hi.chat.placeholder}
            disabled={pending}
            className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-ink-500/40 bg-surface px-4 text-lg text-ink-900 placeholder:text-ink-500 focus:border-primary-700 focus:outline-none"
          />
          <IconButton
            type="submit"
            icon={LuSendHorizontal}
            label={hi.chat.send}
            tone="primary"
            disabled={pending || !draft.trim()}
          />
        </form>
      </div>
    </Card>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const fromFarmer = message.role === 'user';
  const Avatar = fromFarmer ? LuUser : LuSprout;
  return (
    <m.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-end gap-2', fromFarmer ? 'flex-row-reverse' : 'flex-row')}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          fromFarmer ? 'bg-accent-400 text-ink-900' : 'bg-primary-700 text-white',
        )}
      >
        <Avatar aria-hidden="true" className="size-5" />
        <span className="sr-only">{fromFarmer ? hi.chat.you : hi.chat.assistant}</span>
      </span>
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-2 rounded-3xl px-4 py-3 text-lg leading-relaxed',
          fromFarmer
            ? 'rounded-br-md bg-primary-700 text-white'
            : 'rounded-bl-md border border-primary-100 bg-surface-green text-ink-900',
        )}
      >
        {message.text}
        {!fromFarmer && <SpeakButton text={message.text} className="self-start" />}
      </div>
    </m.li>
  );
}

function TypingIndicator() {
  return (
    <div role="status" className="flex items-center gap-2 text-lg text-ink-500">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="size-2.5 animate-bounce rounded-full bg-primary-500" style={{ animationDelay: `${dot * 150}ms` }} />
        ))}
      </span>
      {hi.chat.waiting}
    </div>
  );
}
