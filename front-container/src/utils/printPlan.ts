// Met en forme un plan de chargement pour la fiche imprimable : le detail
// colis par colis n'y a pas sa place, ce qu'on lit sur un bon de livraison
// c'est un type de charge et sa quantite.
import type { PackagePlacement } from '../types/placement.types'

export interface PrintPackageGroup {
  key: string
  label: string
  count: number
  length: number
  width: number
  height: number
}

/**
 * Une ligne par couple (libellé, dimensions) : deux colis de la même
 * commande mais de gabarits différents restent deux lignes distinctes,
 * comme deux références sur un bon de livraison.
 */
export function groupPalletPackages(
  packages: PackagePlacement[],
): PrintPackageGroup[] {
  const groups = new Map<string, PrintPackageGroup>()

  for (const item of packages) {
    const label = item.label?.trim() || item.package_id
    const key = `${label}__${item.length}x${item.width}x${item.height}`
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
      continue
    }
    groups.set(key, {
      key,
      label,
      count: 1,
      length: item.length,
      width: item.width,
      height: item.height,
    })
  }

  return [...groups.values()]
}
