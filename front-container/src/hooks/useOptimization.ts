import { useCallback, useState } from 'react'

import { optimize } from '../api/projects.api'
import type { OptimizeRequest, PlacementResult } from '../types/placement.types'

// Runs the optimization call and tracks loading / error / result state.
export function useOptimization() {
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (
      projectId: string,
      request: OptimizeRequest,
    ): Promise<PlacementResult | null> => {
      setIsOptimizing(true)
      setError(null)
      try {
        const computed = await optimize(projectId, request)
        setResult(computed)
        return computed
      } catch (err) {
        setError((err as Error).message)
        return null
      } finally {
        setIsOptimizing(false)
      }
    },
    [],
  )

  return { result, isOptimizing, error, run, setResult }
}
