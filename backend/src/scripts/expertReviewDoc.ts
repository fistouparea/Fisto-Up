/**
 * Writes the KVK expert review document: every AI prompt and every agro rule (weather thresholds, water rules,
 * crop stages, banned/restricted items, generic names) with empty correction columns.
 *
 *   npm run kvk:rules      → launch-kit/1-kvk-review/expert-review.html (print to PDF) and expert-review.csv
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expertReviewHtml, ruleRows, ruleRowsCsv } from '../eval/expertReview.js';
import { todayInIndia } from '../utils/dates.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../../launch-kit/1-kvk-review');
await mkdir(outDir, { recursive: true });
const list = ruleRows();
await writeFile(path.join(outDir, 'expert-review.html'), expertReviewHtml(list, todayInIndia()));
await writeFile(path.join(outDir, 'expert-review.csv'), ruleRowsCsv(list));
console.log(`${list.length} rules + prompts → ${outDir}/expert-review.html and expert-review.csv`);
