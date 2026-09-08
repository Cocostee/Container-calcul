import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr, type Messages } from './fr'
import {
  I18nContext,
  LOCALES,
  type Locale,
  type TranslateParams,
} from './I18nContext'
import { translate } from './translate'

const STORAGE_KEY = 'container-calcul.locale'

const dictionaries: Record<Locale, Messages> = { fr, en, es, de }

function isLocale(value: string | null): value is Locale {
  return LOCALES.includes(value as Locale)
}

/** Choix mémorisé, sinon la langue du navigateur, sinon le français. */
function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Stockage indisponible : on retombe sur le navigateur.
  }
  for (const candidate of navigator.languages ?? [navigator.language]) {
    const base = candidate.split('-')[0]
    if (isLocale(base)) return base
  }
  return 'fr'
}

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  useEffect(() => {
    // La langue du document conditionne la prononciation des lecteurs d'écran
    // et la coupure des mots.
    document.documentElement.lang = locale
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Sans stockage, le choix ne survit pas au rechargement.
    }
  }, [locale])

  const setLocale = useCallback((next: Locale) => setLocaleState(next), [])

  const value = useMemo(() => {
    const messages = dictionaries[locale]
    return {
      locale,
      setLocale,
      messages,
      t: (key: string, params?: TranslateParams) =>
        translate(messages, fr, key, params),
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
