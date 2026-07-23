// HTTP calls for projects, optimization and results.
import type {
  OptimizeRequest,
  PlacementResult,
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

export async function getResult(id: string): Promise<PlacementResult> {
  const { data } = await apiClient.get<PlacementResult>(`/projects/${id}/result`)
  return data
}
