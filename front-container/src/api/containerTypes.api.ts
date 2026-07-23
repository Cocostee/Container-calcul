// HTTP calls for container reference types.
import type { ContainerType } from '../types/container.types'
import { apiClient } from './client'

export async function getContainerTypes(): Promise<ContainerType[]> {
  const { data } = await apiClient.get<ContainerType[]>('/container-types')
  return data
}
