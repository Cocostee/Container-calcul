import { useTranslation } from '../i18n'
import type { ContainerLoad, PlacementResult } from '../types/placement.types'
import { formatPercent } from '../utils/formatVolume'
import { Badge } from './ui/Badge/Badge'
import { Icon } from './ui/Icon'
import { Spinner } from './ui/Spinner/Spinner'

interface ResultsPanelProps {
  result: PlacementResult | null
  /** Conteneur inspecté : ses chiffres passent devant ceux de l'expédition. */
  load: ContainerLoad | null
  isOptimizing: boolean
  error: string | null
}

interface FillBarProps {
  label: string
  rate: number
}

function FillBar({ label, rate }: FillBarProps) {
  const clamped = Math.max(0, Math.min(1, rate))
  return (
    <div className="fill-bar">
      <div className="fill-bar__head">
        <span>{label}</span>
        <span>{formatPercent(rate)}</span>
      </div>
      <div className="fill-bar__track">
        <div
          className="fill-bar__value"
          style={{ width: `${clamped * 100}%` }}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped * 100)}
        />
      </div>
    </div>
  )
}

/*
 * Aucun bouton « Recalculer » : le plan suit la configuration de lui-même, et
 * un bouton qui relance tout — extension automatique comprise — défaisait les
 * réglages qu'on venait de faire à la main.
 */
export function ResultsPanel({
  result,
  load,
  isOptimizing,
  error,
}: ResultsPanelProps) {
  const { t } = useTranslation()

  const palletCount = load?.pallets.length ?? 0
  const loadCount = load?.placements.length ?? 0
  const packageCount =
    load?.pallets.reduce((total, pallet) => total + pallet.package_count, 0) ?? 0

  return (
    <section className="results-panel" aria-labelledby="results-title">
      <div className="results-panel__header">
        <div className="results-panel__title">
          <Icon
            name="chart-pie-solid"
            size="md"
            tone="accent"
            className="panel-heading__glyph"
          />
          <div>
            <p className="panel-heading__eyebrow">{t('results.eyebrow')}</p>
            <h2 id="results-title">{t('results.title')}</h2>
          </div>
        </div>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {isOptimizing ? <Spinner label={t('results.optimizing')} /> : null}

      {result && load ? (
        <div className="results-panel__body">
          <div className="palletization-summary">
            <span className="palletization-summary__number">
              {palletCount > 0 ? palletCount : loadCount}
            </span>
            <div>
              <strong>
                {palletCount > 0
                  ? t('results.palletsBuilt', { count: palletCount })
                  : t('results.loadsPlaced', { count: loadCount })}
              </strong>
              <p>
                {palletCount > 0
                  ? t('results.fromPackages', { count: packageCount })
                  : t('results.readyToCheck')}
              </p>
            </div>
          </div>

          <FillBar
            label={t('results.fillVolume')}
            rate={load.fill_rate_volume}
          />
          <FillBar
            label={t('results.fillWeight')}
            rate={load.fill_rate_weight}
          />

          {/* Le total de l'expédition, sous les chiffres du conteneur. */}
          <p className="results-panel__shipment">
            <Icon name="stack-outline" size="sm" tone="faint" />
            {t('results.shipmentTotal', {
              containers: result.containers.length,
              fill: formatPercent(result.fill_rate_volume),
            })}
          </p>

          {result.unplaced_package_count > 0 ? (
            <div className="results-panel__alert" role="alert">
              <Badge variant="danger">
                {t('plan.leftOver', { count: result.unplaced_package_count })}
              </Badge>
              <p>{t('plan.leftOverHelp')}</p>
            </div>
          ) : (
            <Badge variant="success">{t('plan.allLoaded')}</Badge>
          )}
        </div>
      ) : (
        !isOptimizing && (
          <p className="muted">
            <Icon name="info-circle-outline" size="sm" tone="accent" />
            {t('results.empty')}
          </p>
        )
      )}
    </section>
  )
}
