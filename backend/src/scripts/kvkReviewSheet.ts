/**
 * KVK expert review sheet: runs the app's real diagnosis (same prompt, same "unclear" rule, same packet-dose
 * note) on every photo in eval/photos and writes a CSV with empty columns for the expert.
 *
 *   npm run kvk:sheet                      # all photos, real AI (GEMINI_API_KEY in .env)
 *   npm run kvk:sheet -- --limit 5
 *   npm run kvk:sheet -- --dry-run         # no AI call: a fixed answer, to check the sheet format
 *
 * Crop per photo: labels.csv (if present), else the file name prefix (bajra_001.jpg), else "other".
 * Output: launch-kit/1-kvk-review/out/review-sheet-<date>.csv
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../config/env.js';
import { parseLabels } from '../eval/labels.js';
import { cropForPhoto, reviewSheetCsv, type ReviewRow } from '../eval/reviewSheet.js';
import { detectImageType } from '../middleware/validateImage.js';
import type { AiProvider } from '../services/ai/aiProvider.js';
import { createAiProvider } from '../services/ai/createAiProvider.js';
import { diagnosePhoto } from '../services/diagnosisService.js';
import { CROPS } from '../types/diagnosis.js';
import { todayInIndia } from '../utils/dates.js';
import { parseCliArgs } from './cli.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const args = parseCliArgs({ photos: { type: 'string' }, out: { type: 'string' }, limit: { type: 'string' }, 'dry-run': { type: 'boolean' } });
const photoDir = path.resolve(args.photos ?? path.join(root, 'eval/photos'));
const outDir = path.resolve(args.out ?? path.join(root, 'launch-kit/1-kvk-review/out'));

const files = (await readdir(photoDir)).filter((name) => /\.(jpe?g|png|webp)$/i.test(name)).sort();
const limited = args.limit ? files.slice(0, Number(args.limit)) : files;
if (limited.length === 0) {
  console.error(`No photos (JPEG/PNG/WebP) in ${photoDir}. Put the KVK photos there first (launch-kit/1-kvk-review/PHOTO-GUIDE.md).`);
  process.exit(1);
}
const labels = await readFile(path.join(photoDir, 'labels.csv'), 'utf8').then((text) => parseLabels(text).rows, () => []);
const byFile = new Map(labels.map((row) => [row.filename, row]));

/** --dry-run: one fixed answer so the sheet can be checked without an API key. */
const dryRun: AiProvider['diagnose'] = async () => ({
  is_plant_image: true,
  confidence: 'high',
  severity: 'mild',
  problem_name: '(dry run) पत्तों पर झुलसा',
  explanation: '(dry run) AI नहीं चला, यह सिर्फ़ नमूना है।',
  desi_upay: ['नीम का घोल'],
  dawai: [{ name: 'मैंकोजेब', kaise_use_karein: 'शाम को छिड़कें।' }],
  savdhani: ['दस्ताने पहनें।'],
});
const provider: Pick<AiProvider, 'diagnose'> = args['dry-run'] ? { diagnose: dryRun } : createAiProvider(loadEnv());

const rows: ReviewRow[] = [];
for (const [index, photo] of limited.entries()) {
  const label = byFile.get(photo);
  const crop = cropForPhoto(photo, label?.crop);
  try {
    const image = await readFile(path.join(photoDir, photo));
    const mimeType = detectImageType(image);
    if (!mimeType) throw new Error('not a JPEG/PNG/WebP image');
    rows.push({ photo, crop, expected: label?.expected_problem || (label?.expected_status === 'unclear' ? 'unclear (जवाब नहीं देना चाहिए)' : undefined), response: await diagnosePhoto(provider as AiProvider, { image, mimeType, cropName: CROPS[crop] }) });
  } catch (error) {
    rows.push({ photo, crop, expected: label?.expected_problem || (label?.expected_status === 'unclear' ? 'unclear (जवाब नहीं देना चाहिए)' : undefined), response: { status: 'error', message: error instanceof Error ? error.message : String(error) } });
  }
  console.log(`${index + 1}/${limited.length} ${photo}: ${rows.at(-1)?.response.status}`);
}

await mkdir(outDir, { recursive: true });
const file = path.join(outDir, `review-sheet-${todayInIndia()}${args['dry-run'] ? '-dry-run' : ''}.csv`);
await writeFile(file, reviewSheetCsv(rows));
console.log(`Review sheet: ${file}`);
