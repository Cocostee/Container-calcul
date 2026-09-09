import { describe, expect, it } from 'vitest'

import type { PackagePlacement } from '../types/placement.types'
import {
  assignPackageColors,
  packageColorKey,
  paletteGroupKey,
} from './colorByPaletteType'

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

describe('paletteGroupKey', () => {
  it('retire uniquement l’indice final d’un identifiant éclaté', () => {
    expect(paletteGroupKey('p1-0')).toBe('p1')
    expect(paletteGroupKey('p1-12')).toBe('p1')
  })

  it('ne coupe pas les tirets d’un UUID, seul l’indice final compte', () => {
    expect(paletteGroupKey('abf3a4af-0145-478a-8e01-ec8de4960e39-0')).toBe(
      'abf3a4af-0145-478a-8e01-ec8de4960e39',
    )
  })
})

describe('packageColorKey', () => {
  it('regroupe par libellé quand il existe', () => {
    const item = packagePlacement('line-a-0', 'SO-100')
    expect(packageColorKey(item)).toBe('SO-100')
  })

  it('retombe sur la ligne technique à défaut de libellé', () => {
    const item = packagePlacement('line-a-0', null)
    expect(packageColorKey(item)).toBe('line-a')
  })

  it('ignore un libellé vide ou fait uniquement d’espaces', () => {
    const item = packagePlacement('line-a-0', '   ')
    expect(packageColorKey(item)).toBe('line-a')
  })
})

describe('assignPackageColors', () => {
  it('donne la même couleur à deux colis du même groupe', () => {
    const packages = [
      packagePlacement('SO-1-0', 'SO-1'),
      packagePlacement('SO-1-1', 'SO-1'),
    ]
    const colors = assignPackageColors(packages)
    expect(colors.get('SO-1')).toBeDefined()
    expect(colors.size).toBe(1)
  })

  it('ne partage jamais une couleur entre deux groupes, même nombreux', () => {
    const packages = Array.from({ length: 50 }, (_, index) =>
      packagePlacement(`SO-${index}-0`, `SO-${index}`),
    )
    const colors = assignPackageColors(packages)
    const distinctColors = new Set(colors.values())
    expect(distinctColors.size).toBe(colors.size)
    expect(colors.size).toBe(50)
  })

  it('est stable : le même lot redonne la même attribution', () => {
    const packages = [
      packagePlacement('SO-2-0', 'SO-2'),
      packagePlacement('SO-1-0', 'SO-1'),
    ]
    const first = assignPackageColors(packages)
    const second = assignPackageColors(packages)
    expect([...first.entries()]).toEqual([...second.entries()])
  })
})
