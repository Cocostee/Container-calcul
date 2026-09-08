import TextField from '@mui/material/TextField'
import { useId } from 'react'

import type { InputProps } from './Input.types'

export function Input({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  autoFocus,
  id,
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <TextField
      id={inputId}
      className="ui-field"
      label={label}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      variant="outlined"
      size="small"
      fullWidth
      slotProps={{
        inputLabel: { shrink: true, className: 'ui-label' },
        input: { className: 'ui-input' },
      }}
    />
  )
}
