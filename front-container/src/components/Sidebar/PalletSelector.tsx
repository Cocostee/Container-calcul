import type { PaletteType } from '../../types/palette.types'
import { Select } from '../ui/Select/Select'

interface PalletSelectorProps {
  palletTypes: PaletteType[]
  value: string
  onChange: (value: string) => void
}

export function PalletSelector({
  palletTypes,
  value,
  onChange,
}: PalletSelectorProps) {
  const selected = palletTypes.find((type) => type.id === value)

  return (
    <section className="sidebar-section" aria-labelledby="pallet-title">
      <div>
        <p className="sidebar-section__eyebrow">Étape 1 · Palette</p>
        <h2 id="pallet-title">Palette de préparation</h2>
      </div>
      <Select
        label="Type de palette"
        value={value}
        options={palletTypes.map((type) => ({
          value: type.id,
          label: type.name,
        }))}
        onChange={onChange}
        disabled={palletTypes.length === 0}
      />
      {selected ? (
        <dl className="pallet-specs">
          <div>
            <dt>Surface utile</dt>
            <dd>
              {selected.length_cm} × {selected.width_cm} cm
            </dd>
          </div>
          <div>
            <dt>Hauteur de charge</dt>
            <dd>{selected.default_load_height_cm} cm</dd>
          </div>
          <div>
            <dt>Charge maximale</dt>
            <dd>{selected.max_weight_kg} kg</dd>
          </div>
        </dl>
      ) : (
        <p className="muted">Chargement des types de palettes…</p>
      )}
    </section>
  )
}
