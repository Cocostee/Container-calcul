import { createContext, useContext } from 'react'

import type { Messages } from './fr'

export const LOCALES = ['fr', 'en', 'es', 'de'] as const

export type Locale = (typeof LOCALES)[number]

/** Intitulés des langues, chacun écrit dans sa propre langue. */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
}

export type TranslateParams = Record<string, string | number>

export interface I18nValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  messages: Messages
  /**
   * Traduit une clé. `count` sélectionne la forme plurielle quand la clé
   * existe en deux variantes (`_one` / `_other`), et toute valeur passée
   * remplace le marqueur `{nom}` correspondant.
   */
  t: (key: string, params?: TranslateParams) => string
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useTranslation(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error('useTranslation doit être utilisé dans I18nProvider.')
  }
  return value
}
