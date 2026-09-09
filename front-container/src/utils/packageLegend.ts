// Regroupe les colis visibles par leur ligne d'origine, pour la légende de
// couleurs de la vue 3D. Une seule fonction pure : la scène et la légende
// doivent toujours s'accorder sur qui appartient à quel groupe et quelle
// couleur — d'où l'attribution `colors` reçue en paramètre plutôt que
// recalculée ici, pour ne jamais diverger de ce que la scène a peint.
import type { PackagePlacement } from '../types/placement.types'
import { packageColorKey } from './colorByPaletteType'

export interface PackageLegendEntry {
  key: string
  color: string
  /** Le libellé de la ligne d'origine, ou `null` s'il n'a pas voyagé jusqu'ici. */
  label: string | null
}

// Au-delà, la légende cesserait d'être lisible : elle garde les premiers
// groupes rencontrés et laisse les autres colis sans entrée dédiée.
const MAX_LEGEND_ENTRIES = 12

/**
 * Une entrée par groupe de colis (même couleur dans la scène : même libellé
 * d'origine, ou à défaut même ligne technique), dans l'ordre de première
 * apparition — stable d'un rendu à l'autre tant que le plan ne change pas.
 */
export function buildPackageLegend(
  packages: PackagePlacement[],
  colors: Map<string, string>,
): PackageLegendEntry[] {
  const seen = new Map<string, PackageLegendEntry>()

  for (const item of packages) {
    const key = packageColorKey(item)
    if (seen.has(key)) continue
    const label = item.label?.trim()
    const color = colors.get(key)
    if (!color) continue
    seen.set(key, { key, color, label: label ? label : null })
  }

  return [...seen.values()].slice(0, MAX_LEGEND_ENTRIES)
}
