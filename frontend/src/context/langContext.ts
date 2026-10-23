import { createContext } from 'react';
import type { MarketText, OrdersText } from '../strings/en';

export type Lang = 'hi' | 'en';

export interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Buyer marketplace text in the chosen language. */
  t: MarketText;
  /** Order screens in the chosen language (buyers only; sellers see Hindi). */
  tOrders: OrdersText;
}

export const LangContext = createContext<LangState | null>(null);
