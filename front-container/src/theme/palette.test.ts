import { getContrastRatio } from '@mui/material/styles'
import { describe, expect, it } from 'vitest'

import { buildDarkPalette, buildLightPalette, type Palette } from './palette'

/**
 * Les couleurs sont dérivées d'une seule teinte de marque, et non écrites à
 * la main : le seul moyen de garantir la lisibilité est donc de la mesurer.
 *
 * Les seuils viennent du WCAG 2.1 : 4,5:1 pour du texte courant, 3:1 pour un
 * grand titre ou un élément non textuel (trait, jauge). Chaque encre est
 * mesurée contre la surface la **plus sombre** sur laquelle elle peut
 * tomber — un contraste calculé sur le fond le plus clair passerait le test
 * en laissant le cas réel illisible.
 */

const TEXTE = 4.5
const NON_TEXTE = 3

/** Le pire fond du thème pour une encre : celui qui contraste le moins. */
function pireFond(p: Palette, ink: string): { color: string; ratio: number } {
  const fonds = [p.bg, p.surface, p.surfaceMuted, p.surfaceSunken]
  return fonds
    .map((color) => ({ color, ratio: getContrastRatio(ink, color) }))
    .reduce((worst, candidate) =>
      candidate.ratio < worst.ratio ? candidate : worst,
    )
}

const THEMES: [string, Palette][] = [
  ['clair', buildLightPalette()],
  ['sombre', buildDarkPalette()],
]

describe.each(THEMES)('palette %s', (_nom, p) => {
  describe('les encres de texte', () => {
    it.each([
      ['text', 'text'],
      ['textMuted', 'textMuted'],
      ['primaryText', 'primaryText'],
      ['accentText', 'accentText'],
      ['dangerText', 'dangerText'],
      ['successText', 'successText'],
    ] as const)('%s reste lisible sur toutes les surfaces', (_label, key) => {
      const ink = p[key] as string
      const { color, ratio } = pireFond(p, ink)

      expect(ratio, `${ink} sur ${color}`).toBeGreaterThanOrEqual(TEXTE)
    })

    it('textFaint tient lui aussi le seuil du texte', () => {
      // Une mention discrète reste du texte : la palette lui garantit 4,5:1,
      // le test l'exige donc — pas le seuil moindre des éléments non textuels.
      const { color, ratio } = pireFond(p, p.textFaint)

      expect(ratio, `${p.textFaint} sur ${color}`).toBeGreaterThanOrEqual(
        TEXTE,
      )
    })
  })

  describe('les aplats de couleur', () => {
    it.each([
      ['primary / onPrimary', 'primary', 'onPrimary'],
      ['accent / onAccent', 'accent', 'onAccent'],
    ] as const)('%s se lisent l’un sur l’autre', (_label, fond, ink) => {
      const ratio = getContrastRatio(p[ink] as string, p[fond] as string)

      expect(ratio).toBeGreaterThanOrEqual(TEXTE)
    })
  })

  describe('les traits', () => {
    it('borderControl se distingue du fond', () => {
      // Le contour d'un champ est un élément non textuel : 3:1 suffit, mais
      // il est exigible — un trait invisible n'encadre rien.
      const { color, ratio } = pireFond(p, p.borderControl)

      expect(ratio, `${p.borderControl} sur ${color}`).toBeGreaterThanOrEqual(
        NON_TEXTE,
      )
    })
  })

  it('déclare une couleur pour chaque rôle', () => {
    for (const [role, value] of Object.entries(p)) {
      if (role === 'mode') continue
      expect(typeof value, `rôle ${role}`).toBe('string')
      expect(String(value).length, `rôle ${role}`).toBeGreaterThan(0)
    }
  })
})

describe('les deux thèmes', () => {
  it('déclarent exactement les mêmes rôles', () => {
    const clair = Object.keys(buildLightPalette()).sort()
    const sombre = Object.keys(buildDarkPalette()).sort()

    expect(sombre).toEqual(clair)
  })

  it('se distinguent par leur mode', () => {
    expect(buildLightPalette().mode).toBe('light')
    expect(buildDarkPalette().mode).toBe('dark')
  })
})
