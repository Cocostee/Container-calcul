import Step from '@mui/material/Step'
import StepButton from '@mui/material/StepButton'
import Stepper from '@mui/material/Stepper'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import { useTranslation } from '../i18n'
import { Icon } from './ui/Icon'

export type WorkflowStepNumber = 1 | 2 | 3 | 4

interface WorkflowStepsProps {
  currentStep: WorkflowStepNumber
  hasPackages: boolean
  hasContainers: boolean
  packageCount: number
  containerCount: number
  /** Total des palettes montées, toutes expéditions confondues — n'existe qu'après le calcul. */
  palletCount: number
  hasResult: boolean
  onStepChange: (step: WorkflowStepNumber) => void
}

interface WorkflowStep {
  id: WorkflowStepNumber
  title: string
  detail: string
  complete: boolean
}

interface StepMarkerProps {
  index: number
  complete: boolean
  current: boolean
}

/** Jalon : le numéro tant que l'étape reste à faire, une coche ensuite. */
function StepMarker({ index, complete, current }: StepMarkerProps) {
  return (
    <span
      className={[
        'workflow-marker',
        complete ? 'workflow-marker--complete' : '',
        current ? 'workflow-marker--current' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      {complete ? <Icon name="check-outline" size="sm" /> : index}
    </span>
  )
}

/**
 * Fil du chargement : quatre jalons reliés par une ligne qui se remplit.
 *
 * L'orientation suit la largeur disponible — horizontale sur grand écran,
 * verticale dès que les libellés ne tiennent plus côte à côte. C'est le
 * Stepper de MUI qui gère l'enchaînement et les états ; l'apparence vient
 * entièrement du thème.
 */
export function WorkflowSteps({
  currentStep,
  hasPackages,
  hasContainers,
  packageCount,
  containerCount,
  palletCount,
  hasResult,
  onStepChange,
}: WorkflowStepsProps) {
  const theme = useTheme()
  const { t } = useTranslation()
  const isCompact = useMediaQuery(theme.breakpoints.down('md'))

  const steps: WorkflowStep[] = [
    {
      id: 1,
      title: t('steps.step1Title'),
      detail:
        packageCount > 0
          ? t('steps.step1DetailPackages', { count: packageCount })
          : t('steps.step1Detail'),
      complete: hasPackages,
    },
    {
      id: 2,
      title: t('steps.step2Title'),
      detail: hasContainers
        ? t('steps.step2DetailContainers', { count: containerCount })
        : t('steps.step2Detail'),
      complete: hasContainers,
    },
    {
      id: 3,
      title: t('steps.step3Title'),
      detail: hasResult
        ? t('steps.step3DetailPallets', { count: palletCount })
        : t('steps.step3Detail'),
      complete: hasResult,
    },
    {
      id: 4,
      title: t('steps.step4Title'),
      detail: hasResult
        ? t('steps.step4DetailPlan', { count: containerCount })
        : t('steps.step4Detail'),
      complete: hasResult,
    },
  ]

  return (
    <nav className="workflow-steps" aria-label={t('steps.ariaLabel')}>
      <Stepper
        nonLinear
        activeStep={currentStep - 1}
        orientation={isCompact ? 'vertical' : 'horizontal'}
        alternativeLabel={!isCompact}
      >
        {steps.map((step, index) => {
          const isCurrent = currentStep === step.id
          return (
            <Step key={step.id} completed={step.complete}>
              <StepButton
                onClick={() => onStepChange(step.id)}
                disabled={(step.id === 3 || step.id === 4) && !hasResult}
                aria-current={isCurrent ? 'step' : undefined}
                icon={
                  <StepMarker
                    index={index + 1}
                    complete={step.complete}
                    current={isCurrent}
                  />
                }
              >
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </StepButton>
            </Step>
          )
        })}
      </Stepper>
    </nav>
  )
}
