import { createContext, useContext } from 'react';
import type { Lang, Params } from './i18n.ts';
import { translate } from './i18n.ts';

export interface I18n {
  readonly lang: Lang;
  readonly t: (key: string, params?: Params) => string;
}

export const I18nContext = createContext<I18n>({ lang: 'en', t: (key, params) => translate('en', key, params) });

export const useI18n = (): I18n => useContext(I18nContext);
