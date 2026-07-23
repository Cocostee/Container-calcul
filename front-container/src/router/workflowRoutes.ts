export const NEW_PROJECT_ID = 'new'
export type WorkflowRouteStep = 1 | 2 | 3

export function newProjectStepPath(): string {
  return `/projects/${NEW_PROJECT_ID}/step/1`
}

export function projectStepPath(
  projectId: string,
  step: WorkflowRouteStep,
): string {
  return `/projects/${projectId}/step/${step}`
}
