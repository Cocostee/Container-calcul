// Attribution de couleurs par groupe, tirée de son identifiant.
import type { PackagePlacement } from '../types/placement.types'
import { PALETTE_COLORS } from './constants'

// Un colis éclaté porte un identifiant du genre « p1-0 » : on retire l'indice
// final pour que tout le groupe partage la même couleur.
export function paletteGroupKey(paletteInstanceId: string): string {
  return paletteInstanceId.replace(/-\d+$/, '')
}

// Couleur d'appoint pour un identifiant isolé (ex. l'accent d'une palette au
// survol) : pas de garantie d'unicité, mais stable pour une même clé.
export function colorByPaletteType(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % PALETTE_COLORS.length
  return PALETTE_COLORS[index]
}

/**
 * La clé de regroupement d'un colis pour sa couleur : son libellé d'origine
 * quand il existe, pour que toutes les lignes d'une même commande partagent
 * la couleur même réparties sur plusieurs palettes. À défaut, la ligne
 * technique qui l'a produit — deux colis éclatés de la même ligne restent
 * ainsi assortis même sans libellé.
 */
export function packageColorKey(item: PackagePlacement): string {
  const label = item.label?.trim()
  return label ? label : paletteGroupKey(item.package_id)
}

// Au-delà de la palette éditoriale, les teintes suivantes tournent par pas
// d'angle doré : deux index distincts ne retombent jamais sur la même teinte,
// ce qui garantit qu'aucun groupe ne partage sa couleur avec un autre tant
// qu'ils restent sur des index différents.
const GOLDEN_ANGLE_DEG = 137.508

function colorForIndex(index: number): string {
  if (index < PALETTE_COLORS.length) return PALETTE_COLORS[index]
  const hue = (index * GOLDEN_ANGLE_DEG) % 360
  return `hsl(${hue.toFixed(1)}deg 68% 62%)`
}

/**
 * Attribue une couleur à chaque groupe de colis rencontré (voir
 * `packageColorKey`), une par une dans l'ordre de première apparition —
 * jamais deux groupes différents sous la même couleur, contrairement à un
 * hachage qui peut faire coïncider deux commandes par accident.
 *
 * Calculée une seule fois pour l'ensemble des colis visibles et partagée par
 * la scène 3D et sa légende : elles doivent toujours s'accorder.
 */
export function assignPackageColors(
  packages: PackagePlacement[],
): Map<string, string> {
  const colors = new Map<string, string>()
  for (const item of packages) {
    const key = packageColorKey(item)
    if (colors.has(key)) continue
    colors.set(key, colorForIndex(colors.size))
  }
  return colors
}
