import { useEffect, useState } from 'react'

import { getContainerTypes } from '../api/containerTypes.api'
import type { ContainerType } from '../types/container.types'

// Fetch and cache the predefined container types once.
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
