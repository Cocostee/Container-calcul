import { useState } from 'react'
import { z } from 'zod'

import type { PaletteInstanceInput } from '../types/palette.types'
import { DEFAULT_PACKAGE_FORM } from '../utils/constants'

// Validation for the "add package" form (kept in the hook, not the component).
const paletteFormSchema = z.object({
  label: z.string().min(1, 'Label requis'),
  palette_type_id: z.string().nullable(),
  length_cm: z.number().positive('Longueur > 0'),
  width_cm: z.number().positive('Largeur > 0'),
  height_cm: z.number().positive('Hauteur > 0'),
  weight_kg: z.number().nonnegative('Poids >= 0'),
  quantity: z.number().int().min(1, 'Quantité >= 1'),
  stackable: z.boolean(),
  rotatable: z.boolean(),
})

export type PaletteFormValues = z.infer<typeof paletteFormSchema>
export type PaletteFormErrors = Partial<Record<keyof PaletteFormValues, string>>

const EMPTY_FORM: PaletteFormValues = {
  label: '',
  palette_type_id: null,
  ...DEFAULT_PACKAGE_FORM,
}

// Drives the add-package form; calls onAdd with a valid package line on submit.
export function usePaletteForm(onAdd: (values: PaletteInstanceInput) => void) {
  const [values, setValues] = useState<PaletteFormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<PaletteFormErrors>({})

  const setField = <K extends keyof PaletteFormValues>(
    name: K,
    value: PaletteFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const submit = () => {
    const parsed = paletteFormSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: PaletteFormErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof PaletteFormValues
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    onAdd(parsed.data)
    setValues(EMPTY_FORM)
  }

  return { values, errors, setField, submit }
}
