export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'normal' | 'large';

const BASE =
  'flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 font-bold shadow-sm transition-colors';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-green-700 text-white active:bg-green-800 disabled:bg-gray-400',
  secondary: 'bg-white text-green-800 border-2 border-green-700 active:bg-green-50',
};

const SIZES: Record<ButtonSize, string> = {
  normal: 'min-h-16 text-2xl',
  large: 'min-h-24 text-3xl',
};

/** Shared by <BigButton> and the photo <label>s, which must look like buttons. */
export function bigButtonClasses(variant: ButtonVariant, size: ButtonSize = 'normal'): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`;
}
