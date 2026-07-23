import type {
  ContainerCustomDims,
  ContainerType,
} from '../../types/container.types'
import { CUSTOM_CONTAINER_VALUE } from '../../utils/constants'
import { NumberInput } from '../ui/NumberInput/NumberInput'
import { Select } from '../ui/Select/Select'
import type { SelectOption } from '../ui/Select/Select.types'

interface ContainerSelectorProps {
  containerTypes: ContainerType[]
  value: string
  onChange: (value: string) => void
  customDims: ContainerCustomDims
  onCustomDimChange: (field: keyof ContainerCustomDims, value: number) => void
}

export function ContainerSelector({
  containerTypes,
  value,
  onChange,
  customDims,
  onCustomDimChange,
}: ContainerSelectorProps) {
  const options: SelectOption[] = [
    ...containerTypes.map((type) => ({ value: type.id, label: type.name })),
    { value: CUSTOM_CONTAINER_VALUE, label: 'Personnalisé' },
  ]

  const isCustom = value === CUSTOM_CONTAINER_VALUE

  return (
    <section className="sidebar-section" aria-labelledby="container-title">
      <div>
        <p className="sidebar-section__eyebrow">Étape 1 · Conteneur</p>
        <h2 id="container-title">Configuration du conteneur</h2>
      </div>
      <Select
        label="Type de conteneur"
        value={value}
        options={options}
        onChange={onChange}
      />
      {isCustom ? (
        <div className="field-grid">
          <NumberInput
            label="Longueur"
            unit="cm"
            value={customDims.length_cm}
            onChange={(v) => onCustomDimChange('length_cm', v)}
          />
          <NumberInput
            label="Largeur"
            unit="cm"
            value={customDims.width_cm}
            onChange={(v) => onCustomDimChange('width_cm', v)}
          />
          <NumberInput
            label="Hauteur"
            unit="cm"
            value={customDims.height_cm}
            onChange={(v) => onCustomDimChange('height_cm', v)}
          />
          <NumberInput
            label="Poids max"
            unit="kg"
            value={customDims.max_weight_kg}
            onChange={(v) => onCustomDimChange('max_weight_kg', v)}
          />
        </div>
      ) : null}
    </section>
  )
}
