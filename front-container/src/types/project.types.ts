// Shared project types, aligned with the API project schemas.
import type { ContainerCustomDims } from './container.types'
import type { PaletteInstance, PaletteInstanceInput } from './palette.types'
import type { PlacementResult } from './placement.types'

// Lightweight entry for the sidebar project list.
export interface ProjectSummary {
  id: string
  name: string
  created_at: string
  updated_at: string
}

// Full project detail returned by GET /projects/{id}.
export interface Project {
  id: string
  name: string
  created_at: string
  updated_at: string
  container_type_id: string | null
  pallet_type_id: string | null
  container_custom_dims: ContainerCustomDims | null
  palettes: PaletteInstance[]
  last_result: PlacementResult | null
}

// Payload for POST/PUT /projects.
export interface ProjectPayload {
  name: string
  container_type_id: string | null
  pallet_type_id: string | null
  container_custom_dims: ContainerCustomDims | null
  palettes: PaletteInstanceInput[]
}
