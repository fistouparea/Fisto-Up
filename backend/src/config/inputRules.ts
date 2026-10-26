/**
 * Rules for खाद-बीज-दवाई (farm inputs) and the "ज़रूरी सामान" kit after a diagnosis. Change numbers and lists
 * here, not in services. ⚠️ The blocklist needs review by a KVK expert / the state agriculture department.
 */
import type { InputKind } from '../data/inputGenerics.js';
import { BANNED_OR_RED_LABEL_PESTICIDES } from '../services/dawaiSafety.js';
import type { ProductId } from './marketCatalog.js';

/**
 * ⚠️ Verify with KVK. Never listed and never shown: everything the AI may never suggest
 * (BANNED_OR_RED_LABEL_PESTICIDES, the one list used by diagnosis and chat) plus inputs whose sale or use is
 * restricted in India, so a dealer cannot offer them to farmers through us.
 */
export const RESTRICTED_INPUTS: { name: string; spellings: string[]; why: string }[] = [
  { name: 'glyphosate', spellings: ['glyphosate', 'ग्लाइफोसेट', 'ग्लायफोसेट'], why: 'restricted to pest control operators (verify)' },
  { name: 'chlorpyrifos', spellings: ['chlorpyrifos', 'क्लोरपायरीफॉस', 'क्लोरपाइरीफॉस'], why: 'use restrictions under review (verify)' },
  { name: 'fipronil', spellings: ['fipronil', 'फिप्रोनिल'], why: 'use restrictions under review (verify)' },
  { name: 'atrazine', spellings: ['atrazine', 'एट्राजीन', 'एट्राज़ीन'], why: 'restricted crops only (verify)' },
];

const BLOCKED_SPELLINGS = [...BANNED_OR_RED_LABEL_PESTICIDES, ...RESTRICTED_INPUTS].flatMap((item) => item.spellings.map((spelling) => spelling.toLowerCase()));

/** True if the text names a banned, red-label or restricted input (case-insensitive, Hindi or English). */
export function isBlockedInput(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_SPELLINGS.some((spelling) => lower.includes(spelling));
}

export const KIT_RULES = {
  /** Products are from input dealers within this distance of the farm (when the farm location is known). */
  radiusKm: 50,
  /** Products shown per medicine name. */
  productsPerItem: 3,
  /** Medicine names taken from one diagnosis. */
  maxItems: 8,
  maxNameLength: 200,
} as const;

/** खाद-बीज-दवाई products that must name their generic (so the kit can match them) and which kind fits. */
export const GENERIC_KIND_BY_PRODUCT: Partial<Record<ProductId, InputKind>> = {
  fungicide: 'fungicide',
  insecticide: 'insecticide',
  fertilizer: 'fertilizer',
  bio_input: 'bio',
};

/** Where an order came from; a referral from the kit goes to the ledger as a separate type. */
export const REFERRALS = ['ai_kit'] as const;
export type Referral = (typeof REFERRALS)[number];

/** Licence number as printed on the dealer's licence (letters, digits, / and -). */
export const LICENCE_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/\- ]{3,39}$/;
