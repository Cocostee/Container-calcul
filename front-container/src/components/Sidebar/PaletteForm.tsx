import type {
  PaletteFormErrors,
  PaletteFormValues,
} from '../../hooks/usePaletteForm'
import { Button } from '../ui/Button/Button'
import { Checkbox } from '../ui/Checkbox/Checkbox'
import { Input } from '../ui/Input/Input'
import { NumberInput } from '../ui/NumberInput/NumberInput'

interface PaletteFormProps {
  values: PaletteFormValues
  errors: PaletteFormErrors
  setField: <K extends keyof PaletteFormValues>(
    name: K,
    value: PaletteFormValues[K],
  ) => void
  submit: () => void
}

export function PaletteForm({
  values,
  errors,
  setField,
  submit,
}: PaletteFormProps) {
  return (
    <section className="sidebar-section">
      <h2>Ajouter des colis</h2>
      <form
        className="palette-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Input
          label="Référence du colis"
          value={values.label}
          onChange={(v) => setField('label', v)}
        />
        {errors.label ? (
          <p className="field-error" role="alert">
            {errors.label}
          </p>
        ) : null}
        <div className="field-grid">
          <NumberInput
            label="Longueur"
            unit="cm"
            value={values.length_cm}
            onChange={(v) => setField('length_cm', v)}
          />
          <NumberInput
            label="Largeur"
            unit="cm"
            value={values.width_cm}
            onChange={(v) => setField('width_cm', v)}
          />
          <NumberInput
            label="Hauteur"
            unit="cm"
            value={values.height_cm}
            onChange={(v) => setField('height_cm', v)}
          />
          <NumberInput
            label="Poids"
            unit="kg"
            value={values.weight_kg}
            onChange={(v) => setField('weight_kg', v)}
          />
          <NumberInput
            label="Quantité de colis"
            value={values.quantity}
            onChange={(v) => setField('quantity', v)}
          />
        </div>
        <div className="checkbox-row">
          <Checkbox
          label="Colis empilable"
            checked={values.stackable}
            onChange={(v) => setField('stackable', v)}
          />
          <Checkbox
          label="Rotation autorisée"
            checked={values.rotatable}
            onChange={(v) => setField('rotatable', v)}
          />
        </div>
        <Button variant="secondary" type="submit">
          Ajouter les colis
        </Button>
      </form>
    </section>
  )
}
