import { useState } from 'react';
import { askFollowUp } from '../api/chat';
import { ApiError } from '../api/client';
import type { ChatMessage, CropId, Diagnosis, ErrorCode } from '../api/types';

/** Follow-up conversation about one diagnosis. */
export function useChat(crop: CropId, diagnosis: Diagnosis) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  /** Sends a question. Resolves true on success; on failure the question is removed so it can be resent. */
  const ask = async (question: string): Promise<boolean> => {
    const text = question.trim();
    if (!text || pending) return false;

    const withQuestion: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(withQuestion);
    setPending(true);
    setErrorCode(null);
    try {
      const answer = await askFollowUp(crop, diagnosis, withQuestion);
      setMessages([...withQuestion, { role: 'assistant', text: answer }]);
      return true;
    } catch (error) {
      setMessages(messages);
      setErrorCode(error instanceof ApiError ? error.code : 'UNKNOWN');
      return false;
    } finally {
      setPending(false);
    }
  };

  return { messages, pending, errorCode, ask };
}
