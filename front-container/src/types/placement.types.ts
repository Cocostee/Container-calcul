// Types du plan de chargement, alignés sur les schémas de l'API.

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

export interface OptimizeContainer {
  name?: string | null
  length_cm: number
  width_cm: number
  height_cm: number
  max_weight_kg: number
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

// Ce qu'un conteneur du projet a finalement chargé.
export interface ContainerLoad {
  container_id: string | null
  position: number
  name: string
  container: OptimizeContainer
  pallet_type_id: string | null
  pallet_label: string
  pallets: GeneratedPallet[]
  placements: Placement[]
  fill_rate_volume: number
  fill_rate_weight: number
  used_weight: number
}

// Le plan de toute l'expédition, conteneur par conteneur.
export interface PlacementResult {
  fill_rate_volume: number
  fill_rate_weight: number
  unplaced_package_count: number
  containers: ContainerLoad[]
}

// Un conteneur de la requête : où les colis ont le droit d'aller.
export interface OptimizeContainerInput {
  id: string | null
  container: OptimizeContainer
  // Absent : le conteneur reçoit des charges déjà montées (plan importé).
  pallet: SelectedPallet | null
}

export interface OptimizeRequest {
  packages: OptimizePaletteInput[]
  containers: OptimizeContainerInput[]
  // Ajoute des copies du dernier conteneur jusqu'à ce que le quai soit vide.
  auto_extend: boolean
}

// --- Recommandations de taille, celles des badges ---------------------------

export interface ContainerSizeAdvice {
  container_type_id: string
  name: string
  containers_needed: number
  fill_rate_volume: number
  // Colis qu'aucun conteneur de cette taille ne prendrait, quel qu'en soit
  // le nombre : trop grands, trop lourds, ou impalettisables.
  unplaced_package_count: number
  recommended: boolean
}

export interface PalletSizeAdvice {
  pallet_type_id: string
  name: string
  pallets_needed: number
  unplaced_package_count: number
  recommended: boolean
}

export interface SizeAdvice {
  containers: ContainerSizeAdvice[]
  pallets: PalletSizeAdvice[]
}
