// Une couleur stable par groupe de palettes, tirée de son identifiant.
import { PALETTE_COLORS } from './constants'

// Un colis éclaté porte un identifiant du genre « p1-0 » : on retire l'indice
// final pour que tout le groupe partage la même couleur.
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
