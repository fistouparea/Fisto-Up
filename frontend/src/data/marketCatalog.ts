import type { IconType } from 'react-icons';
import { LuCookie, LuCookingPot, LuFlame, LuLeaf, LuPackage, LuPalette } from 'react-icons/lu';
import type { Category, ProductId, Unit } from '../api/marketTypes';
import type { CropId } from '../api/types';

interface ProductVisual {
  category: Category;
  units: readonly Unit[];
  /** Shows the optional FSSAI field. */
  food: boolean;
  /** Crop illustration (same as the photo check), or an icon for SHG products. */
  crop?: CropId;
  icon?: IconType;
}

const CROP_UNITS = ['quintal', 'kg'] as const;
const SHG_FOOD_UNITS = ['kg', 'pack', 'piece'] as const;

/** Mirrors backend/src/config/marketCatalog.ts (units and food flag); names are in strings/hi.ts. */
export const PRODUCT_CATALOG: Record<ProductId, ProductVisual> = {
  bajra: { category: 'crop', units: CROP_UNITS, food: true, crop: 'bajra' },
  guar: { category: 'crop', units: CROP_UNITS, food: true, crop: 'guar' },
  moong: { category: 'crop', units: CROP_UNITS, food: true, crop: 'moong' },
  moth: { category: 'crop', units: CROP_UNITS, food: true, crop: 'moth' },
  chana: { category: 'crop', units: CROP_UNITS, food: true, crop: 'chana' },
  sarson: { category: 'crop', units: CROP_UNITS, food: true, crop: 'sarson' },
  jeera: { category: 'crop', units: CROP_UNITS, food: true, crop: 'jeera' },
  gehun: { category: 'crop', units: CROP_UNITS, food: true, crop: 'gehun' },
  til: { category: 'crop', units: CROP_UNITS, food: true, crop: 'other' },
  other_crop: { category: 'crop', units: CROP_UNITS, food: true, crop: 'other' },
  achar: { category: 'shg', units: SHG_FOOD_UNITS, food: true, icon: LuCookingPot },
  papad: { category: 'shg', units: SHG_FOOD_UNITS, food: true, icon: LuCookie },
  masala: { category: 'shg', units: SHG_FOOD_UNITS, food: true, icon: LuFlame },
  ker_sangri: { category: 'shg', units: SHG_FOOD_UNITS, food: true, icon: LuLeaf },
  handicraft: { category: 'shg', units: ['piece', 'pack'], food: false, icon: LuPalette },
  other_shg: { category: 'shg', units: ['piece', 'pack', 'kg'], food: false, icon: LuPackage },
};
