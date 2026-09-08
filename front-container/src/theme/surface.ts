/**
 * Surfaces bordées : fond, trait et arrondi, en une déclaration.
 *
 * Les coins sont de simples arcs de cercle portés par `border-radius`. Un
 * essai en squircle (superellipse découpée en `clip-path`) a été retiré : la
 * silhouette obligeait à porter le fond et la bordure sur deux pseudo-éléments
 * sous le contenu, et l'ombre à passer en `drop-shadow` — beaucoup de
 * machinerie pour un rendu qui ne valait pas la peine.
 */

import type { CSSObject } from '@mui/material/styles'

/** Épaisseur du trait des surfaces bordées. */
export const SURFACE_BORDER_WIDTH = '1px'

export interface SurfaceOptions {
  radius: string
  background: string
  borderColor?: string
  borderWidth?: string
  /** Ombre en syntaxe box-shadow. */
  shadow?: string
}

/**
 * Style complet d'une surface : fond, bordure optionnelle, arrondi et ombre.
 * À étaler dans un `sx` ou un `styleOverrides`.
 */
export function surface({
  radius,
  background,
  borderColor,
  borderWidth = SURFACE_BORDER_WIDTH,
  shadow,
}: SurfaceOptions): CSSObject {
  return {
    backgroundColor: background,
    borderRadius: radius,
    border: borderColor ? `${borderWidth} solid ${borderColor}` : 0,
    ...(shadow ? { boxShadow: shadow } : null),
  }
}
