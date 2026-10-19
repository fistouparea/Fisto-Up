import { afterEach, describe, expect, it, vi } from 'vitest';
import { askFollowUp, MAX_CHAT_MESSAGES } from './chat';
import type { ChatMessage, Diagnosis } from './types';

const diagnosis: Diagnosis = { problem_name: 'रोग', explanation: 'कारण', desi_upay: [], dawai: [], savdhani: [] };

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('askFollowUp', () => {
  it('posts JSON with crop, diagnosis and messages, and returns the answer', async () => {
    const fetchMock = stubFetch({ answer: 'शाम को डालें।' });
    const messages: ChatMessage[] = [{ role: 'user', text: 'कब डालूँ?' }];

    await expect(askFollowUp('bajra', diagnosis, messages)).resolves.toBe('शाम को डालें।');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/chat');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ crop: 'bajra', diagnosis, messages });
  });

  it('sends only the last 10 messages', async () => {
    const fetchMock = stubFetch({ answer: 'ठीक है।' });
    const messages: ChatMessage[] = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      text: `संदेश ${i}`,
    }));

    await askFollowUp('bajra', diagnosis, messages);

    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.messages).toHaveLength(MAX_CHAT_MESSAGES);
    expect(sent.messages.at(-1).text).toBe('संदेश 14');
  });

  it('throws the backend error code', async () => {
    stubFetch({ error: { code: 'RATE_LIMITED' } }, 429);
    await expect(askFollowUp('bajra', diagnosis, [{ role: 'user', text: 'कब?' }])).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });
});
