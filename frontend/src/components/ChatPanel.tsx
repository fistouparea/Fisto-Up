import { useState, type FormEvent } from 'react';
import type { CropId, Diagnosis } from '../api/types';
import { useChat } from '../hooks/useChat';
import { errorMessages, hi } from '../strings/hi';

const MAX_QUESTION_LENGTH = 500;

interface ChatPanelProps {
  crop: CropId;
  diagnosis: Diagnosis;
}

export function ChatPanel({ crop, diagnosis }: ChatPanelProps) {
  const { messages, pending, errorCode, ask } = useChat(crop, diagnosis);
  const [draft, setDraft] = useState('');

  const send = async (question: string) => {
    setDraft(question);
    if (await ask(question)) setDraft('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-green-200 bg-white p-4">
      <h3 className="text-2xl font-bold text-gray-900">
        <span aria-hidden="true">💬 </span>
        {hi.chat.title}
      </h3>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {hi.chat.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={pending}
              onClick={() => void send(suggestion)}
              className="min-h-12 rounded-full border-2 border-green-300 bg-green-50 px-4 text-lg text-green-900 active:bg-green-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-2" aria-live="polite">
        {messages.map((message, index) => (
          <li
            key={index}
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-xl leading-relaxed ${
              message.role === 'user' ? 'self-end bg-green-700 text-white' : 'self-start bg-green-50 text-gray-900'
            }`}
          >
            {message.text}
          </li>
        ))}
      </ul>

      {pending && <p className="text-lg text-gray-600">{hi.chat.waiting}</p>}
      {errorCode && (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-lg font-bold text-amber-900">
          {errorMessages[errorCode]}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder={hi.chat.placeholder}
          aria-label={hi.chat.placeholder}
          disabled={pending}
          className="min-h-14 min-w-0 flex-1 rounded-xl border-2 border-gray-300 px-3 text-xl focus:border-green-700 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="min-h-14 rounded-xl bg-green-700 px-4 text-xl font-bold text-white disabled:bg-gray-400"
        >
          {hi.chat.send}
        </button>
      </form>
    </section>
  );
}
