import { AppError } from '../errors/AppError.js';
import type { AiProvider } from '../services/ai/aiProvider.js';
import { reviewDawai, type DawaiFlag } from '../services/dawaiSafety.js';
import { toDiagnoseResponse } from '../services/diagnosisService.js';
import { CROPS, type CropId, type ImageMimeType } from '../types/diagnosis.js';
import type { LabelRow } from './labels.js';

/**
 * What happened with one labelled photo:
 *  correct            – the farmer would see an answer, and it matches the expert's label
 *  wrong              – the farmer would see an answer, but a different problem
 *  low_confidence     – the AI was not sure, so the app showed "साफ़ फोटो लें" (no answer for a photo that has one)
 *  refused_correctly  – a photo labelled "unclear" (not a plant, blurry) was refused, as it must be
 *  guessed_on_unclear – a photo labelled "unclear" got an answer anyway (a guess: serious)
 *  error              – the photo could not be read or the AI call failed
 */
export type Outcome = 'correct' | 'wrong' | 'low_confidence' | 'refused_correctly' | 'guessed_on_unclear' | 'error';

export interface PhotoResult {
  filename: string;
  crop: CropId;
  expectedStatus: 'ok' | 'unclear';
  expectedProblem: string;
  outcome: Outcome;
  confidence?: string;
  isPlant?: boolean;
  problemName?: string;
  severity?: string;
  dawai: { name: string; usage: string; flags: DawaiFlag[] }[];
  error?: string;
  durationMs: number;
}

/** Lowercase, no spaces/punctuation, nukta and chandrabindu folded: "पत्ती का झुलसा" ≈ "पत्तीकाझुलसा". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/़/g, '') // nukta
    .replace(/[ँं]/g, 'ं') // chandrabindu → anusvara
    .replace(/[\s.,;:!?()[\]"'“”‘’\-–—/|]+/g, '');
}

/** Right if the expert's problem name or one of its keywords appears in the AI's problem name (or the other way round). */
export function matchesLabel(row: Pick<LabelRow, 'expected_problem' | 'keywords'>, problemName: string, explanation = ''): boolean {
  const answer = normalize(problemName);
  const context = normalize(`${problemName} ${explanation}`);
  const expected = normalize(row.expected_problem);
  if (expected && (answer.includes(expected) || (answer.length >= 3 && expected.includes(answer)))) return true;
  return row.keywords.some((keyword) => {
    const word = normalize(keyword);
    return word.length > 0 && context.includes(word);
  });
}

export interface EvaluateOptions {
  provider: AiProvider;
  rows: LabelRow[];
  readPhoto: (filename: string) => Promise<{ image: Buffer; mimeType: ImageMimeType }>;
  /** Parallel AI calls. Keep low on the free tier (per-minute limits). */
  concurrency?: number;
  onResult?: (result: PhotoResult, done: number, total: number) => void;
}

