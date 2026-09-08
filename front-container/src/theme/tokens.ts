/* ==========================================================================
   IDENTITÉ VISUELLE — « Quai au petit matin »

   Une salle de préparation baignée de lumière froide : fonds gris-bleu très
   clairs, surfaces blanches, et deux couleurs qui se partagent le travail —
   le bleu-pétrole de l'acier peint pour AGIR, l'ambre des grues pour SIGNALER
   l'avancement. Les vues 3D restent le seul endroit sombre de l'écran, comme
   une fenêtre sur la cale.

   ┌────────────────────────────────────────────────────────────────────────┐
   │  TOUT S'AJUSTE DANS LE BLOC « brand » CI-DESSOUS.                      │
   │  Le thème MUI et les variables CSS en sont dérivés — une seule valeur  │
   │  à changer suffit.                                                     │
   │                                                                        │
   │  Couleur d'action     → brand.primary                                  │
   │  Couleur d'avancement → brand.accent                                   │
   │  Police               → brand.fontText (+ le lien dans index.html)     │
   │  Arrondi général      → brand.radiusScale                              │
   │  Thème par défaut     → DEFAULT_COLOR_SCHEME                           │
   └────────────────────────────────────────────────────────────────────────┘
   ========================================================================== */

/** Le thème clair est le défaut ; le sombre s'active par [data-theme="dark"]. */
export const DEFAULT_COLOR_SCHEME = 'light' as const

export const brand = {
  /** Action : boutons primaires, liens, focus. Le bleu de l'acier peint. */
  primary: '#0e5a6b',
  /** Avancement : jalons, jauges, marque. L'ambre des grues. */
  accent: '#c86a08',

  fontText: "'Archivo', 'Segoe UI', system-ui, -apple-system, sans-serif",
  /** Les titres partagent la famille du texte, en largeur étirée. */
  fontDisplay: "'Archivo', 'Segoe UI', system-ui, -apple-system, sans-serif",
  /** Largeur des titres, en % de l'axe wdth d'Archivo (62 → 125). */
  displayWidth: 112,
  displayWeight: 700,

  /** 0.6 = anguleux et technique · 1 = équilibré · 1.6 = doux. */
  radiusScale: 1,
} as const

/* -------------------------------------------------------------------------- */
/*  Échelles communes aux deux thèmes                                         */
/* -------------------------------------------------------------------------- */

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 44,
} as const

/**
 * Un rayon par rôle, mis à l'échelle par brand.radiusScale.
 *
 * `chip` et `control` reprennent l'échelle de CanopUI (radius.xs = 0.5rem et
 * radius.md = 1.375rem) pour que boutons et champs aient la même silhouette
 * que dans les autres applications de la flotte.
 */
export const radius = {
  mark: 3,
  chip: 8,
  control: 22,
  panel: 28,
  shell: 36,
} as const

export const scaledRadius = (key: keyof typeof radius): number =>
  Math.round(radius[key] * brand.radiusScale)

/** Échelle typographique en tierce majeure (×1.25), base 16px. */
export const text = {
  '2xs': '0.6875rem',
  xs: '0.75rem',
  sm: '0.8125rem',
  base: '0.9375rem',
  md: '1.0625rem',
  lg: '1.3125rem',
  xl: 'clamp(1.5rem, 2.4vw, 1.875rem)',
  '2xl': 'clamp(1.875rem, 3.6vw, 2.625rem)',
} as const

export const motion = {
  easeOut: 'cubic-bezier(0.22, 0.68, 0.24, 1)',
  easeSpring: 'cubic-bezier(0.34, 1.42, 0.64, 1)',
  instant: 90,
  fast: 160,
  base: 260,
  slow: 480,
  reveal: 720,
} as const

export const layout = {
  railWidth: 360,
  /** 0 = pas de bride : les panneaux prennent la largeur disponible. */
  contentMax: 0,
  tap: 44,
  measure: '64ch',
  measureNarrow: '48ch',
} as const

/** Points de rupture, alignés sur ceux utilisés par le CSS des pages. */
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 860,
  lg: 1060,
  xl: 1180,
} as const
