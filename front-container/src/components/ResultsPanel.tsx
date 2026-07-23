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
    <section className="results-panel">
      <div className="results-panel__header">
        <h2>Résultats</h2>
        <Button
          variant="primary"
          onClick={onRecalculate}
          disabled={isOptimizing}
        >
          {isOptimizing ? 'Calcul…' : 'Recalculer'}
        </Button>
      </div>

      {error ? <p className="field-error">{error}</p> : null}
      {isOptimizing ? <Spinner label="Optimisation en cours…" /> : null}

      {result ? (
        <div className="results-panel__body">
          <FillBar label="Remplissage volumique" rate={result.fill_rate_volume} />
          <FillBar label="Remplissage pondéral" rate={result.fill_rate_weight} />
          <div className="results-panel__unplaced">
            {result.unplaced_count > 0 ? (
              <div className="results-panel__alert" role="alert">
                <Badge variant="danger">
                  {result.unplaced_count} palette(s) non placée(s)
                </Badge>
                <p>
                  Conteneur saturé : impossible d&apos;ajouter davantage de
                  palettes. Retirez-en, réduisez les dimensions ou choisissez un
                  conteneur plus grand.
                </p>
              </div>
            ) : (
              <Badge variant="success">Toutes les palettes placées</Badge>
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
