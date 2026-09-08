// Types de palette et de colis partagés, alignés sur les schémas de l'API.

export interface PaletteType {
  id: string
  name: string
  length_cm: number
  width_cm: number
  height_cm: number
  default_load_height_cm: number
  max_weight_kg: number
}

// Une ligne de colis telle que l'API la rend : enregistrée, donc avec un UUID.
export interface PackageLine {
  id: string
  palette_type_id: string | null
  label: string
  length_cm: number
  width_cm: number
  height_cm: number
  weight_kg: number
  quantity: number
  stackable: boolean
  rotatable: boolean
}

// Ce qu'on envoie pour créer ou modifier une ligne : pas encore d'identifiant.
export type PackageLineInput = Omit<PackageLine, 'id'>

// A package line while editing locally, tracked by a stable client id.
export interface PackageDraft extends PackageLineInput {
  clientId: string
  persistedId?: string
}
