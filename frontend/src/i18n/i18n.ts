import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enMarket, enOrders } from '../strings/en';
import { enApp, enErrors } from '../strings/enApp';
import { setTranslationSource } from '../strings/live';
import { rajApp, rajErrors } from '../strings/raj';

/** hi = Hindi (default and fallback), en = English, raj = Rajasthani (Marwari/Shekhawati, draft). */
export const APP_LANGS = ['hi', 'en', 'raj'] as const;
export type AppLang = (typeof APP_LANGS)[number];

const STORAGE_KEY = 'agriai.lang';

export function readStoredLang(): AppLang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return APP_LANGS.find((lang) => lang === stored) ?? 'hi';
  } catch {
    return 'hi';
  }
}

export function storeLang(lang: AppLang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not saved: the choice lasts for this visit.
  }
}

/** Hindi lives in strings/hi.ts itself (the source), so its bundle stays empty and everything falls back to it. */
void i18next.use(initReactI18next).init({
  resources: {
    hi: { translation: {} },
    en: { translation: { app: { ...enApp, market: enMarket, orders: enOrders }, errors: enErrors } },
    raj: { translation: { app: rajApp, errors: rajErrors } },
  },
  lng: readStoredLang(),
  fallbackLng: 'hi',
  interpolation: { escapeValue: false },
  initAsync: false,
});

setTranslationSource(() => i18next.getResourceBundle(i18next.language, 'translation'));

export { i18next };
