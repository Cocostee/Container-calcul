/**
 * Palettes claire et sombre, DÉRIVÉES de `brand`.
 *
 * Rien n'est codé en dur ici à partir des couleurs de marque : chaque variante
 * (survol, texte, aplat) est calculée, et les couleurs qui portent du texte
 * sont assombries ou éclaircies jusqu'à franchir le seuil WCAG. Changer
 * `brand.primary` reste donc sans risque : la conformité suit.
 *
 * Le calcul se fait en JavaScript, pas en CSS : aucune dépendance à
 * `color-mix()`, donc le rendu est identique sur tous les navigateurs.
 */

import { alpha, darken, getContrastRatio, lighten } from '@mui/material/styles'

import { brand } from './tokens'

/** Contraste minimal pour du texte (WCAG 1.4.3 AA). */
const TEXT_AA = 4.5
/** Contraste minimal pour une bordure de contrôle (WCAG 1.4.11). */
const NON_TEXT_AA = 3
/** Pas d'ajustement, et nombre maximal d'itérations avant abandon. */
const STEP = 0.03
const MAX_STEPS = 60

/** Assombrit `color` jusqu'à ce qu'elle contraste assez avec `against`. */
function darkenUntil(color: string, against: string, target: number): string {
  let result = color
  for (let i = 0; i < MAX_STEPS; i += 1) {
    if (getContrastRatio(result, against) >= target) return result
    result = darken(result, STEP)
  }
  return result
}

/** Éclaircit `color` jusqu'à ce qu'elle contraste assez avec `against`. */
function lightenUntil(color: string, against: string, target: number): string {
  let result = color
  for (let i = 0; i < MAX_STEPS; i += 1) {
    if (getContrastRatio(result, against) >= target) return result
    result = lighten(result, STEP)
  }
  return result
}

export interface Palette {
  mode: 'light' | 'dark'
  bg: string
  glow1: string
  glow2: string
  surface: string
  surfaceMuted: string
  surfaceSunken: string
  glass: string
  glassStrong: string
  /** Verre plus léger, pour le bandeau de titre : le contenu doit se deviner
      derrière lui pendant qu'on défile. */
  glassSoft: string
  glassFaint: string
  border: string
  borderStrong: string
  /** Bordure des contrôles : tient le 3:1. Calculée, ne pas figer. */
  borderControl: string
  borderControlHover: string
  sheen: string
  text: string
  textMuted: string
  textFaint: string
  /** Aplats d'action et d'avancement, et l'encre qui va dessus. */
  primary: string
  primaryHover: string
  primarySoft: string
  primaryVeil: string
  primaryLine: string
  /** Variante lisible en TEXTE sur une surface claire. */
  primaryText: string
  onPrimary: string
  accent: string
  accentHover: string
  accentSoft: string
  accentLine: string
  accentText: string
  onAccent: string
  danger: string
  dangerHover: string
  dangerText: string
  dangerSoft: string
  dangerLine: string
  success: string
  successText: string
  successSoft: string
  successLine: string
  warning: string
  viewportTop: string
  viewportBottom: string
  shadowRgb: string
}

