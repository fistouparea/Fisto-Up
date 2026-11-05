import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enMarket, enOrders } from '../strings/en';
import { enApp, enErrors } from '../strings/enApp';
import { setTranslationSource } from '../strings/live';
import { rajApp, rajErrors } from '../strings/raj';
import type { AppLang } from './lang';

/**
 * react-i18next with the English and Rajasthani resources. Hindi lives in strings/hi.ts itself (the source),
 * so its bundle stays empty and every missing text falls back to it. Loaded on demand (i18n/lang.ts).
 */
const ready = i18next.use(initReactI18next).init({
  resources: {
    hi: { translation: {} },
    en: { translation: { app: { ...enApp, market: enMarket, orders: enOrders }, errors: enErrors } },
    raj: { translation: { app: rajApp, errors: rajErrors } },
  },
  lng: 'hi',
  fallbackLng: 'hi',
  interpolation: { escapeValue: false },
  initAsync: false,
});

setTranslationSource(() => i18next.getResourceBundle(i18next.language, 'translation'));

export async function activate(lang: AppLang): Promise<void> {
  await ready;
  await i18next.changeLanguage(lang);
}

export { i18next };
