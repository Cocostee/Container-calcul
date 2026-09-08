import { useEffect, useState } from 'react'

import { getPaletteTypes } from '../api/paletteTypes.api'
import type { PaletteType } from '../types/palette.types'

// Charge les formats de palette une fois pour toutes.
export function usePaletteTypes() {
  const [paletteTypes, setPaletteTypes] = useState<PaletteType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getPaletteTypes()
      .then((data) => {
        if (active) setPaletteTypes(data)
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { paletteTypes, loading, error }
}
