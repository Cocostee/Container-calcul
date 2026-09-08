import { useEffect, useState } from 'react'

import { getContainerTypes } from '../api/containerTypes.api'
import type { ContainerType } from '../types/container.types'

// Charge les tailles de conteneur une fois pour toutes.
export function useContainerTypes() {
  const [containerTypes, setContainerTypes] = useState<ContainerType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getContainerTypes()
      .then((data) => {
        if (active) setContainerTypes(data)
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

  return { containerTypes, loading, error }
}
