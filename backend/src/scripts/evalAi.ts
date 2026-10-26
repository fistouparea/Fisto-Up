/**
 * AI quality evaluation: runs every labelled photo in eval/photos through the real AI provider and writes a
 * report to eval/reports (Markdown + JSON), compared with the previous report.
 *
 *   npm run eval                                  # all photos in ../eval/photos (labels.csv)
 *   npm run eval -- --limit 10 --concurrency 2    # first 10, two at a time
 *   npm run eval -- --photos /path/to/photos --out /path/to/reports
 *
 * Needs GEMINI_API_KEY + GEMINI_MODEL in .env. Free-tier limits apply: the provider retries on 429.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../config/env.js';
import { evaluatePhotos, reportMarkdown, summarize, type EvalReport } from '../eval/evaluate.js';
import { parseLabels } from '../eval/labels.js';
import { detectImageType } from '../middleware/validateImage.js';
import { createAiProvider } from '../services/ai/createAiProvider.js';
import { promptInfo } from '../services/ai/promptVersions.js';
import { parseCliArgs } from './cli.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const evalRoot = path.resolve(here, '../../../eval');
const args = parseCliArgs({ photos: { type: 'string' }, labels: { type: 'string' }, out: { type: 'string' }, limit: { type: 'string' }, concurrency: { type: 'string' } });
const photoDir = path.resolve(args.photos ?? path.join(evalRoot, 'photos'));
const labelsPath = path.resolve(args.labels ?? path.join(photoDir, 'labels.csv'));
const outDir = path.resolve(args.out ?? path.join(evalRoot, 'reports'));

const env = loadEnv();
const { rows, problems } = parseLabels(await readFile(labelsPath, 'utf8'));
for (const problem of problems) console.warn(`labels.csv ${problem}`);
const selected = args.limit ? rows.slice(0, Number(args.limit)) : rows;
if (selected.length === 0) {
  console.error(`No labelled photos in ${labelsPath}. See eval/README.md.`);
  process.exit(1);
}

console.log(`Evaluating ${selected.length} photos with ${env.GEMINI_MODEL} (${promptInfo('diagnosis').version}) …`);
const results = await evaluatePhotos({
  provider: createAiProvider(env),
  rows: selected,
  concurrency: Number(args.concurrency ?? 1),
  readPhoto: async (filename) => {
    // Only files inside the photo folder (labels cannot point elsewhere).
    const file = path.resolve(photoDir, filename);
    if (!file.startsWith(photoDir + path.sep)) throw new Error('file outside the photo folder');
    const image = await readFile(file);
    const mimeType = detectImageType(image);
    if (!mimeType) throw new Error('not a JPEG/PNG/WebP image');
    return { image, mimeType };
  },
  onResult: (result, done, total) => console.log(`[${done}/${total}] ${result.outcome.padEnd(18)} ${result.filename}`),
});

const report: EvalReport = {
  createdAt: new Date().toISOString(),
  model: [env.GEMINI_MODEL, ...env.GEMINI_FALLBACK_MODELS].join(' → '),
  prompt: promptInfo('diagnosis'),
  summary: summarize(results),
  results,
};

await mkdir(outDir, { recursive: true });
const previousFile = (await readdir(outDir)).filter((name) => name.endsWith('.json')).sort().at(-1);
const previous = previousFile ? (JSON.parse(await readFile(path.join(outDir, previousFile), 'utf8')) as EvalReport) : undefined;
const base = path.join(outDir, `${report.createdAt.replace(/[:.]/g, '-')}_${report.prompt.version}`);
await writeFile(`${base}.json`, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(`${base}.md`, reportMarkdown(report, previous));

const s = report.summary;
console.log(`\nAccuracy ${s.accuracyPercent ?? '–'}% · low confidence ${s.lowConfidencePercent ?? '–'}% · flagged medicines ${s.medicineFlagged} · errors ${s.errors}`);
console.log(`Report: ${base}.md`);
