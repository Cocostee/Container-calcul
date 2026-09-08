import MobileStepper from '@mui/material/MobileStepper'

import { useTranslation } from '../i18n'
import type { ContainerType } from '../types/container.types'
import type { PaletteType } from '../types/palette.types'
import type {
  ContainerLoad,
  PlacementResult,
  SizeAdvice,
} from '../types/placement.types'
import type { ContainerDraft } from '../types/project.types'
import { formatPercent } from '../utils/formatVolume'
import { ContainerSizeFields } from './ContainerSizeFields'
import { Badge } from './ui/Badge/Badge'
import { Button } from './ui/Button/Button'
import { PanelHeading } from './PanelHeading'
import { Icon } from './ui/Icon'

interface LoadingPlanProps {
  result: PlacementResult
  containers: ContainerDraft[]
  containerTypes: ContainerType[]
  palletTypes: PaletteType[]
  advice: SizeAdvice | null
  selectedPosition: number
  onSelect: (position: number) => void
  onAddContainer: () => void
  onRemoveContainer: (clientId: string) => void
  onChangeContainer: (clientId: string, patch: Partial<ContainerDraft>) => void
  onCustomDimChange: (
    clientId: string,
    field: 'length_cm' | 'width_cm' | 'height_cm' | 'max_weight_kg',
    value: number,
  ) => void
  /** Ce que le calcul a ajouté de lui-même, ou rétabli après suppression. */
  fleetNotice: { kind: 'added' | 'restored'; count: number } | null
  /** Le format de palette retenu ne peut pas porter tout le lot. */
  palletBlockage: {
    name: string
    count: number
    better: { id: string; name: string } | null
  } | null
  onUsePallet: (palletTypeId: string) => void
  /** Un conteneur de plus n'a rien changé : la taille est en cause. */
  dockIsStuck: boolean
  onChangeSizes: () => void
}

/**
 * Vue d'ensemble de l'expédition, un conteneur à la fois : son remplissage,
 * sa taille, son format de palette, et le reliquat resté à quai.
 *
 * Un seul conteneur est affiché, et c'est celui qu'on inspecte en 3D. Il n'y
 * a donc qu'une seule position dans toute l'étape, et une seule façon d'en
 * changer : les deux flèches du `MobileStepper`. Un rail que l'on faisait
 * défiler à la main en plus des flèches donnait deux commandes pour un seul
 * état, dont une seule entraînait le reste de la page.
 */
