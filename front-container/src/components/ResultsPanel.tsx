import type { PlacementResult } from '../types/placement.types'
import { formatPercent } from '../utils/formatVolume'
import { Badge } from './ui/Badge/Badge'
import { Button } from './ui/Button/Button'
import { Spinner } from './ui/Spinner/Spinner'

interface ResultsPanelProps {
  result: PlacementResult | null
  isOptimizing: boolean
  error: string | null
  onRecalculate: () => void
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

export function ResultsPanel({
  result,
  isOptimizing,
  error,
  onRecalculate,
}: ResultsPanelProps) {
  return (
    <section className="results-panel" aria-labelledby="results-title">
      <div className="results-panel__header">
        <div>
          <p className="panel-heading__eyebrow">Suivi</p>
          <h2 id="results-title">Résultats</h2>
        </div>
        <Button
          variant="primary"
          onClick={onRecalculate}
          disabled={isOptimizing}
        >
          {isOptimizing ? 'Calcul…' : 'Recalculer'}
        </Button>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {isOptimizing ? <Spinner label="Optimisation en cours…" /> : null}

      {result ? (
        <div className="results-panel__body">
          <div className="palletization-summary">
            <span className="palletization-summary__number">
              {result.pallets.length}
            </span>
            <div>
              <strong>
                palette{result.pallets.length > 1 ? 's' : ''} générée
                {result.pallets.length > 1 ? 's' : ''}
              </strong>
              <p>
                {result.pallets.reduce(
                  (total, pallet) => total + pallet.package_count,
                  0,
                )}{' '}
                colis répartis à l&apos;étape 2
              </p>
            </div>
          </div>
          <FillBar label="Remplissage volumique" rate={result.fill_rate_volume} />
          <FillBar label="Remplissage pondéral" rate={result.fill_rate_weight} />
          <div className="results-panel__unplaced">
            {result.unplaced_package_count > 0 ? (
              <div className="results-panel__alert" role="alert">
                <Badge variant="danger">
                  {result.unplaced_package_count} colis non réparti
                  {result.unplaced_package_count > 1 ? 's' : ''}
                </Badge>
                <p>
                  Certains colis dépassent la surface, la hauteur ou la charge
                  maximale de la palette sélectionnée.
                </p>
              </div>
            ) : result.unplaced_count > 0 ? (
              <div className="results-panel__alert" role="alert">
                <Badge variant="danger">
                  {result.unplaced_count} palette(s) non placée(s) dans le
                  conteneur
                </Badge>
                <p>
                  Conteneur saturé : choisissez un conteneur plus grand ou une
                  palette moins haute pour y placer tout le stock.
                </p>
              </div>
            ) : (
              <Badge variant="success">
                Tous les colis et toutes les palettes sont placés
              </Badge>
            )}
          </div>
        </div>
      ) : (
        !isOptimizing && (
          <p className="muted">Lancez un calcul pour voir les résultats.</p>
        )
      )}
    </section>
  )
}
