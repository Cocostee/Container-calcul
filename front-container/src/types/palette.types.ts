// Shared palette types, aligned with the API palette schemas.

export interface PaletteType {
  id: string
  name: string
  length_cm: number
  width_cm: number
  height_cm: number
  default_load_height_cm: number
  max_weight_kg: number
}

// A pallet line as returned by the API (persisted, has a UUID).
export interface PaletteInstance {
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

// Payload shape when creating/updating a pallet line (no server id yet).
export type PaletteInstanceInput = Omit<PaletteInstance, 'id'>

// A pallet line while editing locally, tracked by a stable client id.
export interface PaletteDraft extends PaletteInstanceInput {
  clientId: string
  persistedId?: string
}
