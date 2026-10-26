import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { i18next, readStoredLang, storeLang, type AppLang } from '../i18n/i18n';
import { enMarket, enOrders } from '../strings/en';
import { hi } from '../strings/hi';
import { LangContext, type LangState } from './langContext';

/** Hindi (default), English or Rajasthani for the whole app (react-i18next). Changing it redraws every screen. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [appLang, setAppLang] = useState<AppLang>(readStoredLang);

  const setLang = useCallback((next: AppLang) => {
    void i18next.changeLanguage(next);
    storeLang(next);
    setAppLang(next);
  }, []);

  useEffect(() => {
    // Screen readers and the browser's voice pick the right language (Rajasthani is written in Devanagari).
    document.documentElement.lang = appLang === 'en' ? 'en' : 'hi';
  }, [appLang]);

  const value = useMemo<LangState>(() => {
    const english = appLang === 'en';
    return { lang: english ? 'en' : 'hi', appLang, setLang, t: english ? enMarket : hi.market, tOrders: english ? enOrders : hi.orders };
  }, [appLang, setLang]);
  // The key redraws all screens in the new language (string objects are read while rendering).
  return (
    <LangContext.Provider value={value}>
      <LangKeyed key={appLang}>{children}</LangKeyed>
    </LangContext.Provider>
  );
}

function LangKeyed({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
