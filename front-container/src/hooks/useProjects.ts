import { useCallback, useEffect, useState } from 'react'

import { deleteProject, getProjects } from '../api/projects.api'
import type { ProjectSummary } from '../types/project.types'

// Lister, rafraîchir et supprimer les projets enregistrés.
export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setProjects(await getProjects())
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // La liste se charge au montage ; le drapeau d'attente posé par refresh()
    // est la synchronisation voulue d'un chargement, pas un rendu en cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const remove = useCallback(
    async (id: string) => {
      await deleteProject(id)
      await refresh()
    },
    [refresh],
  )

  return { projects, loading, error, refresh, remove }
}
