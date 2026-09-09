import { describe, expect, it } from 'vitest'

import type { PackagePlacement } from '../types/placement.types'
import { assignPackageColors, packageColorKey } from './colorByPaletteType'
import { buildPackageLegend } from './packageLegend'

/**
 * La légende doit correspondre exactement à ce que la scène peint : même
 * regroupement (voir `packageColorKey`), et jamais deux groupes sous la
 * même couleur — d'où l'attribution partagée en amont des deux tests.
 */

function packagePlacement(
  packageId: string,
  label: string | null,
): PackagePlacement {
  return {
    palette_instance_id: 'p1',
    x: 0,
    y: 0,
    z: 0,
    length: 10,
    width: 10,
    height: 10,
    rotation: 0,
    package_id: packageId,
    label,
  }
}

describe('buildPackageLegend', () => {
  it('regroupe les colis éclatés de la même ligne sous une seule entrée', () => {
    const packages = [
      packagePlacement('CMD-1-0', 'CMD-1'),
      packagePlacement('CMD-1-1', 'CMD-1'),
      packagePlacement('CMD-1-2', 'CMD-1'),
    ]
    const legend = buildPackageLegend(packages, assignPackageColors(packages))

    expect(legend).toHaveLength(1)
    expect(legend[0].label).toBe('CMD-1')
  })

  it('garde une entrée par ligne distincte, dans l’ordre de première apparition', () => {
    const packages = [
      packagePlacement('CMD-2-0', 'CMD-2'),
      packagePlacement('CMD-1-0', 'CMD-1'),
      packagePlacement('CMD-2-1', 'CMD-2'),
    ]
    const legend = buildPackageLegend(packages, assignPackageColors(packages))

    expect(legend.map((entry) => entry.label)).toEqual(['CMD-2', 'CMD-1'])
  })

  it('donne à deux commandes distinctes deux couleurs distinctes', () => {
    const packages = [
      packagePlacement('CMD-1-0', 'CMD-1'),
      packagePlacement('CMD-2-0', 'CMD-2'),
      packagePlacement('CMD-3-0', 'CMD-3'),
    ]
    const legend = buildPackageLegend(packages, assignPackageColors(packages))

    const colors = legend.map((entry) => entry.color)
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('ne partage jamais une couleur entre commandes même au-delà de la palette éditoriale', () => {
    // Volontairement plus que les 8 couleurs de base : c'est là que ferait
    // collision un simple hachage.
    const packages = Array.from({ length: 20 }, (_, index) =>
      packagePlacement(`CMD-${index}-0`, `CMD-${index}`),
    )
    const legend = buildPackageLegend(packages, assignPackageColors(packages))

    const colors = legend.map((entry) => entry.color)
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('regroupe deux lignes distinctes d’une même commande sous une seule couleur', () => {
    // Une commande peut avoir plusieurs lignes (formats différents) : elles
    // doivent rester assorties, pas dispersées sur des couleurs au hasard.
    const packages = [
      packagePlacement('line-a-0', 'SO-100'),
      packagePlacement('line-b-0', 'SO-100'),
      packagePlacement('line-c-0', 'SO-200'),
    ]
    const colors = assignPackageColors(packages)

    expect(colors.get(packageColorKey(packages[0]))).toBe(
      colors.get(packageColorKey(packages[1])),
    )
    expect(colors.get(packageColorKey(packages[0]))).not.toBe(
      colors.get(packageColorKey(packages[2])),
    )
  })

  it('rend le label absent ou vide comme `null`, sans planter', () => {
    const packages = [
      packagePlacement('unk-0', null),
      packagePlacement('blank-0', '   '),
    ]
    const legend = buildPackageLegend(packages, assignPackageColors(packages))

    expect(legend.map((entry) => entry.label)).toEqual([null, null])
  })

  it('plafonne le nombre d’entrées pour rester lisible', () => {
    const packages = Array.from({ length: 20 }, (_, index) =>
      packagePlacement(`CMD-${index}-0`, `CMD-${index}`),
    )
    const legend = buildPackageLegend(packages, assignPackageColors(packages))

    expect(legend).toHaveLength(12)
  })

  it('ne renvoie rien pour un lot vide', () => {
    expect(buildPackageLegend([], new Map())).toEqual([])
  })
})
