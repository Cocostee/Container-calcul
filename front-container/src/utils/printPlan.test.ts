import { describe, expect, it } from 'vitest'

import type { PackagePlacement } from '../types/placement.types'
import { groupPalletPackages } from './printPlan'

function packagePlacement(
  packageId: string,
  label: string | null,
  dims: [number, number, number] = [40, 30, 30],
): PackagePlacement {
  const [length, width, height] = dims
  return {
    palette_instance_id: 'p1',
    x: 0,
    y: 0,
    z: 0,
    length,
    width,
    height,
    rotation: 0,
    package_id: packageId,
    label,
  }
}

describe('groupPalletPackages', () => {
  it('compte les colis identiques (même libellé, même gabarit) sous une ligne', () => {
    const groups = groupPalletPackages([
      packagePlacement('SO-1-0', 'SO-1'),
      packagePlacement('SO-1-1', 'SO-1'),
      packagePlacement('SO-1-2', 'SO-1'),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ label: 'SO-1', count: 3 })
  })

  it('sépare deux gabarits différents d’une même commande', () => {
    const groups = groupPalletPackages([
      packagePlacement('SO-1-0', 'SO-1', [40, 30, 30]),
      packagePlacement('SO-1-1', 'SO-1', [60, 40, 20]),
    ])

    expect(groups).toHaveLength(2)
    expect(groups.map((g) => g.count)).toEqual([1, 1])
  })

  it('retombe sur l’identifiant technique sans libellé', () => {
    const groups = groupPalletPackages([packagePlacement('pkg-42-0', null)])

    expect(groups[0].label).toBe('pkg-42-0')
  })

  it('ne renvoie rien pour une palette vide', () => {
    expect(groupPalletPackages([])).toEqual([])
  })
})
