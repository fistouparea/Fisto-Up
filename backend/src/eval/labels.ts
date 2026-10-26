import { z } from 'zod';
import { cropIdSchema } from '../types/diagnosis.js';

/**
 * One labelled photo from eval/photos/labels.csv (filled by a KVK expert):
 *   filename,crop,expected_problem,expected_status,keywords,labelled_by,notes
 * expected_status: "ok" (default; the AI should name the problem) or "unclear" (not a plant, too blurry: the app
 * must refuse to guess). keywords: other words that also count as right, separated by "|".
 */
export const labelRowSchema = z.object({
  filename: z.string().trim().min(1),
  crop: cropIdSchema,
  expected_problem: z.string().trim().default(''),
  expected_status: z.enum(['ok', 'unclear']).default('ok'),
  keywords: z
    .string()
    .default('')
    .transform((value) => value.split('|').map((word) => word.trim()).filter(Boolean)),
  labelled_by: z.string().trim().default(''),
  notes: z.string().trim().default(''),
});
export type LabelRow = z.infer<typeof labelRowSchema>;

/** Minimal CSV reader (quotes, commas and newlines inside quotes, BOM, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') index++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (cell !== '' || row.length > 0) rows.push([...row, cell]);
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''));
}

/** Reads labels.csv; rows starting with "#" are comments. Bad rows are reported, not silently skipped. */
export function parseLabels(csv: string): { rows: LabelRow[]; problems: string[] } {
  const [header, ...lines] = parseCsv(csv).filter((cells) => !cells[0]?.trim().startsWith('#'));
  if (!header) return { rows: [], problems: ['labels.csv is empty'] };
  const columns = header.map((name) => name.trim().toLowerCase());
  const rows: LabelRow[] = [];
  const problems: string[] = [];
  lines.forEach((cells, index) => {
    // An empty cell means "not given", so the column's default applies.
    const record = Object.fromEntries(columns.flatMap((column, position) => (cells[position]?.trim() ? [[column, cells[position]]] : [])));
    const parsed = labelRowSchema.safeParse(record);
    if (parsed.success) rows.push(parsed.data);
    else problems.push(`line ${index + 2}: ${parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ')}`);
  });
  return { rows, problems };
}
