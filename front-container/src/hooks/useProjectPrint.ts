import { useEffect, useState } from 'react'

import { getProject } from '../api/projects.api'
import type { Project } from '../types/project.types'

/**
 * Charge un projet pour la fiche imprimable : un besoin isolé du reste de
 * l'éditeur, puisque la page s'ouvre dans son propre onglet, sans passer par
 * l'état de l'assistant.
 */
export function useProjectPrint(projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      // Garde défensive : la route n'a pas de sens sans identifiant, mais le
      // type le permet. Synchronise l'état affiché avec ce fait plutôt que
      // de laisser un chargement qui ne finirait jamais.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      setError(null)
      setProject(null)
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    getProject(projectId)
      .then((data) => {
        if (active) setProject(data)
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  return { project, loading, error }
}
