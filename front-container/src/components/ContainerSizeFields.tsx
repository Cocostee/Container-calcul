import { useTranslation } from '../i18n'
import type { ContainerType } from '../types/container.types'
import type { PaletteType } from '../types/palette.types'
import type { SizeAdvice } from '../types/placement.types'
import type { ContainerDraft } from '../types/project.types'
import { CUSTOM_CONTAINER_VALUE } from '../utils/constants'
import { Icon } from './ui/Icon'
import { NumberInput } from './ui/NumberInput/NumberInput'
import { Select } from './ui/Select/Select'

interface ContainerSizeFieldsProps {
  draft: ContainerDraft
  containerTypes: ContainerType[]
  palletTypes: PaletteType[]
  advice: SizeAdvice | null
  onChange: (clientId: string, patch: Partial<ContainerDraft>) => void
  onCustomDimChange: (
    clientId: string,
    field: 'length_cm' | 'width_cm' | 'height_cm' | 'max_weight_kg',
    value: number,
  ) => void
}

/**
 * La taille d'un conteneur et son format de palette, avec le badge qui dit ce
 * que ce choix coûte et lequel coûterait le moins.
 *
 * Le même bloc sert à l'étape 2, où l'on déclare les conteneurs, et sur le
 * plan de chargement, où l'on corrige une taille en voyant son effet : ce
 * sont deux moments du même geste, ils ne doivent pas différer.
 */
export function ContainerSizeFields({
  draft,
  containerTypes,
  palletTypes,
  advice,
  onChange,
  onCustomDimChange,
}: ContainerSizeFieldsProps) {
  const { t } = useTranslation()

  const bestContainer = advice?.containers.find((entry) => entry.recommended)
  const bestPallet = advice?.pallets.find((entry) => entry.recommended)
  const containerAdvice = advice?.containers.find(
    (entry) => entry.container_type_id === draft.container_type_id,
  )
  const palletAdvice = advice?.pallets.find(
    (entry) => entry.pallet_type_id === draft.pallet_type_id,
  )

  const containerOptions = [
    ...containerTypes.map((type) => ({ value: type.id, label: type.name })),
    { value: CUSTOM_CONTAINER_VALUE, label: t('container.custom') },
  ]

  /*
   * Tout voyage sur palette : aucune option « sans palette » n'est proposée.
   * Le créneau vide n'apparaît que pour un conteneur qui n'en porte pas encore
   * — un projet importé avant cette règle — et disparaît au choix.
   *
   * Un format trop petit pour les colis sort du choix : le proposer, puis
   * annoncer que tout reste à quai, n'apprend rien et fait perdre du temps.
   * Trois garde-fous, pour ne jamais enfermer : on ne désactive que si un
   * autre format convient, jamais celui déjà retenu, et jamais sans dire
   * pourquoi.
   */
  const carries = (palletTypeId: string) => {
    const entry = advice?.pallets.find(
      (candidate) => candidate.pallet_type_id === palletTypeId,
    )
    return !entry || entry.unplaced_package_count === 0
  }
  const someFormatCarries = palletTypes.some((type) => carries(type.id))

  const palletOptions = [
    ...(draft.pallet_type_id === null
      ? [{ value: '', label: t('pallet.toChoose') }]
      : []),
    ...palletTypes.map((type) => {
      const blocked =
        someFormatCarries &&
        !carries(type.id) &&
        type.id !== draft.pallet_type_id
      return {
        value: type.id,
        label: blocked ? `${type.name} · ${t('pallet.tooSmall')}` : type.name,
        disabled: blocked,
      }
    }),
  ]

  const isCustom = draft.container_type_id === null
  const dims = draft.container_custom_dims

  return (
    <>
      <div className="container-card__fields">
        <div className="container-card__field">
          <Select
            label={t('container.type')}
            value={draft.container_type_id ?? CUSTOM_CONTAINER_VALUE}
            options={containerOptions}
            onChange={(value) =>
              onChange(draft.clientId, {
                container_type_id:
                  value === CUSTOM_CONTAINER_VALUE ? null : value,
              })
            }
          />
          <SizeBadge
            recommended={Boolean(containerAdvice?.recommended)}
            label={
              containerAdvice
                ? t('containers.badgeNeeded', {
                    count: containerAdvice.containers_needed,
                  })
                : null
            }
            hint={
              bestContainer && !containerAdvice?.recommended
                ? t('containers.badgeBetter', {
                    name: bestContainer.name,
                    count: bestContainer.containers_needed,
                  })
                : null
            }
          />
        </div>

        <div className="container-card__field">
          <Select
            label={t('pallet.type')}
            value={draft.pallet_type_id ?? ''}
            options={palletOptions}
            onChange={(value) =>
              onChange(draft.clientId, {
                pallet_type_id: value === '' ? null : value,
              })
            }
          />
          <SizeBadge
            recommended={Boolean(palletAdvice?.recommended)}
            label={
              palletAdvice
                ? t('containers.badgePallets', {
                    count: palletAdvice.pallets_needed,
                  })
                : null
            }
            hint={
              bestPallet && !palletAdvice?.recommended
                ? t('containers.badgeBetterPallet', {
                    name: bestPallet.name,
                    count: bestPallet.pallets_needed,
                  })
                : null
            }
          />
        </div>
      </div>

      {isCustom && dims ? (
        <div className="field-grid">
          <NumberInput
            label={t('container.length')}
            unit={t('units.cm')}
            value={dims.length_cm}
            onChange={(value) =>
              onCustomDimChange(draft.clientId, 'length_cm', value)
            }
          />
          <NumberInput
            label={t('container.width')}
            unit={t('units.cm')}
            value={dims.width_cm}
            onChange={(value) =>
              onCustomDimChange(draft.clientId, 'width_cm', value)
            }
          />
          <NumberInput
            label={t('container.height')}
            unit={t('units.cm')}
            value={dims.height_cm}
            onChange={(value) =>
              onCustomDimChange(draft.clientId, 'height_cm', value)
            }
          />
          <NumberInput
            label={t('container.maxWeight')}
            unit={t('units.kg')}
            value={dims.max_weight_kg}
            onChange={(value) =>
              onCustomDimChange(draft.clientId, 'max_weight_kg', value)
            }
          />
        </div>
      ) : null}
    </>
  )
}

interface SizeBadgeProps {
  recommended: boolean
  label: string | null
  hint: string | null
}

/** Petit badge sous un sélecteur : ce que coûte ce format, et le meilleur. */
function SizeBadge({ recommended, label, hint }: SizeBadgeProps) {
  if (!label) return null
  return (
    <p className={recommended ? 'size-badge size-badge--best' : 'size-badge'}>
      {recommended ? (
        <Icon name="check-outline" size="xs" tone="inherit" />
      ) : null}
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
    </p>
  )
}
