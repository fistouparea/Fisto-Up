import type { DiagnoseResponse } from '../types/diagnosis.js';
import { CROPS, type CropId } from '../types/diagnosis.js';
import { toCsv } from '../utils/csv.js';

/** One photo for the KVK expert: what the farmer would have seen, plus empty columns for the expert. */
export interface ReviewRow {
  photo: string;
  crop: CropId;
  /** Expert's earlier label (labels.csv), if any. */
  expected?: string;
  response: DiagnoseResponse | { status: 'error'; message: string };
}

export const REVIEW_HEADER = [
  'photo',
  'crop',
  'app_status',
  'AI_समस्या (problem)',
  'AI_कारण (explanation)',
  'AI_देसी_उपाय',
  'AI_दवाई',
  'AI_सावधानी',
  'severity',
  'label_से_उम्मीद (expected)',
  'expert: सही / गलत / आंशिक',
  'expert: सही जवाब',
  'expert: दवाई ठीक है? (हाँ/नहीं)',
  'expert: टिप्पणी (comments)',
];

/** The crop of a photo: from labels.csv, else the file name prefix ("bajra_001.jpg"), else "other". */
export function cropForPhoto(filename: string, labelled?: CropId): CropId {
  if (labelled) return labelled;
  const prefix = filename.toLowerCase().split(/[_\-. ]/)[0] ?? '';
  return (Object.keys(CROPS) as CropId[]).find((crop) => crop === prefix) ?? 'other';
}

const list = (items: string[]) => items.map((item, index) => `${index + 1}. ${item}`).join('\n');

/** CSV (UTF-8 with BOM: opens in Excel with Hindi intact). Expert columns stay empty. */
export function reviewSheetCsv(rows: ReviewRow[]): string {
  return toCsv(
    REVIEW_HEADER,
    rows.map(({ photo, crop, expected, response }) => {
      const base = [photo, crop];
      const empty = ['', '', '', ''];
      if (response.status === 'error') return [...base, 'error', response.message, '', '', '', '', '', expected ?? '', ...empty];
      if (response.status === 'unclear') return [...base, 'unclear (app ने "साफ़ फोटो लें" कहा)', '', '', '', '', '', '', expected ?? '', ...empty];
      const d = response.diagnosis;
      return [
        ...base,
        'ok',
        d.problem_name,
        d.explanation,
        list(d.desi_upay),
        list(d.dawai.map((dawai) => `${dawai.name}: ${dawai.kaise_use_karein}`)),
        list(d.savdhani),
        d.severity ?? '',
        expected ?? '',
        ...empty,
      ];
    }),
  );
}
