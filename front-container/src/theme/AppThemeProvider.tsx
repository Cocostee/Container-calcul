import GlobalStyles from '@mui/material/GlobalStyles'
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { createAppTheme } from './createAppTheme'
import { paletteVariables, staticVariables } from './cssVariables'
import { buildDarkPalette, buildLightPalette } from './palette'
import { ColorSchemeContext, type ColorScheme } from './useColorScheme'
import { DEFAULT_COLOR_SCHEME } from './tokens'

const STORAGE_KEY = 'container-calcul.color-scheme'

const palettes = {
  light: buildLightPalette(),
  dark: buildDarkPalette(),
}

function readStoredScheme(): ColorScheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Navigation privée ou stockage refusé : on garde le thème par défaut.
  }
  return DEFAULT_COLOR_SCHEME
}

interface AppThemeProviderProps {
  children: ReactNode
}

/**
 * Fournit le thème MUI et publie les tokens en variables CSS.
 *
 * `StyledEngineProvider injectFirst` place les styles Emotion AVANT les
 * feuilles importées : sans lui, les classes générées par MUI passeraient
 * après App.css et gagneraient sur la mise en page des pages.
 */
export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const [scheme, setScheme] = useState<ColorScheme>(readStoredScheme)

  const theme = useMemo(() => createAppTheme(palettes[scheme]), [scheme])

  // Le CSS des pages peut cibler le thème courant, et le navigateur adapte
  // ses propres contrôles (barres de défilement, champs natifs).
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = scheme
    root.style.colorScheme = scheme
    try {
      localStorage.setItem(STORAGE_KEY, scheme)
    } catch {
      // Sans stockage, le choix ne survit pas au rechargement : sans gravité.
    }
  }, [scheme])

  const toggle = useCallback(() => {
    setScheme((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  const contextValue = useMemo(
    () => ({ scheme, setScheme, toggle }),
    [scheme, toggle],
  )

  const variables = useMemo(
    () => ({
      ':root': { ...staticVariables(), ...paletteVariables(palettes[scheme]) },
    }),
    [scheme],
  )

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <ColorSchemeContext.Provider value={contextValue}>
          <GlobalStyles styles={variables} />
          {children}
        </ColorSchemeContext.Provider>
      </ThemeProvider>
    </StyledEngineProvider>
  )
}
