import type { OptimizeContainer } from '../types/placement.types'
import type { PaletteType } from '../types/palette.types'

interface ConfigurationSummaryProps {
  containerName: string
  container: OptimizeContainer | null
  pallet: PaletteType | null
  palletLabel?: string
  step: number
}

/** Read-only context for steps that must not expose configuration controls. */
export function ConfigurationSummary({
  containerName,
  container,
  pallet,
  palletLabel,
  step,
}: ConfigurationSummaryProps) {
  return (
    <section className="sidebar-section configuration-summary" aria-labelledby="selection-title">
      <div>
        <p className="sidebar-section__eyebrow">Étape {step} · Sélection</p>
        <h2 id="selection-title">Configuration choisie</h2>
      </div>
      <dl>
        <div>
          <dt>Conteneur</dt>
          <dd>{containerName}</dd>
          {container ? (
            <small>
              {container.length_cm} × {container.width_cm} ×{' '}
              {container.height_cm} cm
            </small>
          ) : null}
        </div>
        <div>
          <dt>Palette</dt>
          <dd>{pallet?.name ?? palletLabel ?? 'Non sélectionnée'}</dd>
          {pallet ? (
            <small>
              {pallet.length_cm} × {pallet.width_cm} cm · charge{' '}
              {pallet.max_weight_kg} kg
            </small>
          ) : null}
        </div>
      </dl>
      <p className="configuration-summary__note">
        Cette étape est en lecture seule. Revenez à l&apos;étape 1 pour modifier
        la configuration.
      </p>
    </section>
  )
}
