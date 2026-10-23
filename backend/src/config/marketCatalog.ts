import type { CropId } from '../types/diagnosis.js';

/**
 * What can be sold. Product ids are mirrored in frontend/src/api/marketTypes.ts (PRODUCT_IDS); keep them in sync.
 * To add a product: add it here and in the frontend list + Hindi/English names (strings).
 */
export const CATEGORIES = ['crop', 'shg'] as const;
export type Category = (typeof CATEGORIES)[number];

export const UNITS = ['quintal', 'kg', 'piece', 'pack'] as const;
export type Unit = (typeof UNITS)[number];

interface ProductInfo {
  category: Category;
  /** Name sent to the AI and used for fallback titles. */
  hi: string;
  en: string;
  units: readonly Unit[];
  /** Food: the FSSAI registration number field is shown. */
  food: boolean;
  /** Crop with Agmarknet mandi prices (Phase 2 mandi service). */
  mandiCrop?: CropId;
}

const CROP_UNITS = ['quintal', 'kg'] as const;
const SHG_FOOD_UNITS = ['kg', 'pack', 'piece'] as const;

export const PRODUCTS = {
  bajra: { category: 'crop', hi: 'बाजरा', en: 'Bajra (Pearl millet)', units: CROP_UNITS, food: true, mandiCrop: 'bajra' },
  guar: { category: 'crop', hi: 'ग्वार', en: 'Guar (Cluster bean)', units: CROP_UNITS, food: true, mandiCrop: 'guar' },
  moong: { category: 'crop', hi: 'मूंग', en: 'Moong (Green gram)', units: CROP_UNITS, food: true, mandiCrop: 'moong' },
  moth: { category: 'crop', hi: 'मोठ', en: 'Moth bean', units: CROP_UNITS, food: true, mandiCrop: 'moth' },
  chana: { category: 'crop', hi: 'चना', en: 'Chana (Chickpea)', units: CROP_UNITS, food: true, mandiCrop: 'chana' },
  sarson: { category: 'crop', hi: 'सरसों', en: 'Mustard seed', units: CROP_UNITS, food: true, mandiCrop: 'sarson' },
  jeera: { category: 'crop', hi: 'जीरा', en: 'Jeera (Cumin)', units: CROP_UNITS, food: true, mandiCrop: 'jeera' },
  gehun: { category: 'crop', hi: 'गेहूं', en: 'Wheat', units: CROP_UNITS, food: true, mandiCrop: 'gehun' },
  til: { category: 'crop', hi: 'तिल', en: 'Sesame', units: CROP_UNITS, food: true },
  other_crop: { category: 'crop', hi: 'दूसरा अनाज / दाल', en: 'Other grain / pulse', units: CROP_UNITS, food: true },
  achar: { category: 'shg', hi: 'अचार', en: 'Pickle (Achar)', units: SHG_FOOD_UNITS, food: true },
  papad: { category: 'shg', hi: 'पापड़', en: 'Papad', units: SHG_FOOD_UNITS, food: true },
  masala: { category: 'shg', hi: 'मसाले', en: 'Spices (Masala)', units: SHG_FOOD_UNITS, food: true },
  ker_sangri: { category: 'shg', hi: 'केर-सांगरी', en: 'Ker Sangri', units: SHG_FOOD_UNITS, food: true },
  handicraft: { category: 'shg', hi: 'हस्तशिल्प', en: 'Handicraft', units: ['piece', 'pack'], food: false },
  other_shg: { category: 'shg', hi: 'दूसरा सामान', en: 'Other product', units: ['piece', 'pack', 'kg'], food: false },
} as const satisfies Record<string, ProductInfo>;

export type ProductId = keyof typeof PRODUCTS;
export const PRODUCT_IDS = Object.keys(PRODUCTS) as [ProductId, ...ProductId[]];

export function productInfo(id: ProductId): ProductInfo {
  return PRODUCTS[id];
}

export const UNIT_NAMES: Record<Unit, { hi: string; en: string }> = {
  quintal: { hi: 'क्विंटल', en: 'quintal' },
  kg: { hi: 'किलो', en: 'kg' },
  piece: { hi: 'नग', en: 'piece' },
  pack: { hi: 'पैकेट', en: 'pack' },
};
