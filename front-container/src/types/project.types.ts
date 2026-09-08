// Types de projet partagés, alignés sur les schémas de l'API.
import type { ContainerCustomDims } from './container.types'
import type { PackageLine, PackageLineInput } from './palette.types'
import type { PlacementResult } from './placement.types'

// L'entrée allégée qui suffit à la liste des projets.
export interface ProjectSummary {
  id: string
  name: string
  created_at: string
  updated_at: string
}

// Un conteneur du projet : sa taille et le format de palette qu'il emploie.
export interface ProjectContainer {
  id: string
  position: number
  container_type_id: string | null
  container_custom_dims: ContainerCustomDims | null
  pallet_type_id: string | null
}

export type ProjectContainerInput = Omit<ProjectContainer, 'id' | 'position'>

// A container while editing locally, tracked by a stable client id.
export interface ContainerDraft extends ProjectContainerInput {
  clientId: string
  persistedId?: string
}

// Full project detail returned by GET /projects/{id}.
export interface Project {
  id: string
  name: string
  created_at: string
  updated_at: string
  packages: PackageLine[]
  containers: ProjectContainer[]
  last_result: PlacementResult | null
}

// Ce qu'on envoie à POST et PUT /projects.
export interface ProjectPayload {
  name: string
  packages: PackageLineInput[]
  containers: ProjectContainerInput[]
}
