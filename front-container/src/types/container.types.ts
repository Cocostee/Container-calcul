// Types de conteneur partagés, alignés sur les schémas de l'API.

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

// Le choix fait dans le rail : un identifiant de référence, ou des cotes libres.
export interface ContainerConfig {
  container_type_id: string | null
  container_custom_dims: ContainerCustomDims | null
}
