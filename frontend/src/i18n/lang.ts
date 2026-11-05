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

/**
 * Switches the app language. Hindi is built in (strings/hi.ts is the source), so most farmers never download
 * i18next or the other translations: they load (i18n/i18n.ts) only when English or Rajasthani is chosen.
 */
export async function activateLanguage(lang: AppLang): Promise<void> {
  if (lang === 'hi' && !loaded) return;
  const i18n = await import('./i18n');
  loaded = true;
  await i18n.activate(lang);
}

let loaded = false;
