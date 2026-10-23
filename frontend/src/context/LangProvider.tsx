import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { enMarket, enOrders } from '../strings/en';
import { hi } from '../strings/hi';
import { LangContext, type Lang, type LangState } from './langContext';

const STORAGE_KEY = 'agriai.lang';

function readLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'hi';
  } catch {
    return 'hi';
  }
}

/** Hindi / English for the buyer marketplace. Everything else in the app stays Hindi. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not saved: the choice lasts for this visit.
    }
  }, []);

  const value = useMemo<LangState>(
    () => ({ lang, setLang, t: lang === 'en' ? enMarket : hi.market, tOrders: lang === 'en' ? enOrders : hi.orders }),
    [lang, setLang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
