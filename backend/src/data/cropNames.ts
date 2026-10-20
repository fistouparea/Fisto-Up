import type { CropId } from '../types/diagnosis.js';

/** Short Hindi crop names for messages (the AI prompt uses the longer names in types/diagnosis.ts). */
export const CROP_NAMES: Record<CropId, string> = {
  bajra: 'बाजरा',
  guar: 'ग्वार',
  moong: 'मूंग',
  moth: 'मोठ',
  chana: 'चना',
  sarson: 'सरसों',
  jeera: 'जीरा',
  gehun: 'गेहूं',
  other: 'फसल',
};
