import type {
  PaletteFormErrors,
  PaletteFormValues,
} from '../../hooks/usePaletteForm'
import type { PaletteType } from '../../types/palette.types'
import { CUSTOM_PALETTE_VALUE } from '../../utils/constants'
import { Button } from '../ui/Button/Button'
import { Checkbox } from '../ui/Checkbox/Checkbox'
import { Input } from '../ui/Input/Input'
import { NumberInput } from '../ui/NumberInput/NumberInput'
import { Select } from '../ui/Select/Select'
import type { SelectOption } from '../ui/Select/Select.types'

interface PaletteFormProps {
  paletteTypes: PaletteType[]
  values: PaletteFormValues
  errors: PaletteFormErrors
  setField: <K extends keyof PaletteFormValues>(
    name: K,
    value: PaletteFormValues[K],
  ) => void
  applyType: (type: PaletteType | null) => void
  submit: () => void
}

export function PaletteForm({
  paletteTypes,
  values,
  errors,
  setField,
  applyType,
  submit,
}: PaletteFormProps) {
  const options: SelectOption[] = [
    ...paletteTypes.map((type) => ({ value: type.id, label: type.name })),
    { value: CUSTOM_PALETTE_VALUE, label: 'Personnalisée' },
  ]

  const onTypeChange = (value: string) => {
    if (value === CUSTOM_PALETTE_VALUE) {
      applyType(null)
      return
    }
    applyType(paletteTypes.find((type) => type.id === value) ?? null)
  }

  return (
    <section className="sidebar-section">
      <h2>Ajouter une palette</h2>
      <form
        className="palette-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Select
          label="Type de palette"
          value={values.palette_type_id ?? CUSTOM_PALETTE_VALUE}
          options={options}
          onChange={onTypeChange}
        />
        <Input
          label="Label"
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
            label="Hauteur charge"
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
            label="Quantité"
            value={values.quantity}
            onChange={(v) => setField('quantity', v)}
          />
        </div>
        <div className="checkbox-row">
          <Checkbox
            label="Empilable"
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
          Ajouter au projet
        </Button>
      </form>
    </section>
  )
}
