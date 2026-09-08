import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
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
    <TextField
      id={inputId}
      className="ui-field"
      label={label}
      type="number"
      // Un champ vide renvoie NaN : les appelants s'appuient sur ce contrat
      // pour distinguer « effacé » de « zéro ».
      value={Number.isFinite(value) ? value : ''}
      disabled={disabled}
      onChange={(event) => {
        // MUI type la cible comme input OU textarea : on relit la valeur
        // texte, ce qui reproduit valueAsNumber (NaN quand le champ est vide).
        const raw = event.target.value
        onChange(raw === '' ? Number.NaN : Number(raw))
      }}
      variant="outlined"
      size="small"
      fullWidth
      slotProps={{
        inputLabel: { shrink: true, className: 'ui-label' },
        input: {
          className: 'ui-input',
          endAdornment: unit ? (
            <InputAdornment position="end" className="ui-unit">
              {unit}
            </InputAdornment>
          ) : undefined,
        },
        htmlInput: { min, step },
      }}
    />
  )
}
