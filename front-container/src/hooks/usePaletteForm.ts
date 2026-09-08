import { useState } from 'react'
import { z } from 'zod'

import type {
  PackageDraft,
  PackageLineInput,
} from '../types/palette.types'
import { DEFAULT_PACKAGE_FORM } from '../utils/constants'

// La validation du formulaire de colis vit dans le hook, pas dans la vue.
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

/**
 * Pilote le formulaire du rail latéral, qui sert à deux choses : ajouter un
 * colis, ou modifier celui choisi dans le tableau. `editingId` dit lequel des
 * deux, et c'est la seule différence — les champs et la validation sont les
 * mêmes, et deux formulaires auraient fini par diverger.
 */
export function usePaletteForm(
  onAdd: (values: PackageLineInput) => void,
  onUpdate: (clientId: string, patch: Partial<PackageLineInput>) => void,
) {
  const [values, setValues] = useState<PaletteFormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<PaletteFormErrors>({})
  const [editingId, setEditingId] = useState<string | null>(null)

  const setField = <K extends keyof PaletteFormValues>(
    name: K,
    value: PaletteFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  /** Charge une ligne du tableau dans le formulaire. */
  const beginEdit = (item: PackageDraft) => {
    setValues({
      label: item.label,
      palette_type_id: item.palette_type_id ?? null,
      length_cm: item.length_cm,
      width_cm: item.width_cm,
      height_cm: item.height_cm,
      weight_kg: item.weight_kg,
      quantity: item.quantity,
      stackable: item.stackable,
      rotatable: item.rotatable,
    })
    setErrors({})
    setEditingId(item.clientId)
  }

  /** Abandonne la modification et rend le formulaire à l'ajout. */
  const cancelEdit = () => {
    setValues(EMPTY_FORM)
    setErrors({})
    setEditingId(null)
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
    if (editingId) {
      onUpdate(editingId, parsed.data)
      setEditingId(null)
    } else {
      onAdd(parsed.data)
    }
    setValues(EMPTY_FORM)
  }

  return { values, errors, editingId, setField, submit, beginEdit, cancelEdit }
}
