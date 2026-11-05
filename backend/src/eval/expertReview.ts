import { ALERT_RULES, ALERT_TEXTS, IRRIGATION_INTERVAL_DAYS, NO_WATER_EXCEPTION, WATER_RULES, WATER_TEXTS, WATER_TIPS } from '../config/agroRules.js';
import { KIT_RULES, RESTRICTED_INPUTS } from '../config/inputRules.js';
import { CROP_CALENDARS, GENERAL_TASKS, STAGE_NAMES } from '../data/cropCalendar.js';
import { INPUT_GENERICS } from '../data/inputGenerics.js';
import { PROMPT_NAMES, PROMPTS } from '../services/ai/promptVersions.js';
import { BANNED_OR_RED_LABEL_PESTICIDES, PACKET_DOSE_NOTE } from '../services/dawaiSafety.js';
import { CROPS } from '../types/diagnosis.js';
import { toCsv } from '../utils/csv.js';

/** One reviewable line: where it lives, what it says now. The expert fills the other columns. */
export interface RuleRow {
  section: string;
  key: string;
  value: string;
  /** Source file, so a developer knows where to make the correction. */
  file: string;
}

/** Nested config as flat "a.b.c = value" lines (null = "पानी नहीं / none"). */
export function flatten(value: unknown, prefix = ''): [string, string][] {
  if (value === null) return [[prefix, 'null (इस चरण में पानी नहीं)']];
  if (Array.isArray(value)) {
    return value.every((item) => typeof item !== 'object' || item === null)
      ? [[prefix, value.join(' | ')]]
      : value.flatMap((item, index) => flatten(item, `${prefix}[${index + 1}]`));
  }
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key));
  return [[prefix, String(value)]];
}

const rows = (section: string, file: string, value: unknown, prefix = ''): RuleRow[] => flatten(value, prefix).map(([key, text]) => ({ section, key, value: text, file }));

/** Everything a KVK expert should check, in reading order. */
export function ruleRows(): RuleRow[] {
  return [
    ...rows('1. मौसम चेतावनी की सीमा (thresholds)', 'backend/src/config/agroRules.ts', ALERT_RULES),
    ...rows('2. मौसम चेतावनी के संदेश', 'backend/src/config/agroRules.ts', ALERT_TEXTS),
    { section: '2. मौसम चेतावनी के संदेश', key: 'NO_WATER_EXCEPTION', value: NO_WATER_EXCEPTION, file: 'backend/src/config/agroRules.ts' },
    ...rows('3. पानी (सिंचाई) के नियम', 'backend/src/config/agroRules.ts', WATER_RULES),
    ...rows('4. सिंचाई का अंतर (दिन), फसल × चरण', 'backend/src/config/agroRules.ts', IRRIGATION_INTERVAL_DAYS),
    ...rows('5. पानी के संदेश और सुझाव', 'backend/src/config/agroRules.ts', { ...WATER_TEXTS, tips: WATER_TIPS.map((tip) => tip.text) }),
    ...rows('6. फसल के चरण (बुवाई से दिन) और काम', 'backend/src/data/cropCalendar.ts', { stageNames: STAGE_NAMES, general: GENERAL_TASKS, crops: CROP_CALENDARS }),
    ...BANNED_OR_RED_LABEL_PESTICIDES.map((item) => ({ section: '7. प्रतिबंधित / लाल लेबल दवाई (AI कभी न सुझाए)', key: item.name, value: item.spellings.join(' | '), file: 'backend/src/services/dawaiSafety.ts' })),
    ...RESTRICTED_INPUTS.map((item) => ({ section: '8. बाज़ार में न बिकने वाले (restricted)', key: item.name, value: `${item.spellings.join(' | ')} — ${item.why}`, file: 'backend/src/config/inputRules.ts' })),
    ...Object.entries(INPUT_GENERICS).map(([id, generic]) => ({ section: '9. दवाई/खाद के generic नाम (दुकान से मिलान)', key: id, value: `${generic.hi} (${generic.en}) — ${generic.kind} — ${generic.spellings.join(' | ')}`, file: 'backend/src/data/inputGenerics.ts' })),
    { section: '10. दवाई का पक्का नियम', key: 'PACKET_DOSE_NOTE', value: PACKET_DOSE_NOTE, file: 'backend/src/services/dawaiSafety.ts' },
    ...rows('10. दवाई का पक्का नियम', 'backend/src/config/inputRules.ts', KIT_RULES, 'KIT_RULES'),
    ...rows('11. फसलों के नाम (AI को भेजे जाते हैं)', 'backend/src/types/diagnosis.ts', CROPS),
  ];
}

export const EXPERT_COLUMNS = ['सही है? (हाँ/नहीं)', 'सही मान / सही शब्द', 'टिप्पणी'];

export function ruleRowsCsv(list: RuleRow[]): string {
  return toCsv(['section', 'key', 'अभी का मान (current)', 'file', ...EXPERT_COLUMNS], list.map((row) => [row.section, row.key, row.value, row.file, '', '', '']));
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Printable A4 document: prompts in full, then every rule as a table row with empty correction cells. */
export function expertReviewHtml(list: RuleRow[], generatedOn: string): string {
  const prompts = PROMPT_NAMES.map(
    (name) => `<section class="prompt"><h3>${escapeHtml(name)} · ${escapeHtml(PROMPTS[name].version)}</h3><pre>${escapeHtml(PROMPTS[name].text())}</pre>
<p class="box">ठीक है? हाँ / नहीं &nbsp;&nbsp; क्या बदलें: ____________________________________________________________<br>
_____________________________________________________________________________________</p></section>`,
  ).join('\n');
  const sections = [...new Set(list.map((row) => row.section))]
    .map((section) => {
      const body = list
        .filter((row) => row.section === section)
        .map((row) => `<tr><td class="key">${escapeHtml(row.key)}</td><td>${escapeHtml(row.value)}</td><td></td><td></td><td></td></tr>`)
        .join('');
      const file = list.find((row) => row.section === section)?.file ?? '';
      return `<h2>${escapeHtml(section)}</h2><p class="file">${escapeHtml(file)}</p><table><thead><tr><th>नियम</th><th>अभी का मान</th>${EXPERT_COLUMNS.map((column) => `<th>${column}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join('\n');
  return `<!doctype html><html lang="hi"><head><meta charset="utf-8"><title>AgriAI – KVK expert review</title>
<link rel="stylesheet" href="../assets/print.css"></head><body class="doc">
<h1>AgriAI – KVK विशेषज्ञ जाँच (Expert review)</h1>
<p>बनाया: ${generatedOn}. हर पंक्ति देखें: सही हो तो "हाँ", गलत हो तो सही मान/शब्द लिखें। भरा हुआ फ़ॉर्म संयोजक को दें।
कोड में बदलाव डेवलपर "file" कॉलम वाली फ़ाइल में करेगा (AI prompt बदलने पर version बढ़ाना ज़रूरी: eval/README.md)।</p>
<p>विशेषज्ञ का नाम: ____________________ &nbsp; KVK: ____________________ &nbsp; तारीख: ____________ &nbsp; हस्ताक्षर: ____________</p>
<h2>भाग A – AI के निर्देश (prompts)</h2>
<p>ये AI को हर जाँच/सवाल पर भेजे जाते हैं। "&lt;crop&gt;" आदि की जगह असली फसल/जवाब आता है।</p>
${prompts}
<h2 class="break">भाग B – खेती के नियम (बिना AI, सीधे ऐप में)</h2>
${sections}
</body></html>
`;
}
