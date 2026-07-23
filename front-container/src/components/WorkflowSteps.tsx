export type WorkflowStepNumber = 1 | 2 | 3

interface WorkflowStepsProps {
  currentStep: WorkflowStepNumber
  hasConfiguration: boolean
  packageCount: number
  palletCount: number
  hasResult: boolean
  isImported: boolean
  onStepChange: (step: WorkflowStepNumber) => void
}

interface WorkflowStep {
  id: WorkflowStepNumber
  title: string
  detail: string
  complete: boolean
}

/** A concise, keyboard-accessible overview of the loading workflow. */
export function WorkflowSteps({
  currentStep,
  hasConfiguration,
  packageCount,
  palletCount,
  hasResult,
  isImported,
  onStepChange,
}: WorkflowStepsProps) {
  const steps: WorkflowStep[] = [
    {
      id: 1,
      title: 'Configurer',
      detail: 'Conteneur et palette',
      complete: hasConfiguration,
    },
    {
      id: 2,
      title: 'Charger les palettes',
      detail:
        packageCount > 0
          ? isImported
            ? `${packageCount} palettes importées`
            : `${packageCount} colis`
          : 'Ajouter les colis',
      complete: hasResult && palletCount > 0,
    },
    {
      id: 3,
      title: 'Placer dans le conteneur',
      detail: hasResult
        ? `${palletCount} palette${palletCount > 1 ? 's' : ''}`
        : 'Après le calcul',
      complete: hasResult,
    },
  ]

  return (
    <nav className="workflow-steps" aria-label="Fil d’Ariane des étapes">
      <ol>
        {steps.map((step) => {
          const isCurrent = currentStep === step.id
          return (
            <li
              key={step.id}
              className={`workflow-step${isCurrent ? ' workflow-step--current' : ''}${
                step.complete ? ' workflow-step--complete' : ''
              }`}
            >
              <button
                type="button"
                aria-current={isCurrent ? 'step' : undefined}
                disabled={step.id === 3 && !hasResult}
                onClick={() => onStepChange(step.id)}
              >
                <span className="workflow-step__number" aria-hidden="true">
                  {step.complete ? '✓' : step.id}
                </span>
                <span>
                  <strong>
                    Étape {step.id} · {step.title}
                  </strong>
                  <small>{step.detail}</small>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
