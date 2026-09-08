import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'

import { EditorPage } from '../pages/EditorPage'
import { ImportPlanPage } from '../pages/ImportPlanPage'
import { NEW_PROJECT_ID, newProjectStepPath, projectStepPath } from './workflowRoutes'

const VALID_STEPS = new Set(['1', '2', '3'])

/**
 * Filtre des routes du parcours en trois étapes.
 *
 * Il tient les URL invalides hors de l'éditeur et empêche un projet brouillon de
 * opening a later step before it has been persisted.
 */
function WorkflowRouteMiddleware() {
  const { projectId, step } = useParams()

  if (!projectId || !step || !VALID_STEPS.has(step)) {
    return <Navigate to="/" replace />
  }

  if (projectId === NEW_PROJECT_ID && step !== '1') {
    return <Navigate to={newProjectStepPath()} replace />
  }

  return <Outlet />
}

function LegacyProjectRedirect() {
  const { projectId } = useParams()
  return projectId ? (
    <Navigate to={projectStepPath(projectId, 1)} replace />
  ) : (
    <Navigate to="/" replace />
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/imports/new" element={<ImportPlanPage />} />
        <Route
          path="/projects/:projectId/step/:step"
          element={<WorkflowRouteMiddleware />}
        >
          <Route index element={<EditorPage />} />
        </Route>
        <Route path="/projects/:projectId" element={<LegacyProjectRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
