import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { activateLanguage, readStoredLang, storeLang, type AppLang } from '../i18n/lang';
import { hi } from '../strings/hi';
import { LangContext, type LangState } from './langContext';

/** Hindi (default), English or Rajasthani for the whole app (react-i18next). Changing it redraws every screen. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [appLang, setAppLang] = useState<AppLang>(readStoredLang);
  /** The language whose texts are loaded; screens redraw when it changes. Hindi needs no download. */
  const [shownLang, setShownLang] = useState<AppLang>('hi');

  useEffect(() => {
    let current = true;
    activateLanguage(appLang).then(
      () => current && setShownLang(appLang),
      () => undefined, // offline before the texts were ever loaded: stay in Hindi
    );
    return () => {
      current = false;
    };
  }, [appLang]);

  const setLang = useCallback((next: AppLang) => {
    storeLang(next);
    setAppLang(next);
  }, []);

  useEffect(() => {
    // Screen readers and the browser's voice pick the right language (Rajasthani is written in Devanagari).
    document.documentElement.lang = shownLang === 'en' ? 'en' : 'hi';
  }, [shownLang]);

  // hi.market / hi.orders answer in the loaded language (strings/live.ts), so English needs no extra objects here.
  const value = useMemo<LangState>(
    () => ({ lang: shownLang === 'en' ? 'en' : 'hi', appLang, setLang, t: hi.market, tOrders: hi.orders }),
    [shownLang, appLang, setLang],
  );
  // The key redraws all screens in the new language (string objects are read while rendering).
  return (
    <LangContext.Provider value={value}>
      <LangKeyed key={shownLang}>{children}</LangKeyed>
    </LangContext.Provider>
  );
}

function LangKeyed({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
