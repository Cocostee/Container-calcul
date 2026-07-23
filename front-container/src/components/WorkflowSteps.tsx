interface WorkflowStepsProps {
  hasConfiguration: boolean
  packageCount: number
  palletCount: number
  hasResult: boolean
}

interface WorkflowStep {
  id: number
  href: string
  title: string
  detail: string
  complete: boolean
}

/** A concise, keyboard-accessible overview of the loading workflow. */
export function WorkflowSteps({
  hasConfiguration,
  packageCount,
  palletCount,
  hasResult,
}: WorkflowStepsProps) {
  const currentStep = hasResult ? 3 : packageCount > 0 ? 2 : 1
  const steps: WorkflowStep[] = [
    {
      id: 1,
      href: '#step-1',
      title: 'Configurer',
      detail: 'Conteneur et palette',
      complete: hasConfiguration && packageCount > 0,
    },
    {
      id: 2,
      href: '#step-2',
      title: 'Charger les palettes',
      detail: packageCount > 0 ? `${packageCount} colis` : 'Ajouter les colis',
      complete: hasResult && palletCount > 0,
    },
    {
      id: 3,
      href: '#step-3',
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
              <a href={step.href} aria-current={isCurrent ? 'step' : undefined}>
                <span className="workflow-step__number" aria-hidden="true">
                  {step.complete ? '✓' : step.id}
                </span>
                <span>
                  <strong>
                    Étape {step.id} · {step.title}
                  </strong>
                  <small>{step.detail}</small>
                </span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
