import { useId } from 'react'

import type { SelectProps } from './Select.types'

export function Select({
  label,
  value,
  options,
  onChange,
  disabled,
  id,
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <label className="ui-field" htmlFor={selectId}>
      <span className="ui-label">{label}</span>
      <select
        id={selectId}
        className="ui-select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
