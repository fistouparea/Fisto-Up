import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluatePhotos, matchesLabel, reportMarkdown, summarize, type EvalReport } from '../src/eval/evaluate.js';
import { parseLabels } from '../src/eval/labels.js';
import { AppError } from '../src/errors/AppError.js';
import { PROMPT_NAMES, promptInfo } from '../src/services/ai/promptVersions.js';
import { PACKET_DOSE_NOTE, reviewDawai } from '../src/services/dawaiSafety.js';
import { CROPS, type AiDiagnosis } from '../src/types/diagnosis.js';
import { createFakeProvider, healthyDiagnosis, JPEG_BYTES } from './helpers.js';

const LABELS = `\uFEFFfilename,crop,expected_problem,expected_status,keywords,labelled_by,notes
# comment lines are skipped
bajra1.jpg,bajra,झुलसा रोग,,blight|झुलसा,Dr. Meena (KVK Churu),
bajra2.jpg,bajra,"दीमक, जड़ में",ok,,Dr. Meena,"note, with comma"
chana1.jpg,chana,उकठा रोग,ok,,,
book.jpg,chana,,unclear,,,not a plant
broken.jpg,chana,उकठा,ok,,,
bad.jpg,coconut,x,ok,,,
`;

describe('labels.csv', () => {
  it('reads quoted cells, skips comments and reports bad rows instead of dropping them silently', () => {
    const { rows, problems } = parseLabels(LABELS);
    expect(rows.map((row) => row.filename)).toEqual(['bajra1.jpg', 'bajra2.jpg', 'chana1.jpg', 'book.jpg', 'broken.jpg']);
    expect(rows[0]).toMatchObject({ expected_status: 'ok', keywords: ['blight', 'झुलसा'] });
    expect(rows[1]?.expected_problem).toBe('दीमक, जड़ में');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/line 7: crop/);
  });
});

describe('matching the expert label', () => {
  it('accepts the same problem written a little differently, or a keyword', () => {
    const row = { expected_problem: 'पत्तों का झुलसा', keywords: ['blight'] };
    expect(matchesLabel(row, 'पत्तों का झुलसा रोग')).toBe(true);
    expect(matchesLabel(row, 'पत्तोंकाझुलसा')).toBe(true);
    expect(matchesLabel({ expected_problem: 'झुलसा', keywords: [] }, 'पत्ती पर झुलसा')).toBe(true);
    expect(matchesLabel(row, 'Leaf blight')).toBe(true);
    expect(matchesLabel(row, 'दीमक का हमला')).toBe(false);
  });
});

describe('medicine review', () => {
  it('flags banned/red-label pesticides (English or Hindi), exact doses and a missing packet note', () => {
    expect(reviewDawai({ name: 'मैंकोजेब', kaise_use_karein: `शाम को छिड़कें। ${PACKET_DOSE_NOTE}` })).toEqual([]);
    expect(reviewDawai({ name: 'मोनोक्रोटोफॉस', kaise_use_karein: PACKET_DOSE_NOTE })).toEqual(['banned_or_red_label']);
    expect(reviewDawai({ name: 'Endosulfan 35 EC', kaise_use_karein: PACKET_DOSE_NOTE })).toEqual(['banned_or_red_label']);
    expect(reviewDawai({ name: 'इमिडाक्लोप्रिड', kaise_use_karein: '15 लीटर पानी में 30 ग्राम मिलाएँ' })).toEqual(['exact_dose', 'missing_packet_note']);
  });
});

const diagnosis = (overrides: Partial<AiDiagnosis>): AiDiagnosis => ({ ...healthyDiagnosis, ...overrides });

