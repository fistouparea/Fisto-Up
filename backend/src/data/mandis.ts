import type { CropId } from '../types/diagnosis.js';

/**
 * Mandis near Churu as named in Agmarknet (data.gov.in), with Hindi names for the app.
 * ⚠️ Verify the exact market spellings in the live data; add more mandis here.
 */
export const NEARBY_MANDIS: { match: RegExp; name: string }[] = [
  { match: /^churu/i, name: 'चूरू' },
  { match: /sardarshahar/i, name: 'सरदारशहर' },
  { match: /ratangarh/i, name: 'रतनगढ़' },
  { match: /sujangarh/i, name: 'सुजानगढ़' },
  { match: /taranagar/i, name: 'तारानगर' },
  { match: /rajgarh|sadulpur/i, name: 'राजगढ़ (सादुलपुर)' },
];

/** How each crop appears in Agmarknet commodity names. */
export const MANDI_COMMODITIES: Partial<Record<CropId, RegExp>> = {
  bajra: /bajra|pearl millet/i,
  guar: /guar/i,
  moong: /green gram|moong/i,
  moth: /moath|moth/i,
  chana: /bengal gram|^gram/i,
  sarson: /mustard/i,
  jeera: /cumin|jeera/i,
  gehun: /wheat/i,
};