export function buildLightPalette(): Palette {
  const surface = '#ffffff'
  const bg = '#eef3f6'
  const sunken = '#eaf0f4'
  const ink = '#0c1e26'

  // Les aplats portent du texte blanc : on les fonce jusqu'au seuil.
  const primary = darkenUntil(brand.primary, '#ffffff', TEXT_AA)
  const accent = darkenUntil(brand.accent, '#ffffff', TEXT_AA)
  const danger = darkenUntil('#d0463a', '#ffffff', TEXT_AA)
  const success = darkenUntil('#16916a', '#ffffff', TEXT_AA)

  // Une encre sombre contraste d'autant MOINS que le fond est sombre : le cas
  // défavorable est donc la surface la plus sombre du thème clair, le creux.
  const borderControl = darkenUntil('#8ba4b1', sunken, NON_TEXT_AA)

  return {
    mode: 'light',
    bg,
    glow1: alpha(brand.accent, 0.07),
    glow2: alpha(brand.primary, 0.07),
    surface,
    surfaceMuted: '#f4f8fa',
    surfaceSunken: sunken,
    glass: alpha(surface, 0.74),
    glassStrong: alpha(surface, 0.9),
    glassSoft: alpha(surface, 0.62),
    glassFaint: alpha(brand.primary, 0.045),
    border: '#d5e2e9',
    borderStrong: '#bccfd9',
    borderControl,
    borderControlHover: darken(borderControl, 0.24),
    sheen: alpha('#ffffff', 0.9),
    text: ink,
    // Même raisonnement pour les encres secondaires : on les mesure contre le
    // creux, le fond le plus sombre sur lequel elles peuvent se poser.
    textMuted: darkenUntil('#5d7d8c', sunken, TEXT_AA),
    textFaint: darkenUntil('#6d8896', sunken, TEXT_AA),
    primary,
    primaryHover: darken(primary, 0.14),
    primarySoft: alpha(primary, 0.1),
    primaryVeil: alpha(primary, 0.05),
    primaryLine: alpha(primary, 0.32),
    primaryText: darkenUntil(primary, sunken, TEXT_AA),
    onPrimary: '#ffffff',
    accent,
    accentHover: darken(accent, 0.12),
    accentSoft: alpha(accent, 0.11),
    accentLine: alpha(accent, 0.34),
    accentText: darkenUntil(accent, sunken, TEXT_AA),
    onAccent: '#ffffff',
    danger,
    dangerHover: darken(danger, 0.14),
    dangerText: darkenUntil(danger, sunken, TEXT_AA),
    dangerSoft: alpha(danger, 0.09),
    dangerLine: alpha(danger, 0.3),
    success,
    successText: darkenUntil(success, sunken, TEXT_AA),
    successSoft: alpha(success, 0.09),
    successLine: alpha(success, 0.3),
    warning: darkenUntil('#b07400', sunken, TEXT_AA),
    // La 3D reste une fenêtre sur la cale, même en plein jour.
    viewportTop: '#123243',
    viewportBottom: '#0a2230',
    shadowRgb: '18, 48, 62',
  }
}

export function buildDarkPalette(): Palette {
  const bg = '#07161f'
  const surface = '#0f2532'
  const sunken = '#0b1e29'
  // Miroir du thème clair : une encre claire contraste d'autant moins que le
  // fond est clair, donc on mesure tout contre la surface la plus haute.
  const lightest = '#153040'

  const primary = lightenUntil(brand.primary, lightest, TEXT_AA)
  const accent = lightenUntil(brand.accent, lightest, TEXT_AA)
  const danger = lightenUntil('#d0463a', lightest, TEXT_AA)
  const success = lightenUntil('#16916a', lightest, TEXT_AA)
  const borderControl = lightenUntil('#3f5b6b', lightest, NON_TEXT_AA)

  return {
    mode: 'dark',
    bg,
    glow1: alpha(accent, 0.09),
    glow2: alpha(primary, 0.07),
    surface,
    surfaceMuted: '#153040',
    surfaceSunken: sunken,
    glass: alpha('#153040', 0.6),
    glassStrong: alpha('#112937', 0.86),
    glassSoft: alpha('#153040', 0.48),
    glassFaint: alpha('#8cbed6', 0.09),
    border: alpha('#a0c8dc', 0.18),
    borderStrong: alpha('#aacde0', 0.3),
    borderControl,
    borderControlHover: lighten(borderControl, 0.24),
    sheen: alpha('#d2eeff', 0.13),
    text: '#e6f0f5',
    textMuted: lightenUntil('#7c99a8', lightest, TEXT_AA),
    textFaint: lightenUntil('#628193', lightest, TEXT_AA),
    primary,
    primaryHover: lighten(primary, 0.16),
    primarySoft: alpha(primary, 0.14),
    primaryVeil: alpha(primary, 0.07),
    primaryLine: alpha(primary, 0.38),
    primaryText: primary,
    // Sur un aplat clair en mode sombre, l'encre redevient foncée.
    onPrimary: '#04212a',
    accent,
    accentHover: lighten(accent, 0.14),
    accentSoft: alpha(accent, 0.14),
    accentLine: alpha(accent, 0.4),
    accentText: accent,
    onAccent: '#2a1602',
    danger,
    dangerHover: lighten(danger, 0.16),
    dangerText: danger,
    dangerSoft: alpha(danger, 0.14),
    dangerLine: alpha(danger, 0.38),
    success,
    successText: success,
    successSoft: alpha(success, 0.14),
    successLine: alpha(success, 0.38),
    warning: lightenUntil('#b07400', lightest, TEXT_AA),
    viewportTop: '#0d2b3a',
    viewportBottom: '#061620',
    shadowRgb: '2, 12, 18',
  }
}

export const palettes = {
  light: buildLightPalette(),
  dark: buildDarkPalette(),
} as const
