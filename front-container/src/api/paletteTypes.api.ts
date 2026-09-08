// Appels HTTP des formats de palette de référence.
import type { PaletteType } from '../types/palette.types'
import { apiClient } from './client'

export async function getPaletteTypes(): Promise<PaletteType[]> {
  const { data } = await apiClient.get<PaletteType[]>('/palette-types')
  return data
}
