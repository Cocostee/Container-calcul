import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

interface ProjectContextValue {
  activeProjectId: string | null
  selectProject: (id: string) => void
  clearProject: () => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  const selectProject = useCallback((id: string) => setActiveProjectId(id), [])
  const clearProject = useCallback(() => setActiveProjectId(null), [])

  const value = useMemo(
    () => ({ activeProjectId, selectProject, clearProject }),
    [activeProjectId, selectProject, clearProject],
  )

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  )
}

// Le projet actif, partagé entre le rail latéral et l'éditeur.
// eslint-disable-next-line react-refresh/only-export-components
export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider')
  }
  return context
}
