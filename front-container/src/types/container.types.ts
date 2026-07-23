// Shared container types, aligned with the API container schemas.

export interface ContainerType {
  id: string
  name: string
  length_cm: number
  width_cm: number
  height_cm: number
  max_weight_kg: number
}

export interface ContainerCustomDims {
  length_cm: number
  width_cm: number
  height_cm: number
  max_weight_kg: number
}

// Selection made in the sidebar: either a reference type id or custom dims.
export interface ContainerConfig {
  container_type_id: string | null
  container_custom_dims: ContainerCustomDims | null
}
