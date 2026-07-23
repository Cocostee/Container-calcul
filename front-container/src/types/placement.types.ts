// Optimization request/response types, aligned with the API placement schemas.

export interface Placement {
  palette_instance_id: string
  x: number
  y: number
  z: number
  length: number
  width: number
  height: number
  rotation: number
}

export interface PlacementResult {
  fill_rate_volume: number
  fill_rate_weight: number
  unplaced_count: number
  placements: Placement[]
}

export interface OptimizeContainer {
  length_cm: number
  width_cm: number
  height_cm: number
  max_weight_kg: number
}

export interface OptimizePaletteInput {
  instance_id: string
  length_cm: number
  width_cm: number
  height_cm: number
  weight_kg: number
  quantity: number
  stackable: boolean
  rotatable: boolean
}

export interface OptimizeRequest {
  container: OptimizeContainer
  palettes: OptimizePaletteInput[]
}
