import { useTranslation } from '../i18n'
import type { ContainerType } from '../types/container.types'
import type { PaletteType } from '../types/palette.types'
import type { SizeAdvice } from '../types/placement.types'
import { Icon } from './ui/Icon'

interface SizeChooserProps {
  advice: SizeAdvice | null
  containerTypes: ContainerType[]
  palletTypes: PaletteType[]
  containerTypeId: string | null
  palletTypeId: string | null
  onContainerChange: (id: string) => void
  onPalletChange: (id: string) => void
  disabled?: boolean
}

/**
 * Choix de la taille des conteneurs puis du format de palette, chacun avec sa
 * suggestion. Les deux sont liés : changer de palette change le nombre de
 * conteneurs nécessaires, donc la suggestion de conteneur se recalcule.
 *
 * Tout voyage sur palette — une charge posée libre dans la cale n'est pas un
 * cas qu'on manutentionne. Il n'y a donc pas d'option « sans palette » : le
 * format le mieux placé est toujours l'un des formats de référence.
 */
export function SizeChooser({
  advice,
  containerTypes,
  palletTypes,
  containerTypeId,
  palletTypeId,
  onContainerChange,
  onPalletChange,
  disabled = false,
}: SizeChooserProps) {
  const { t } = useTranslation()

  const containerAdvice = (id: string) =>
    advice?.containers.find((entry) => entry.container_type_id === id)
  const palletAdvice = (id: string) =>
    advice?.pallets.find((entry) => entry.pallet_type_id === id)

  const classesOf = (parts: (string | false | undefined)[]) =>
    parts.filter(Boolean).join(' ')

  /*
   * Un format qui laisse des colis à quai sort du choix : tout doit partir.
   * Sauf s'aucun ne convient — mieux vaut un choix ouvert qu'un écran mort —
   * et sauf celui déjà retenu, qu'on doit pouvoir garder sous les yeux.
   */
  const palletCarries = (palletTypeId: string) => {
    const entry = palletAdvice(palletTypeId)
    return !entry || entry.unplaced_package_count === 0
  }
  const someFormatCarries = palletTypes.some((type) => palletCarries(type.id))

  return (
    <div className="size-chooser">
      <fieldset className="size-chooser__group" disabled={disabled}>
        <legend>
          <Icon name="container-outline" size="sm" tone="primary" />
          {t('wizard.containerLegend')}
        </legend>
        <p className="muted">{t('wizard.containerHelp')}</p>

        <ul className="size-chooser__options">
          {containerTypes.map((type) => {
            const entry = containerAdvice(type.id)
            const impossible = entry?.containers_needed === 0
            return (
              <li key={type.id}>
                <label
                  className={classesOf([
                    'size-option',
                    containerTypeId === type.id && 'size-option--picked',
                    entry?.recommended && 'size-option--best',
                    impossible && 'size-option--impossible',
                  ])}
                >
                  <input
                    type="radio"
                    name="container-size"
                    value={type.id}
                    checked={containerTypeId === type.id}
                    disabled={disabled}
                    onChange={() => onContainerChange(type.id)}
                  />
                  <span className="size-option__body">
                    <span className="size-option__name">{type.name}</span>
                    <span className="size-option__dims">
                      {type.length_cm} × {type.width_cm} × {type.height_cm}{' '}
                      {t('units.cm')} · {type.max_weight_kg} {t('units.kg')}
                    </span>
                    <Leftover count={entry?.unplaced_package_count ?? 0} />
                  </span>
                  <span className="size-option__figure">
                    {!entry ? null : impossible ? (
                      <em>{t('wizard.doesNotFit')}</em>
                    ) : (
                      <>
                        <strong>{entry.containers_needed}</strong>
                        <small>
                          {t('wizard.containersNeeded', {
                            count: entry.containers_needed,
                          })}
                        </small>
                      </>
                    )}
                  </span>
                  <Flag
                    best={Boolean(entry?.recommended)}
                    bestLabel={t('wizard.best')}
                  />
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <fieldset className="size-chooser__group" disabled={disabled}>
        <legend>
          <Icon name="layers-outline" size="sm" tone="primary" />
          {t('wizard.palletLegend')}
        </legend>
        <p className="muted">{t('wizard.palletHelp')}</p>

        <ul className="size-chooser__options">
          {palletTypes.map((type) => {
            const entry = palletAdvice(type.id)
            const impossible = !entry || entry.pallets_needed === 0
            const blocked =
              someFormatCarries &&
              !palletCarries(type.id) &&
              palletTypeId !== type.id
            return (
              <li key={type.id}>
                <label
                  className={classesOf([
                    'size-option',
                    palletTypeId === type.id && 'size-option--picked',
                    entry?.recommended && 'size-option--best',
                    blocked && 'size-option--blocked',
                  ])}
                >
                  <input
                    type="radio"
                    name="pallet-size"
                    value={type.id}
                    checked={palletTypeId === type.id}
                    disabled={disabled || blocked}
                    onChange={() => onPalletChange(type.id)}
                  />
                  <span className="size-option__body">
                    <span className="size-option__name">{type.name}</span>
                    <span className="size-option__dims">
                      {type.length_cm} × {type.width_cm} {t('units.cm')} ·{' '}
                      {t('pallet.loadHeight')} {type.default_load_height_cm}{' '}
                      {t('units.cm')}
                    </span>
                    <Leftover count={entry?.unplaced_package_count ?? 0} />
                  </span>
                  <span className="size-option__figure">
                    {impossible ? (
                      <em>{t('wizard.doesNotFit')}</em>
                    ) : (
                      <>
                        <strong>{entry.pallets_needed}</strong>
                        <small>
                          {t('wizard.palletsBuilt', {
                            count: entry.pallets_needed,
                          })}
                        </small>
                      </>
                    )}
                  </span>
                  <Flag
                    best={Boolean(entry?.recommended)}
                    bestLabel={t('wizard.best')}
                  />
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>
    </div>
  )
}

/** Ce qu'une taille laisserait à quai, dit sous les dimensions. */
function Leftover({ count }: { count: number }) {
  const { t } = useTranslation()
  if (count === 0) return null
  return (
    <span className="size-option__warn">
      <Icon name="info-triangle-outline" size="xs" tone="inherit" />
      {t('wizard.leavesBehind', { count })}
    </span>
  )
}

interface FlagProps {
  best: boolean
  bestLabel: string
}

/**
 * Créneau de fin de carte, où se pose le badge « optimisé ». Toujours
 * présent, même vide : sans lui, une carte sans badge n'aurait pas la même
 * largeur utile que ses voisines et les colonnes ne s'aligneraient plus.
 */
function Flag({ best, bestLabel }: FlagProps) {
  return (
    <span className="size-option__slot">
      {best ? (
        <span className="size-option__flag">
          <Icon name="check-solid" size="xs" tone="inherit" />
          {bestLabel}
        </span>
      ) : null}
    </span>
  )
}
