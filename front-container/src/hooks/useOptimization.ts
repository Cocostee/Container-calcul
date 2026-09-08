import { useCallback, useState } from 'react'

import { optimize } from '../api/projects.api'
import type { OptimizeRequest, PlacementResult } from '../types/placement.types'

/**
 * Lance la répartition des colis dans les conteneurs et suit son état.
 *
 * Le serveur peut ajouter des conteneurs pour absorber un débordement et les
 * enregistre lui-même : `didExtend` indique qu'il faut recharger le projet
 * pour récupérer ceux qui viennent d'apparaître.
 */
export function useOptimization() {
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (
      projectId: string,
      request: OptimizeRequest,
    ): Promise<{ result: PlacementResult; didExtend: boolean } | null> => {
      setIsOptimizing(true)
      setError(null)
      try {
        const computed = await optimize(projectId, request)
        setResult(computed)
        return {
          result: computed,
          didExtend: computed.containers.length > request.containers.length,
        }
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
