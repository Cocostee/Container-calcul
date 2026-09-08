import FormControlLabel from '@mui/material/FormControlLabel'
import MuiCheckbox from '@mui/material/Checkbox'
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
    <FormControlLabel
      className={`ui-checkbox ${className}`.trim()}
      htmlFor={checkboxId}
      disabled={disabled}
      control={
        <MuiCheckbox
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          size="small"
        />
      }
      label={<span>{label}</span>}
    />
  )
}
