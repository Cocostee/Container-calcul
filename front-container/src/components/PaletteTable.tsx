import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import type { PackageDraft } from '../types/palette.types'
import { useTranslation, type Locale } from '../i18n'
import { Icon, type IconName } from './ui/Icon'

interface PaletteTableProps {
  packages: PackageDraft[]
  /** Ligne en cours de modification dans le formulaire latéral. */
  editingId: string | null
  onEdit: (clientId: string) => void
  onDuplicate: (clientId: string) => void
}

/** Un nombre dans la langue du lecteur : « 25 672 », « 897,6 ». */
function decimal(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    value,
  )
}

/**
 * Le lot de colis, en lecture.
 *
 * Ce qu'on vient y chercher, c'est l'anomalie : la charge trop lourde, celle
 * qui ne s'empile pas. La grille sert donc la comparaison — chiffres alignés
 * à droite en largeur fixe, unités effacées derrière la valeur, restrictions
 * en rouge au milieu de mentions grises. Le libellé, lui, n'est qu'un nom :
 * il reste en graisse normale, c'est sa place qui l'identifie.
 *
 * Ce n'est pas un `<table>` mais une grille : une ligne doit être **une**
 * boîte, avec son fond, son trait, ses coins et son ombre. Assemblée de
 * cellules, l'ombre de chacune se peignait par-dessus le fond de sa voisine
 * et traçait un trait entre les colonnes. Les rôles ARIA rendent la structure
 * au lecteur d'écran, qui y retrouve bien un tableau.
 *
 * La modification se fait dans le rail latéral, où les champs ont la place de
 * respirer ; ici, deux gestes seulement, en icônes.
 */
export function PaletteTable({
  packages,
  editingId,
  onEdit,
  onDuplicate,
}: PaletteTableProps) {
  const { t, locale } = useTranslation()

  if (packages.length === 0) {
    return <p className="muted">{t('packages.empty')}</p>
  }

  const totalCount = packages.reduce((total, item) => total + item.quantity, 0)
  const totalWeight = packages.reduce(
    (total, item) => total + item.weight_kg * item.quantity,
    0,
  )

  /** Un en-tête = son intitulé, précédé du signe de la grandeur mesurée. */
  const head = (key: string, icon: IconName | null, numeric = false) => (
    <span
      role="columnheader"
      className={numeric ? 'package-cell--num' : undefined}
    >
      <span className="ui-table__head">
        {icon ? <Icon name={icon} size="xs" tone="faint" /> : null}
        {t(key)}
      </span>
    </span>
  )

  return (
    <div className="palette-table">
      <div className="package-grid" role="table" aria-label={t('packages.tableCaption')}>
        <div role="rowgroup">
          <div className="package-grid__head" role="row">
            {head('packages.columnLabel', 'file-text')}
            {head('packages.columnDimensions', 'ruler-outline', true)}
            {head('packages.columnWeight', 'weight-outline', true)}
            {head('packages.columnQuantity', 'stack-outline', true)}
            {head('packages.columnConstraints', 'info-circle-outline')}
            {head('packages.columnActions', null)}
          </div>
        </div>

        <div className="package-grid__body" role="rowgroup">
          {packages.map((item) => (
            <div
              key={item.clientId}
              role="row"
              className={
                item.clientId === editingId
                  ? 'package-row package-row--editing'
                  : 'package-row'
              }
            >
              <span role="cell" className="package-cell">
                <span className="package-label" title={item.label}>
                  {item.label}
                </span>
              </span>
              <span role="cell" className="package-cell package-cell--num">
                {decimal(item.length_cm, locale)} ×{' '}
                {decimal(item.width_cm, locale)} ×{' '}
                {decimal(item.height_cm, locale)} <small>{t('units.cm')}</small>
              </span>
              <span role="cell" className="package-cell package-cell--num">
                {decimal(item.weight_kg, locale)} <small>{t('units.kg')}</small>
              </span>
              <span role="cell" className="package-cell package-cell--num">
                {decimal(item.quantity, locale)}
              </span>
              <span role="cell" className="package-cell">
                <span className="package-flags">
                  <Flag
                    allowed={item.stackable}
                    icon="layers-outline"
                    label={t(
                      item.stackable
                        ? 'packages.isStackable'
                        : 'packages.notStackable',
                    )}
                  />
                  <Flag
                    allowed={item.rotatable}
                    icon="refresh-outline"
                    label={t(
                      item.rotatable
                        ? 'packages.isRotatable'
                        : 'packages.notRotatable',
                    )}
                  />
                </span>
              </span>
              <span role="cell" className="package-cell row-actions">
                <IconAction
                  icon="edit-outline"
                  label={t('packages.editPackage', { name: item.label })}
                  tooltip={t('common.edit')}
                  onClick={() => onEdit(item.clientId)}
                />
                <IconAction
                  icon="copy-outline"
                  label={t('packages.duplicatePackage', { name: item.label })}
                  tooltip={t('common.duplicate')}
                  onClick={() => onDuplicate(item.clientId)}
                />
              </span>
            </div>
          ))}
        </div>

        <div role="rowgroup">
          <div className="package-grid__foot" role="row">
            <span role="cell" className="package-total">
              {t('packages.totalLabel')}
            </span>
            <span role="cell" />
            <span role="cell" className="package-cell--num">
              <strong>{decimal(totalWeight, locale)}</strong>{' '}
              <small>{t('units.kg')}</small>
            </span>
            <span role="cell" className="package-cell--num">
              <strong>{decimal(totalCount, locale)}</strong>
            </span>
            <span role="cell" />
            <span role="cell" />
          </div>
        </div>
      </div>
    </div>
  )
}

interface FlagProps {
  allowed: boolean
  icon: IconName
  label: string
}

/**
 * L'état d'une contrainte de manutention. Les deux se lisent toujours — on
 * doit pouvoir vérifier qu'un colis est bien empilable, pas seulement
 * apprendre qu'il ne l'est pas. Ce qui est permis reste gris, ce qui est
 * interdit passe au rouge : l'œil tombe sur l'exception.
 */
function Flag({ allowed, icon, label }: FlagProps) {
  return (
    <span
      className={allowed ? 'package-flag' : 'package-flag package-flag--off'}
    >
      <Icon name={allowed ? icon : 'cancel-outline'} size="xs" tone="inherit" />
      {label}
    </span>
  )
}

interface IconActionProps {
  icon: IconName
  label: string
  tooltip: string
  onClick: () => void
}

/**
 * Geste de ligne : une icône, son intitulé au survol, son nom pour l'aide.
 *
 * `IconButton` plutôt que notre bouton : l'infobulle de MUI doit poser une
 * référence sur son enfant, et le nôtre ne la transmet pas.
 */
function IconAction({ icon, label, tooltip, onClick }: IconActionProps) {
  return (
    <Tooltip title={tooltip}>
      <IconButton className="row-action" aria-label={label} onClick={onClick}>
        <Icon name={icon} size="sm" tone="inherit" />
      </IconButton>
    </Tooltip>
  )
}
