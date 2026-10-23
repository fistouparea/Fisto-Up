import { createContext } from 'react';
import type { MarketText } from '../strings/en';

export type Lang = 'hi' | 'en';

export interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Buyer marketplace text in the chosen language. */
  t: MarketText;
}

export const LangContext = createContext<LangState | null>(null);