describe('running the evaluation', () => {
  it('scores every photo, sends the AI only the photo and crop, and summarizes per crop', async () => {
    const answers: Record<string, AiDiagnosis | Error> = {
      'bajra1.jpg': diagnosis({ problem_name: 'पत्तों पर झुलसा रोग' }),
      'bajra2.jpg': diagnosis({ problem_name: 'पत्तों पर झुलसा रोग' }),
      'chana1.jpg': diagnosis({ confidence: 'low' }),
      'book.jpg': diagnosis({ is_plant_image: false, confidence: 'low', problem_name: '' }),
      'broken.jpg': new AppError('AI_TIMEOUT'),
    };
    const provider = createFakeProvider();
    let current = '';
    provider.diagnose.mockImplementation(async () => {
      const answer = answers[current];
      if (answer instanceof Error || !answer) throw answer ?? new Error('no answer');
      return answer;
    });

    const { rows } = parseLabels(LABELS);
    const results = await evaluatePhotos({
      provider,
      rows,
      readPhoto: async (filename) => {
        current = filename;
        return { image: JPEG_BYTES, mimeType: 'image/jpeg' };
      },
    });
    expect(results.map((result) => result.outcome)).toEqual(['correct', 'wrong', 'low_confidence', 'refused_correctly', 'error']);
    expect(Object.keys(provider.diagnose.mock.calls[0]?.[0] ?? {}).sort()).toEqual(['cropName', 'image', 'mimeType']);
    // The medicine is reviewed as the farmer reads it, with the packet note the app adds: here an exact dose.
    expect(results[0]?.dawai[0]?.flags).toEqual(['exact_dose']);

    const summary = summarize(results);
    expect(summary).toMatchObject({ photos: 5, labelled: 3, correct: 1, wrong: 1, lowConfidence: 1, errors: 1, refusedCorrectly: 1, guessedOnUnclear: 0 });
    expect(summary.accuracyPercent).toBe(33.3);
    expect(summary.perCrop.bajra).toMatchObject({ photos: 2, correct: 1, wrong: 1, accuracyPercent: 50 });
    expect(summary.perCrop.chana).toMatchObject({ lowConfidence: 1, accuracyPercent: 0 });

    const report: EvalReport = { createdAt: '2026-11-20T10:00:00Z', model: 'm', prompt: promptInfo('diagnosis'), summary, results };
    const previous: EvalReport = { ...report, createdAt: '2026-11-01T10:00:00Z', summary: { ...summary, accuracyPercent: 30 } };
    const markdown = reportMarkdown(report, previous);
    expect(markdown).toContain(`**${promptInfo('diagnosis').version}**`);
    expect(markdown).toContain('**33.3%** (+3.3)');
    expect(markdown).toContain(`| bajra2.jpg | ${CROPS.bajra} | दीमक, जड़ में | पत्तों पर झुलसा रोग |`);
    expect(markdown).toContain('exact dose');
    expect(markdown).toContain('broken.jpg: AI_TIMEOUT');
  });

  it('a guess on a photo labelled "unclear" is reported as serious', async () => {
    const provider = createFakeProvider(diagnosis({}));
    const { rows } = parseLabels('filename,crop,expected_status\nbook.jpg,chana,unclear\n');
    const results = await evaluatePhotos({ provider, rows, readPhoto: async () => ({ image: JPEG_BYTES, mimeType: 'image/jpeg' }) });
    expect(results[0]?.outcome).toBe('guessed_on_unclear');
    expect(reportMarkdown({ createdAt: 'now', model: 'm', prompt: promptInfo('diagnosis'), summary: summarize(results), results })).toContain('⚠️ 1 guessed');
  });
});

describe('prompt versions', () => {
  it('every prompt text matches its locked version (bump the version + npm run prompts:snapshot after a change)', () => {
    const lock = JSON.parse(readFileSync(new URL('../src/services/ai/prompts.lock.json', import.meta.url), 'utf8')) as Record<string, { version: string; fingerprint: string }>;
    for (const name of PROMPT_NAMES) {
      expect(lock[name], `${name} missing in prompts.lock.json`).toEqual(promptInfo(name));
    }
  });
});
