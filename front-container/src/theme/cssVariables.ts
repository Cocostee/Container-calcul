/**
 * Publie les tokens du thème en variables CSS, pour que le CSS des pages
 * (App.css) et le thème MUI parlent des mêmes valeurs.
 *
 * Les couleurs sont calculées en JavaScript (voir palette.ts), donc les
 * variables contiennent des couleurs déjà résolues : aucun `color-mix()` ni
 * `hsl()` calculé côté navigateur, et un rendu identique partout.
 */

import type { CSSObject } from '@mui/material/styles'

import { buildShadows, radii } from './createAppTheme'
import type { Palette } from './palette'
import { SURFACE_BORDER_WIDTH } from './surface'
import { brand, layout, motion, space, text } from './tokens'

/** camelCase → --kebab-case */
const varName = (key: string) =>
  `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`

/** Variables qui changent avec le thème : couleurs et ombres. */
export function paletteVariables(p: Palette): CSSObject {
  const shadows = buildShadows(p)
  const vars: CSSObject = {}

  for (const [key, value] of Object.entries(p)) {
    if (key === 'mode' || typeof value !== 'string') continue
    vars[varName(key)] = value
  }

  vars['--shadow-sm'] = shadows.sm
  vars['--shadow-md'] = shadows.md
  vars['--shadow-lg'] = shadows.lg

  // Noms d'usage attendus par le CSS des pages.
  vars['--color-bg'] = p.bg
  vars['--color-surface'] = p.surface
  vars['--color-border'] = p.border
  vars['--color-text'] = p.text
  vars['--color-muted'] = p.textMuted
  vars['--color-faint'] = p.textFaint
  vars['--color-primary'] = p.primary
  vars['--color-on-primary'] = p.onPrimary
  vars['--color-accent'] = p.accent
  vars['--color-danger'] = p.danger
  vars['--color-focus'] = p.primary

  return vars
}

/** Variables stables : rythme, formes, typographie, mouvement. */
export function staticVariables(): CSSObject {
  return {
    '--space-1': `${space[1]}px`,
    '--space-2': `${space[2]}px`,
    '--space-3': `${space[3]}px`,
    '--space-4': `${space[4]}px`,
    '--space-5': `${space[5]}px`,
    '--space-6': `${space[6]}px`,
    '--space-7': `${space[7]}px`,

    '--radius-mark': radii.mark,
    '--radius-chip': radii.chip,
    '--radius-control': radii.control,
    '--radius-panel': radii.panel,
    '--radius-shell': radii.shell,
    '--radius-pill': '999px',

    '--text-2xs': text['2xs'],
    '--text-xs': text.xs,
    '--text-sm': text.sm,
    '--text-base': text.base,
    '--text-md': text.md,
    '--text-lg': text.lg,
    '--text-xl': text.xl,
    '--text-2xl': text['2xl'],

    '--leading-tight': '1.08',
    '--leading-snug': '1.28',
    '--leading-body': '1.58',

    '--font-family-text': brand.fontText,
    '--font-family-display': brand.fontDisplay,
    '--font-display-width': `${brand.displayWidth}%`,
    '--font-display-weight': `${brand.displayWeight}`,

    '--ease-out': motion.easeOut,
    '--ease-spring': motion.easeSpring,
    '--dur-instant': `${motion.instant}ms`,
    '--dur-fast': `${motion.fast}ms`,
    '--dur-base': `${motion.base}ms`,
    '--dur-slow': `${motion.slow}ms`,
    '--dur-reveal': `${motion.reveal}ms`,

    '--rail-width': `${layout.railWidth}px`,
    '--content-max':
      layout.contentMax > 0 ? `${layout.contentMax}px` : '100%',
    '--tap': `${layout.tap}px`,
    /**
     * Hauteur d'une rangée de contrôles (barre de titre, barre d'accueil).
     * C'est la même valeur que le `minHeight` que le thème donne aux boutons
     * et aux champs : une rangée plus basse laisserait les deux règles se
     * contredire, et les contrôles se décaleraient de la différence.
     */
    '--control-row': `${layout.tap}px`,
    '--measure': layout.measure,
    '--measure-narrow': layout.measureNarrow,

    /** Flou du verre. Mettre 0px pour des surfaces opaques. */
    '--glass-blur': '14px',

    /** Épaisseur du trait des surfaces bordées. */
    '--border-width': SURFACE_BORDER_WIDTH,
  }
}
