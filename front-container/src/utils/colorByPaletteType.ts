// Deterministic colour for a pallet group, based on its instance id.
import { PALETTE_COLORS } from './constants'

// Exploded item ids look like "p1-0"; strip the trailing index so every item
// of the same pallet group shares a colour.
function groupKey(paletteInstanceId: string): string {
  return paletteInstanceId.replace(/-\d+$/, '')
}

export function colorByPaletteType(paletteInstanceId: string): string {
  const key = groupKey(paletteInstanceId)
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % PALETTE_COLORS.length
  return PALETTE_COLORS[index]
}
