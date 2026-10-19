import { vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AiProvider } from '../src/services/ai/aiProvider.js';
import type { HistoryRepository } from '../src/services/history/historyRepository.js';
import type { AiDiagnosis } from '../src/types/diagnosis.js';

/** Smallest byte sequence our magic-number check accepts as a JPEG. */
export const JPEG_BYTES = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);

export const healthyDiagnosis: AiDiagnosis = {
  is_plant_image: true,
  confidence: 'high',
  problem_name: 'पत्तों पर झुलसा रोग',
  explanation: 'ज़्यादा नमी से फफूंद लग गई है।',
  desi_upay: ['नीम का घोल छिड़कें।'],
  dawai: [{ name: 'मैंकोजेब', kaise_use_karein: '15 लीटर पानी में 30 ग्राम मिलाकर छिड़कें।' }],
  savdhani: ['छिड़काव करते समय दस्ताने पहनें।'],
};

export const FAKE_CHAT_ANSWER = 'शाम के समय छिड़काव करें।';

export function createFakeProvider(
  diagnoseResult: AiDiagnosis | Error = healthyDiagnosis,
  chatResult: string | Error = FAKE_CHAT_ANSWER,
) {
  const diagnose = vi.fn<AiProvider['diagnose']>(async () => {
    if (diagnoseResult instanceof Error) throw diagnoseResult;
    return diagnoseResult;
  });
  const chat = vi.fn<AiProvider['chat']>(async () => {
    if (chatResult instanceof Error) throw chatResult;
    return chatResult;
  });
  return { diagnose, chat } satisfies AiProvider;
}

export function createTestApp(
  provider: AiProvider = createFakeProvider(),
  historyRepository: HistoryRepository | null = null,
) {
  return createApp({ aiProvider: provider, historyRepository, corsOrigins: ['http://localhost:5173'] });
}