export async function evaluatePhotos({ provider, rows, readPhoto, concurrency = 1, onResult }: EvaluateOptions): Promise<PhotoResult[]> {
  const results: PhotoResult[] = new Array<PhotoResult>(rows.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < rows.length) {
      const index = next++;
      const row = rows[index];
      if (!row) continue;
      const result = await evaluateOne(provider, row, readPhoto);
      results[index] = result;
      onResult?.(result, ++done, rows.length);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return results;
}

async function evaluateOne(provider: AiProvider, row: LabelRow, readPhoto: EvaluateOptions['readPhoto']): Promise<PhotoResult> {
  const base = { filename: row.filename, crop: row.crop, expectedStatus: row.expected_status, expectedProblem: row.expected_problem, dawai: [] };
  const started = Date.now();
  try {
    const photo = await readPhoto(row.filename);
    // Exactly what the app sends: the photo and the crop name, nothing else.
    const ai = await provider.diagnose({ image: photo.image, mimeType: photo.mimeType, cropName: CROPS[row.crop] });
    const shown = toDiagnoseResponse(ai);
    const durationMs = Date.now() - started;
    const details = {
      confidence: ai.confidence,
      isPlant: ai.is_plant_image,
      problemName: ai.problem_name,
      ...(ai.severity && { severity: ai.severity }),
      // Review what the farmer would actually read (with the packet-dose note the app adds).
      dawai: shown.status === 'ok' ? shown.diagnosis.dawai.map((item) => ({ name: item.name, usage: item.kaise_use_karein, flags: reviewDawai(item) })) : [],
    };
    if (row.expected_status === 'unclear') {
      return { ...base, ...details, outcome: shown.status === 'unclear' ? 'refused_correctly' : 'guessed_on_unclear', durationMs };
    }
    if (shown.status === 'unclear') return { ...base, ...details, outcome: 'low_confidence', durationMs };
    return { ...base, ...details, outcome: matchesLabel(row, ai.problem_name, ai.explanation) ? 'correct' : 'wrong', durationMs };
  } catch (error) {
    const message = error instanceof AppError ? error.code : error instanceof Error ? error.message : String(error);
    return { ...base, outcome: 'error', error: message, durationMs: Date.now() - started };
  }
}

export interface CropSummary {
  photos: number;
  correct: number;
  wrong: number;
  lowConfidence: number;
  /** correct / (photos with a known problem that did not error). */
  accuracyPercent: number | null;
}

export interface EvalSummary {
  photos: number;
  /** Photos labelled with a problem (expected_status ok). */
  labelled: number;
  correct: number;
  wrong: number;
  lowConfidence: number;
  accuracyPercent: number | null;
  /** Of the labelled photos, how often the app said "साफ़ फोटो लें" instead of answering. */
  lowConfidencePercent: number | null;
  unclearPhotos: number;
  refusedCorrectly: number;
  guessedOnUnclear: number;
  errors: number;
  medicineSuggestions: number;
  medicineFlagged: number;
  bannedOrRedLabel: number;
  perCrop: Partial<Record<CropId, CropSummary>>;
  averageSeconds: number | null;
}

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

export function summarize(results: PhotoResult[]): EvalSummary {
  const count = (outcome: Outcome, list = results) => list.filter((result) => result.outcome === outcome).length;
  const labelled = results.filter((result) => result.expectedStatus === 'ok' && result.outcome !== 'error');
  const crops = [...new Set(results.map((result) => result.crop))];
  const perCrop = Object.fromEntries(
    crops.map((crop) => {
      const mine = labelled.filter((result) => result.crop === crop);
      return [
        crop,
        {
          photos: results.filter((result) => result.crop === crop).length,
          correct: count('correct', mine),
          wrong: count('wrong', mine),
          lowConfidence: count('low_confidence', mine),
          accuracyPercent: percent(count('correct', mine), mine.length),
        },
      ];
    }),
  ) as Partial<Record<CropId, CropSummary>>;
  const medicines = results.flatMap((result) => result.dawai);
  const answered = results.filter((result) => result.outcome !== 'error');

  return {
    photos: results.length,
    labelled: labelled.length,
    correct: count('correct'),
    wrong: count('wrong'),
    lowConfidence: count('low_confidence'),
    accuracyPercent: percent(count('correct'), labelled.length),
    lowConfidencePercent: percent(count('low_confidence'), labelled.length),
    unclearPhotos: results.filter((result) => result.expectedStatus === 'unclear').length,
    refusedCorrectly: count('refused_correctly'),
    guessedOnUnclear: count('guessed_on_unclear'),
    errors: count('error'),
    medicineSuggestions: medicines.length,
    medicineFlagged: medicines.filter((item) => item.flags.length > 0).length,
    bannedOrRedLabel: medicines.filter((item) => item.flags.includes('banned_or_red_label')).length,
    perCrop,
    averageSeconds: answered.length > 0 ? Math.round(answered.reduce((sum, result) => sum + result.durationMs, 0) / answered.length / 100) / 10 : null,
  };
}

export interface EvalReport {
  createdAt: string;
  model: string;
  prompt: { version: string; fingerprint: string };
  summary: EvalSummary;
  results: PhotoResult[];
}

const show = (value: number | null, suffix = '%') => (value === null ? '–' : `${value}${suffix}`);

function delta(now: number | null, before: number | null | undefined): string {
  if (now === null || before === null || before === undefined) return '';
  const diff = Math.round((now - before) * 10) / 10;
  return diff === 0 ? ' (±0)' : ` (${diff > 0 ? '+' : ''}${diff})`;
}

const FLAG_TEXT: Record<DawaiFlag, string> = {
  banned_or_red_label: '⛔ banned / red label',
  exact_dose: 'exact dose',
  missing_packet_note: 'no packet-dose note',
};

/** The human-readable report (eval/reports/*.md). With `previous`, every main number shows the change. */
export function reportMarkdown(report: EvalReport, previous?: EvalReport): string {
  const s = report.summary;
  const p = previous?.summary;
  const lines = [
    `# AI evaluation · ${report.createdAt}`,
    '',
    `- Model: \`${report.model}\``,
    `- Diagnosis prompt: **${report.prompt.version}** (\`${report.prompt.fingerprint}\`) — text in \`eval/prompts/${report.prompt.version}.txt\``,
    previous ? `- Compared with: ${previous.createdAt} · ${previous.prompt.version} (\`${previous.prompt.fingerprint}\`) · ${previous.model}` : '- First report (nothing to compare with)',
    '',
    '## Summary',
    '',
    '| | |',
    '| --- | --- |',
    `| Photos | ${s.photos} (${s.labelled} with a known problem, ${s.unclearPhotos} labelled "unclear", ${s.errors} errors) |`,
    `| **Accuracy** (right answer shown) | **${show(s.accuracyPercent)}**${delta(s.accuracyPercent, p?.accuracyPercent)} — ${s.correct} right, ${s.wrong} wrong |`,
    `| Low-confidence rate ("साफ़ फोटो लें" on a labelled photo) | ${show(s.lowConfidencePercent)}${delta(s.lowConfidencePercent, p?.lowConfidencePercent)} |`,
    `| "Unclear" photos refused (must be all) | ${s.refusedCorrectly} / ${s.unclearPhotos}${s.guessedOnUnclear > 0 ? ` — ⚠️ ${s.guessedOnUnclear} guessed` : ''} |`,
    `| Medicine suggestions flagged for review | ${s.medicineFlagged} of ${s.medicineSuggestions}${s.bannedOrRedLabel > 0 ? ` — ⛔ ${s.bannedOrRedLabel} banned/red label` : ''} |`,
    `| Average time per photo | ${show(s.averageSeconds, ' s')} |`,
    '',
    '## Accuracy per crop',
    '',
    '| Crop | Photos | Right | Wrong | Low confidence | Accuracy |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...Object.entries(s.perCrop).map(([crop, row]) => {
      const before = p?.perCrop[crop as CropId]?.accuracyPercent;
      return `| ${CROPS[crop as CropId]} | ${row.photos} | ${row.correct} | ${row.wrong} | ${row.lowConfidence} | ${show(row.accuracyPercent)}${delta(row.accuracyPercent, before)} |`;
    }),
    '',
    '## Wrong answers (for the KVK expert)',
    '',
  ];
  const wrong = report.results.filter((result) => result.outcome === 'wrong' || result.outcome === 'guessed_on_unclear');
  lines.push(
    ...(wrong.length === 0
      ? ['None.']
      : [
          '| Photo | Crop | Expert says | AI said | Confidence |',
          '| --- | --- | --- | --- | --- |',
          ...wrong.map((result) => `| ${result.filename} | ${CROPS[result.crop]} | ${result.expectedStatus === 'unclear' ? '(unclear photo)' : result.expectedProblem} | ${result.problemName ?? ''} | ${result.confidence ?? ''} |`),
        ]),
    '',
    '## Medicine suggestions to review',
    '',
  );
  const flagged = report.results.flatMap((result) => result.dawai.filter((item) => item.flags.length > 0).map((item) => ({ result, item })));
  lines.push(
    ...(flagged.length === 0
      ? ['None flagged.']
      : [
          '| Photo | Medicine | How to use (as shown) | Why |',
          '| --- | --- | --- | --- |',
          ...flagged.map(({ result, item }) => `| ${result.filename} | ${item.name} | ${item.usage.replace(/\|/g, '/')} | ${item.flags.map((flag) => FLAG_TEXT[flag]).join(', ')} |`),
        ]),
  );
  const errors = report.results.filter((result) => result.outcome === 'error');
  if (errors.length > 0) lines.push('', '## Errors', '', ...errors.map((result) => `- ${result.filename}: ${result.error ?? ''}`));
  lines.push('', 'All medicine suggestions (also unflagged) are in the JSON report next to this file.', '');
  return lines.join('\n');
}
