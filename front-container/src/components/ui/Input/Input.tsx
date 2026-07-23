import { useId } from 'react'

import type { InputProps } from './Input.types'

export function Input({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  id,
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label className="ui-field" htmlFor={inputId}>
      <span className="ui-label">{label}</span>
      <input
        id={inputId}
        className="ui-input"
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
