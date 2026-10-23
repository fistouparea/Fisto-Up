const rupeeFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** 250000 paise → "₹2,500"; 2550 → "₹25.5". Money is always integer paise in the app. */
export function formatRupees(paise: number): string {
  return `₹${rupeeFormatter.format(paise / 100)}`;
}

/** "2500", "2,500", "25.50" → paise; null for anything that is not a positive amount. */
export function rupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const paise = Math.round(Number(cleaned) * 100);
  return paise > 0 ? paise : null;
}

/** For number inputs: 250000 → "2500", 2550 → "25.5". */
export function paiseToRupeesInput(paise: number | null): string {
  return paise === null ? '' : String(paise / 100);
}

/** Order value: quantity × price per unit, both integers, so no rounding happens. */
export function totalPaise(quantity: number, pricePerUnitPaise: number): number {
  return quantity * pricePerUnitPaise;
}
