import { useCallback, useEffect, useState } from 'react'

import { getSizeAdvice } from '../api/projects.api'
import type { SizeAdvice } from '../types/placement.types'

interface Loaded {
  projectId: string
  palletTypeId: string | null
  palletize: boolean
  advice: SizeAdvice
}

/**
 * Recommandations de taille pour le lot de colis du projet : combien de
 * conteneurs chaque format demanderait, combien de palettes chaque format
 * monterait. Alimente les badges des sélecteurs.
 *
 * `palletize` à `false` dit « pas de palette du tout » : les conteneurs sont
 * alors comparés sur des charges déjà montées, comme le calcul le fera. Sans
 * cette distinction, un format de palette absent voudrait dire « choisis pour
 * moi » et le chiffre annoncé ne serait pas celui du plan.
 *
 * L'état retient à quoi la réponse appartient, et n'est exposé que s'il
 * correspond encore à la demande : une recommandation périmée ne s'affiche
 * jamais pendant qu'une nouvelle arrive.
 */
export function useSizeAdvice(
  projectId: string | null,
  palletTypeId: string | null,
  palletize = true,
) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [token, setToken] = useState(0)

  /** Redemande les recommandations, après un calcul ou un enregistrement. */
  const refresh = useCallback(() => setToken((value) => value + 1), [])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false

    void getSizeAdvice(projectId, palletTypeId, palletize)
      .then((advice) => {
        if (!cancelled) {
          setLoaded({ projectId, palletTypeId, palletize, advice })
        }
      })
      .catch(() => {
        // Une recommandation absente n'empêche pas de travailler : les badges
        // disparaissent simplement.
        if (!cancelled) setLoaded(null)
      })

    return () => {
      cancelled = true
    }
  }, [projectId, palletTypeId, palletize, token])

  const advice =
    loaded &&
    loaded.projectId === projectId &&
    loaded.palletTypeId === palletTypeId &&
    loaded.palletize === palletize
      ? loaded.advice
      : null

  return { advice, refresh }
}
