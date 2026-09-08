import { useTranslation } from '../i18n'
import type { ContainerType } from '../types/container.types'
import type { PaletteType } from '../types/palette.types'
import type { ContainerDraft } from '../types/project.types'

interface ConfigurationSummaryProps {
  containers: ContainerDraft[]
  containerTypes: ContainerType[]
  palletTypes: PaletteType[]
  packageCount: number
  step: number
}

/**
 * Rappel en lecture seule de l'expédition : ce qu'on charge, et dans quoi.
 * Sert aux étapes qui ne doivent pas exposer les réglages.
 */
export function ConfigurationSummary({
  containers,
  containerTypes,
  palletTypes,
  packageCount,
  step,
}: ConfigurationSummaryProps) {
  const { t } = useTranslation()

  const nameOfContainer = (draft: ContainerDraft): string => {
    if (draft.container_type_id === null) return t('container.customName')
    return (
      containerTypes.find((type) => type.id === draft.container_type_id)?.name ??
      t('container.toSelect')
    )
  }

  const nameOfPallet = (draft: ContainerDraft): string => {
    if (draft.pallet_type_id === null) return t('pallet.toChoose')
    return (
      palletTypes.find((type) => type.id === draft.pallet_type_id)?.name ??
      t('pallet.notSelected')
    )
  }

  return (
    <section
      className="sidebar-section configuration-summary"
      aria-labelledby="selection-title"
    >
      <div>
        <p className="sidebar-section__eyebrow">
          {t('summary.eyebrow', { step })}
        </p>
        <h2 id="selection-title">{t('summary.title')}</h2>
      </div>

      <dl>
        <div>
          <dt>{t('summary.packages')}</dt>
          <dd>{t('units.packageCount', { count: packageCount })}</dd>
        </div>
        <div>
          <dt>{t('summary.containers')}</dt>
          <dd>{t('containers.count', { count: containers.length })}</dd>
          {containers.length > 0 ? (
            <small>
              {containers
                .map(
                  (draft, index) =>
                    `${index + 1}. ${nameOfContainer(draft)} · ${nameOfPallet(draft)}`,
                )
                .join(' — ')}
            </small>
          ) : null}
        </div>
      </dl>

      <p className="configuration-summary__note">{t('summary.note')}</p>
    </section>
  )
}
