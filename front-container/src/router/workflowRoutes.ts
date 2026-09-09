export const NEW_PROJECT_ID = 'new'
export type WorkflowRouteStep = 1 | 2 | 3 | 4

export function newProjectStepPath(): string {
  return `/projects/${NEW_PROJECT_ID}/step/1`
}

export function projectStepPath(
  projectId: string,
  step: WorkflowRouteStep,
): string {
  return `/projects/${projectId}/step/${step}`
}

/** La fiche imprimable du plan : sa propre page, sans le rail ni la 3D. */
export function printPlanPath(projectId: string): string {
  return `/projects/${projectId}/print`
}
