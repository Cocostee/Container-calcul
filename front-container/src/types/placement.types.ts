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
  pallets: GeneratedPallet[]
  unplaced_package_count: number
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

export interface SelectedPallet {
  id: string
  label: string
  length_cm: number
  width_cm: number
  base_height_cm: number
  max_load_height_cm: number
  max_weight_kg: number
}

export interface PackagePlacement extends Placement {
  package_id: string
}

export interface GeneratedPallet {
  id: string
  label: string
  length: number
  width: number
  height: number
  base_height: number
  weight_kg: number
  package_count: number
  fill_rate_volume: number
  fill_rate_weight: number
  packages: PackagePlacement[]
}

export interface OptimizeRequest {
  container: OptimizeContainer
  pallet: SelectedPallet
  packages: OptimizePaletteInput[]
}
