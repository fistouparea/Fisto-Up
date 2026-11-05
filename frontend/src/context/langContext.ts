import { createContext } from 'react';
import type { AppLang } from '../i18n/lang';
import type { MarketText, OrdersText } from '../strings/en';

/** Language of bilingual content (listing titles, product names): Rajasthani screens show the Hindi text. */
export type Lang = 'hi' | 'en';

export interface LangState {
  /** Content language for bilingual data: 'en' only when English is chosen. */
  lang: Lang;
  /** The app language the farmer chose (hi / en / raj). */
  appLang: AppLang;
  setLang: (lang: AppLang) => void;
  /** Buyer marketplace text in the chosen language. */
  t: MarketText;
  /** Order screens in the chosen language. */
  tOrders: OrdersText;
}

export const LangContext = createContext<LangState | null>(null);
