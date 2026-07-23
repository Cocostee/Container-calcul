import { useId } from 'react'

import type { NumberInputProps } from './NumberInput.types'

export function NumberInput({
  label,
  value,
  onChange,
  unit,
  min = 0,
  step = 1,
  disabled,
  id,
}: NumberInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label className="ui-field" htmlFor={inputId}>
      <span className="ui-label">{label}</span>
      <span className="ui-number-input">
        <input
          id={inputId}
          className="ui-input"
          type="number"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          step={step}
          disabled={disabled}
          onChange={(event) => onChange(event.target.valueAsNumber)}
        />
        {unit ? <span className="ui-unit">{unit}</span> : null}
      </span>
    </label>
  )
}
