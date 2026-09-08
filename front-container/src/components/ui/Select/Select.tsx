import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { useId } from 'react'

import { Icon } from '../Icon'
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
    <TextField
      id={selectId}
      className="ui-field"
      label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      variant="outlined"
      size="small"
      fullWidth
      select
      slotProps={{
        inputLabel: { shrink: true, className: 'ui-label' },
        select: {
          className: 'ui-select',
          /* La liste peut être plus large que le champ, et un libellé long
             passe à la ligne : un MenuItem de MUI ne se replie pas seul, il
             se rogne. */
          MenuProps: {
            slotProps: { paper: { className: 'ui-select__menu' } },
          },
          IconComponent: ({ className }: { className?: string }) => (
            <Icon name="caret-down-solid" size="xs" className={className} />
          ),
        },
      }}
    >
      {options.map((option) => (
        <MenuItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  )
}
