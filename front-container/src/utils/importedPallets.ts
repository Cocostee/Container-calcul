// Imported projects have no per-package pallet breakdown: the backend packs the
// Excel pallets straight into the container, so the result only carries
// `placements` (pallets in the container) and an empty `pallets` array.
// This helper rebuilds displayable pallets from those placements.
import type { GeneratedPallet, Placement } from '../types/placement.types'

export interface FallbackPallet {
  id: string
  label: string
  weight_kg: number
}

export function palletsFromPlacements(
  placements: Placement[],
  fallbackPallets: FallbackPallet[],
): GeneratedPallet[] {
  return placements.map((placement) => {
    const source = fallbackPallets.find((pallet) =>
      placement.palette_instance_id.startsWith(`imported-${pallet.id}-`),
    )
    const number = placement.palette_instance_id.match(/-(\d+)$/)?.[1]
    return {
      id: placement.palette_instance_id,
      label: source
        ? `${source.label}${number ? ` ${Number(number) + 1}` : ''}`
        : placement.palette_instance_id,
      length: placement.length,
      width: placement.width,
      height: placement.height,
      base_height: 0,
      weight_kg: source?.weight_kg ?? 0,
      package_count: 0,
      fill_rate_volume: 0,
      fill_rate_weight: 0,
      packages: [],
    }
  })
}
