// Appels HTTP des projets, des plans de chargement et des recommandations.
import type {
  OptimizePaletteInput,
  OptimizeRequest,
  PlacementResult,
  SizeAdvice,
} from '../types/placement.types'
import type {
  Project,
  ProjectPayload,
  ProjectSummary,
} from '../types/project.types'
import { apiClient } from './client'

export async function getProjects(): Promise<ProjectSummary[]> {
  const { data } = await apiClient.get<ProjectSummary[]>('/projects')
  return data
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/projects/${id}`)
  return data
}

export async function createProject(payload: ProjectPayload): Promise<Project> {
  const { data } = await apiClient.post<Project>('/projects', payload)
  return data
}

export async function updateProject(
  id: string,
  payload: ProjectPayload,
): Promise<Project> {
  const { data } = await apiClient.put<Project>(`/projects/${id}`, payload)
  return data
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`)
}

/**
 * Répartit les colis dans les conteneurs du projet. Avec `auto_extend`, le
 * serveur ajoute des conteneurs jusqu'à ce que rien ne reste à quai et les
 * enregistre, si bien que le
 * project must be reloaded afterwards to pick them up.
 */
export async function optimize(
  id: string,
  request: OptimizeRequest,
): Promise<PlacementResult> {
  const { data } = await apiClient.post<PlacementResult>(
    `/projects/${id}/optimize`,
    request,
  )
  return data
}

/**
 * Recommande des tailles pour un lot qui n'est pas encore un projet — ce dont
 * l'assistant d'import a besoin avant de creer quoi que ce soit.
 */
export async function adviseSizes(
  packages: OptimizePaletteInput[],
  palletTypeId?: string | null,
  palletize = true,
): Promise<SizeAdvice> {
  const { data } = await apiClient.post<SizeAdvice>('/size-advice', {
    packages,
    pallet_type_id: palletTypeId ?? null,
    palletize,
  })
  return data
}

/** Combien de conteneurs et de palettes chaque taille de référence demanderait. */
export async function getSizeAdvice(
  id: string,
  palletTypeId?: string | null,
  palletize = true,
): Promise<SizeAdvice> {
  const { data } = await apiClient.get<SizeAdvice>(
    `/projects/${id}/size-advice`,
    {
      params: {
        ...(palletTypeId ? { pallet_type_id: palletTypeId } : {}),
        palletize,
      },
    },
  )
  return data
}

export async function getResult(id: string): Promise<PlacementResult> {
  const { data } = await apiClient.get<PlacementResult>(`/projects/${id}/result`)
  return data
}
