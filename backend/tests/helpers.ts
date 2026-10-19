import { vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AiProvider } from '../src/services/ai/aiProvider.js';
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

export function createFakeProvider(result: AiDiagnosis | Error = healthyDiagnosis) {
  const diagnose = vi.fn<AiProvider['diagnose']>(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  return { diagnose } satisfies AiProvider;
}

export function createTestApp(provider: AiProvider = createFakeProvider()) {
  return createApp({ aiProvider: provider, corsOrigins: ['http://localhost:5173'] });
}
