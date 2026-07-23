import { useId } from 'react'

import type { CheckboxProps } from './Checkbox.types'

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  id,
  className = '',
}: CheckboxProps) {
  const generatedId = useId()
  const checkboxId = id ?? generatedId

  return (
    <label className={`ui-checkbox ${className}`.trim()} htmlFor={checkboxId}>
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}
