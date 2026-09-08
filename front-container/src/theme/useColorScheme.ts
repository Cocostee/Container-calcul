import { createContext, useContext } from 'react'

export type ColorScheme = 'light' | 'dark'

export interface ColorSchemeValue {
  scheme: ColorScheme
  setScheme: (scheme: ColorScheme) => void
  toggle: () => void
}

export const ColorSchemeContext = createContext<ColorSchemeValue | null>(null)

/** Thème courant et bascule clair/sombre. */
export function useColorScheme(): ColorSchemeValue {
  const value = useContext(ColorSchemeContext)
  if (!value) {
    throw new Error('useColorScheme doit être utilisé dans AppThemeProvider.')
  }
  return value
}
