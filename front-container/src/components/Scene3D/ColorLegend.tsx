import { useTranslation } from '../../i18n'
import type { PackageLegendEntry } from '../../utils/packageLegend'

interface ColorLegendProps {
  entries: PackageLegendEntry[]
  /** Le groupe isolé dans la scène, ou `null` si tout reste visible. */
  selectedKey: string | null
  /** Choisir une ligne l'isole ; la choisir à nouveau revient à tout montrer. */
  onToggle: (key: string) => void
}

/**
 * Ce que chaque couleur veut dire : un carré par ligne de colis d'origine.
 * Deux colis de la même couleur viennent de la même commande, dans n'importe
 * quelle palette du plan. Une ligne se clique pour isoler ses colis dans la
 * scène — les autres s'effacent sans disparaître, pour garder leur position.
 */
export function ColorLegend({ entries, selectedKey, onToggle }: ColorLegendProps) {
  const { t } = useTranslation()

  if (entries.length === 0) return null

  return (
    <div className="pallet-color-legend" role="list" aria-label={t('scene.legendTitle')}>
      <p className="pallet-color-legend__title">{t('scene.legendTitle')}</p>
      <ul>
        {entries.map((entry) => {
          const label = entry.label ?? t('scene.legendUnlabelled')
          const selected = entry.key === selectedKey
          return (
            <li key={entry.key} role="listitem">
              <button
                type="button"
                className={
                  selected
                    ? 'pallet-color-legend__row pallet-color-legend__row--selected'
                    : 'pallet-color-legend__row'
                }
                aria-pressed={selected}
                title={
                  selected ? t('scene.legendClear') : t('scene.legendSelected')
                }
                onClick={() => onToggle(entry.key)}
              >
                <span
                  className="pallet-color-legend__swatch"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden="true"
                />
                <span className="pallet-color-legend__label">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