export function LoadingPlan({
  result,
  containers,
  containerTypes,
  palletTypes,
  advice,
  selectedPosition,
  onSelect,
  onAddContainer,
  onRemoveContainer,
  onChangeContainer,
  onCustomDimChange,
  fleetNotice,
  palletBlockage,
  onUsePallet,
  dockIsStuck,
  onChangeSizes,
}: LoadingPlanProps) {
  const { t } = useTranslation()
  const leftOver = result.unplaced_package_count
  /* Constante, pour que le type reste affiné dans le gestionnaire de clic. */
  const betterPallet = palletBlockage?.better ?? null

  const total = result.containers.length
  const index = Math.min(Math.max(selectedPosition, 1), total) - 1
  const load = result.containers[index]

  /**
   * Le conteneur déclaré derrière la carte affichée. L'identifiant enregistré
   * fait le lien ; à défaut, le rang, car le plan suit l'ordre de la liste.
   */
  const draft =
    containers.find((entry) => entry.persistedId === load?.container_id) ??
    containers[index] ??
    null

  return (
    <section className="loading-plan" aria-labelledby="loading-plan-title">
      <PanelHeading
        icon="chart-pie-outline"
        eyebrow={t('plan.eyebrow')}
        title={t('plan.title')}
        titleId="loading-plan-title"
        meta={t('plan.containerCount', { count: total })}
      />

      {load ? (
        <ContainerCard
          load={load}
          draft={draft}
          containerTypes={containerTypes}
          palletTypes={palletTypes}
          advice={advice}
          onRemove={onRemoveContainer}
          onChange={onChangeContainer}
          onCustomDimChange={onCustomDimChange}
        />
      ) : null}

      {total > 1 ? (
        <MobileStepper
          className="loading-plan__stepper"
          variant="text"
          steps={total}
          position="static"
          activeStep={index}
          backButton={
            <Button
              variant="ghost"
              aria-label={t('plan.previousContainer')}
              disabled={index === 0}
              onClick={() => onSelect(index)}
            >
              <Icon name="caret-left-solid" size="sm" tone="inherit" />
              {t('common.previous')}
            </Button>
          }
          nextButton={
            <Button
              variant="ghost"
              aria-label={t('plan.nextContainer')}
              disabled={index >= total - 1}
              onClick={() => onSelect(index + 2)}
            >
              {t('common.next')}
              <Icon name="caret-right-solid" size="sm" tone="inherit" />
            </Button>
          }
        />
      ) : null}

      {fleetNotice ? (
        <p className="plan-notice" role="status">
          <Icon name="info-circle-outline" size="sm" tone="accent" />
          {fleetNotice.kind === 'restored'
            ? t('plan.containerRestored', { count: fleetNotice.count })
            : t('plan.containersAdded', { count: fleetNotice.count })}
        </p>
      ) : null}

      {/* Rien quand tout est chargé : le panneau de résultats le dit déjà. */}
      {leftOver > 0 ? (
        <div className="loading-plan__leftover" role="alert">
          <Badge variant="danger">
            {t('plan.leftOver', { count: leftOver })}
          </Badge>
          <p>
            {palletBlockage
              ? t('plan.palletBlocked', {
                  name: palletBlockage.name,
                  count: palletBlockage.count,
                })
              : dockIsStuck
                ? t('plan.leftOverStuck')
                : t('plan.leftOverHelp')}
          </p>
          {palletBlockage ? (
            betterPallet ? (
              <Button
                variant="primary"
                icon="layers-outline"
                onClick={() => onUsePallet(betterPallet.id)}
              >
                {t('plan.palletSwitch', { name: betterPallet.name })}
              </Button>
            ) : (
              <p className="muted">{t('plan.palletNoWay')}</p>
            )
          ) : dockIsStuck ? (
            <Button
              variant="primary"
              icon="container-outline"
              onClick={onChangeSizes}
            >
              {t('plan.leftOverChangeSize')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Button
        variant={leftOver > 0 && !palletBlockage ? 'primary' : 'secondary'}
        icon="plus-outline"
        onClick={onAddContainer}
      >
        {t('containers.add')}
      </Button>
    </section>
  )
}

interface ContainerCardProps {
  load: ContainerLoad
  draft: ContainerDraft | null
  containerTypes: ContainerType[]
  palletTypes: PaletteType[]
  advice: SizeAdvice | null
  onRemove: (clientId: string) => void
  onChange: (clientId: string, patch: Partial<ContainerDraft>) => void
  onCustomDimChange: (
    clientId: string,
    field: 'length_cm' | 'width_cm' | 'height_cm' | 'max_weight_kg',
    value: number,
  ) => void
}

/**
 * Le conteneur affiché : ce qu'il porte, son remplissage, sa taille et son
 * format de palette. Rien n'y est cliquable pour changer de conteneur — c'est
 * le rôle des flèches, et d'elles seules.
 */
function ContainerCard({
  load,
  draft,
  containerTypes,
  palletTypes,
  advice,
  onRemove,
  onChange,
  onCustomDimChange,
}: ContainerCardProps) {
  const { t } = useTranslation()
  const isEmpty = load.placements.length === 0

  return (
    <article className="plan-card">
      <div className="plan-card__head">
        <span className="plan-card__rank" aria-hidden="true">
          {load.position}
        </span>
        <Icon
          name={load.pallets.length > 0 ? 'layers-outline' : 'container-outline'}
          size="lg"
          tone="primary"
          className="plan-card__glyph"
        />
        <div className="plan-card__body">
          <h3>{load.container.name ?? t('container.customName')}</h3>
          <p className="muted">
            {isEmpty
              ? t('plan.rowEmpty')
              : load.pallets.length > 0
                ? t('plan.rowPallets', {
                    pallets: load.pallets.length,
                    label: load.pallet_label ?? '',
                  })
                : t('plan.rowLoads', { count: load.placements.length })}
          </p>
        </div>
        <p className="plan-card__figures">
          <span className="plan-card__fill">
            {formatPercent(load.fill_rate_volume)}
          </span>
          <small>{Math.round(load.used_weight)} kg</small>
        </p>
      </div>

      <span
        className="plan-card__gauge"
        role="progressbar"
        aria-label={t('plan.rowGauge', { position: load.position })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(load.fill_rate_volume * 100)}
      >
        <span
          className="plan-card__gauge-value"
          style={{
            width: `${Math.min(100, Math.max(0, load.fill_rate_volume * 100))}%`,
          }}
        />
      </span>

      {draft ? (
        <div className="plan-card__tools">
          <ContainerSizeFields
            draft={draft}
            containerTypes={containerTypes}
            palletTypes={palletTypes}
            advice={advice}
            onChange={onChange}
            onCustomDimChange={onCustomDimChange}
          />
          <Button
            variant="ghost"
            className="plan-card__remove"
            icon="trash-outline"
            aria-label={t('containers.remove', { position: load.position })}
            onClick={() => onRemove(draft.clientId)}
          >
            {t('common.delete')}
          </Button>
        </div>
      ) : null}
    </article>
  )
}
