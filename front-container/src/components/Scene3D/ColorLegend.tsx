import { useTranslation } from '../../i18n'
import type { PackageLegendEntry } from '../../utils/packageLegend'

interface ColorLegendProps {
  entries: PackageLegendEntry[]
}

/**
 * Ce que chaque couleur veut dire : un carré par ligne de colis d'origine.
 * Deux colis de la même couleur viennent de la même commande, dans n'importe
 * quelle palette du plan — c'est tout ce qu'il y a à savoir pour la lire.
 */
export function ColorLegend({ entries }: ColorLegendProps) {
  const { t } = useTranslation()

  if (entries.length === 0) return null

  return (
    <div className="pallet-color-legend" role="list" aria-label={t('scene.legendTitle')}>
      <p className="pallet-color-legend__title">{t('scene.legendTitle')}</p>
      <ul>
        {entries.map((entry) => (
          <li key={entry.key} role="listitem">
            <span
              className="pallet-color-legend__swatch"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="pallet-color-legend__label">
              {entry.label ?? t('scene.legendUnlabelled')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
