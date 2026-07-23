import { useCallback, useEffect, useState } from 'react'

import { deleteProject, getProjects } from '../api/projects.api'
import type { ProjectSummary } from '../types/project.types'

// List, refresh and delete saved projects for the sidebar.
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
    // Fetch the list on mount; the loading toggle inside refresh() is the
    // intended state sync for a data fetch, not a cascading-render bug.
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
