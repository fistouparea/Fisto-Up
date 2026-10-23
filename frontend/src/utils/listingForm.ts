import type { ListingDraft, NewListing, ProductId, Unit } from '../api/marketTypes';
import { PRODUCT_CATALOG } from '../data/marketCatalog';
import { hi, productLabels } from '../strings/hi';
import { paiseToRupeesInput, rupeesToPaise } from './money';

/** The Snap & List confirmation form, as the seller edits it. */
export interface ListingForm {
  product: ProductId | null;
  unit: Unit | null;
  quantity: number | null;
  priceInput: string;
  minOrderQty: number;
  fssai: string;
  titleHi: string;
  titleEn: string;
  descriptionHi: string;
  descriptionEn: string;
  qualityNotes: string;
}

export type ListingFormField = 'product' | 'unit' | 'quantity' | 'price' | 'title' | 'minOrder' | 'fssai';

export function formFromDraft(draft: ListingDraft | null): ListingForm {
  return {
    product: draft?.product ?? null,
    unit: draft?.unit ?? null,
    quantity: draft?.quantity ?? null,
    priceInput: paiseToRupeesInput(draft?.pricePerUnitPaise ?? null),
    minOrderQty: 1,
    fssai: '',
    titleHi: draft?.title.hi ?? '',
    titleEn: draft?.title.en ?? '',
    descriptionHi: draft?.description.hi ?? '',
    descriptionEn: draft?.description.en ?? '',
    qualityNotes: draft?.qualityNotes ?? '',
  };
}

/** A new product needs a unit it allows, and the AI's title was about the old product. */
export function changeProduct(form: ListingForm, product: ProductId): ListingForm {
  if (form.product === product) return form;
  const { units } = PRODUCT_CATALOG[product];
  return {
    ...form,
    product,
    unit: form.unit && units.includes(form.unit) ? form.unit : (units[0] ?? null),
    titleHi: productLabels[product].hi,
    titleEn: productLabels[product].en,
    descriptionHi: '',
    descriptionEn: '',
  };
}

/** Returns what is missing (Hindi messages) or the listing to save. */
export function validateListingForm(
  form: ListingForm,
  photoIds: string[],
): { errors: Partial<Record<ListingFormField, string>>; listing: NewListing | null } {
  const errors: Partial<Record<ListingFormField, string>> = {};
  const price = rupeesToPaise(form.priceInput);
  const fssai = form.fssai.trim();

  if (!form.product) errors.product = hi.sell.missing.product;
  if (!form.unit) errors.unit = hi.sell.missing.unit;
  if (!form.quantity || form.quantity < 1) errors.quantity = hi.sell.missing.quantity;
  if (price === null) errors.price = hi.sell.missing.price;
  if (form.titleHi.trim().length < 2) errors.title = hi.sell.missing.title;
  if (form.quantity && form.minOrderQty > form.quantity) errors.minOrder = hi.sell.missing.minOrder;
  if (fssai && !/^\d{14}$/.test(fssai)) errors.fssai = hi.sell.fssaiInvalid;

  if (Object.keys(errors).length > 0 || !form.product || !form.unit || !form.quantity || price === null) {
    return { errors, listing: null };
  }
  const { category, food } = PRODUCT_CATALOG[form.product];
  return {
    errors,
    listing: {
      category,
      product: form.product,
      unit: form.unit,
      quantity: form.quantity,
      pricePerUnitPaise: price,
      minOrderQty: form.minOrderQty,
      title: { hi: form.titleHi.trim(), en: form.titleEn.trim() },
      description: { hi: form.descriptionHi.trim(), en: form.descriptionEn.trim() },
      qualityNotes: form.qualityNotes.trim(),
      photoIds,
      ...(food && fssai && { fssaiNumber: fssai }),
    },
  };
}
