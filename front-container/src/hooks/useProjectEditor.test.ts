import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createProject, updateProject } from '../api/projects.api'
import type { ContainerType } from '../types/container.types'
import type { PackageDraft, PaletteType } from '../types/palette.types'
import type { ContainerDraft } from '../types/project.types'
import { useProjectEditor } from './useProjectEditor'

/**
 * Ce module a porté deux fois le même défaut, sous deux formes : un geste
 * produisait une liste que ni le calcul ni l'enregistrement ne reprenaient,
 * parce qu'ils relisaient l'état — encore à sa valeur précédente dans le même
 * gestionnaire d'événement. La modification était alors calculée puis écrasée.
 *
 * D'où la règle que ces tests figent : **chaque geste rend la liste obtenue**,
 * et `save` comme `buildOptimizeRequest` acceptent de partir de cette liste.
 */

vi.mock('../api/projects.api', () => ({
  createProject: vi.fn(),
  getProject: vi.fn(),
  updateProject: vi.fn(),
}))

const CONTAINER_TYPES: ContainerType[] = [
  {
    id: '20ft',
    name: '20 pieds',
    length_cm: 589,
    width_cm: 235,
    height_cm: 239,
    max_weight_kg: 28230,
  },
  {
    id: '40ft',
    name: '40 pieds',
    length_cm: 1203,
    width_cm: 235,
    height_cm: 239,
    max_weight_kg: 26500,
  },
]

const PALLET_TYPES: PaletteType[] = [
  {
    id: 'epal',
    name: 'Europe',
    length_cm: 120,
    width_cm: 80,
    height_cm: 14.4,
    default_load_height_cm: 100,
    max_weight_kg: 1500,
  },
]

const COLIS = {
  palette_type_id: null,
  label: 'Charge',
  length_cm: 120,
  width_cm: 80,
  height_cm: 93,
  weight_kg: 300,
  quantity: 2,
  stackable: true,
  rotatable: true,
}

function editor() {
  return renderHook(() => useProjectEditor()).result
}

describe('les gestes sur le lot', () => {
  it('ajouter rend la liste obtenue, avec le colis dedans', () => {
    const result = editor()

    let next: PackageDraft[] | undefined
    act(() => {
      next = result.current.addPackage(COLIS)
    })

    expect(next).toHaveLength(1)
    expect(next![0].label).toBe('Charge')
    expect(result.current.packages).toHaveLength(1)
  })

  it('ajouter en masse verse tout le fichier à la fin du lot', () => {
    const result = editor()

    let next: PackageDraft[] | undefined
    act(() => {
      next = result.current.addPackages([COLIS, COLIS, COLIS])
    })

    expect(next).toHaveLength(3)
  })

  it('modifier rend la liste où le colis porte sa nouvelle valeur', () => {
    const result = editor()
    act(() => {
      result.current.addPackage(COLIS)
    })
    const clientId = result.current.packages[0].clientId

    let next: PackageDraft[] | undefined
    act(() => {
      next = result.current.updatePackage(clientId, { quantity: 9 })
    })

    expect(next![0].quantity).toBe(9)
  })

  it('dupliquer rend une liste plus longue d’un colis nommé « copie »', () => {
    const result = editor()
    act(() => {
      result.current.addPackage(COLIS)
    })

    let next: PackageDraft[] | undefined
    act(() => {
      next = result.current.duplicatePackage(
        result.current.packages[0].clientId,
      )
    })

    expect(next).toHaveLength(2)
    expect(next![1].label).toContain('copie')
    // La copie n'est pas encore enregistrée : elle ne doit pas hériter de
    // l'identifiant persistant de l'originale.
    expect(next![1].persistedId).toBeUndefined()
  })

  it('supprimer rend la liste sans le colis', () => {
    const result = editor()
    act(() => {
      result.current.addPackage(COLIS)
    })

    let next: PackageDraft[] | undefined
    act(() => {
      next = result.current.removePackage(
        result.current.packages[0].clientId,
      )
    })

    expect(next).toHaveLength(0)
  })

  it('donne un identifiant distinct à chaque colis', () => {
    const result = editor()

    act(() => {
      result.current.addPackages([COLIS, COLIS, COLIS])
    })

    const ids = result.current.packages.map((item) => item.clientId)
    expect(new Set(ids).size).toBe(3)
  })
})

describe('les gestes sur la flotte', () => {
  it('ajouter rend la liste obtenue', () => {
    const result = editor()

    let next: ContainerDraft[] | undefined
    act(() => {
      next = result.current.addContainer({
        container_type_id: '20ft',
        pallet_type_id: 'epal',
      })
    })

    expect(next).toHaveLength(1)
  })

  it('un conteneur ajouté reprend le dernier déclaré', () => {
    // On ajoute presque toujours « le même en plus ».
    const result = editor()
    act(() => {
      result.current.addContainer({
        container_type_id: '40ft',
        pallet_type_id: 'epal',
      })
    })

    let next: ContainerDraft[] | undefined
    act(() => {
      next = result.current.addContainer()
    })

    expect(next![1].container_type_id).toBe('40ft')
    expect(next![1].pallet_type_id).toBe('epal')
  })

  it('poser un format de palette le met sur toute l’expédition', () => {
    const result = editor()
    act(() => {
      result.current.addContainer({ container_type_id: '20ft' })
      result.current.addContainer({ container_type_id: '40ft' })
    })

    let next: ContainerDraft[] | undefined
    act(() => {
      next = result.current.setAllPallets('epal')
    })

    expect(next!.every((entry) => entry.pallet_type_id === 'epal')).toBe(true)
  })

  it('modifier rend la liste où le conteneur porte sa nouvelle taille', () => {
    const result = editor()
    act(() => {
      result.current.addContainer({ container_type_id: '20ft' })
    })

    let next: ContainerDraft[] | undefined
    act(() => {
      next = result.current.updateContainer(
        result.current.containers[0].clientId,
        { container_type_id: '40ft' },
      )
    })

    expect(next![0].container_type_id).toBe('40ft')
  })
})

describe('la requête de calcul', () => {
  let result: ReturnType<typeof editor>

  beforeEach(() => {
    result = editor()
    act(() => {
      result.current.addPackage(COLIS)
      result.current.addContainer({
        container_type_id: '20ft',
        pallet_type_id: 'epal',
      })
    })
  })

  it('décrit le lot et la flotte enregistrés', () => {
    const request = result.current.buildOptimizeRequest(
      CONTAINER_TYPES,
      PALLET_TYPES,
    )

    expect(request!.packages).toHaveLength(1)
    expect(request!.containers).toHaveLength(1)
    expect(request!.containers[0].container.name).toBe('20 pieds')
    expect(request!.containers[0].pallet!.id).toBe('epal')
  })

  it('part de la flotte fournie plutôt que de l’état', () => {
    // Le geste vient d'ajouter un 40 pieds ; le calcul doit en tenir compte
    // sans attendre le rendu suivant.
    const containers = [
      ...result.current.containers,
      {
        clientId: 'brouillon-2',
        container_type_id: '40ft',
        container_custom_dims: null,
        pallet_type_id: 'epal',
      },
    ]

    const request = result.current.buildOptimizeRequest(
      CONTAINER_TYPES,
      PALLET_TYPES,
      true,
      { containers },
    )

    expect(request!.containers).toHaveLength(2)
    expect(request!.containers[1].container.name).toBe('40 pieds')
  })

  it('part du lot fourni plutôt que de l’état', () => {
    const packages = [
      ...result.current.packages,
      { ...COLIS, clientId: 'brouillon-2' },
    ]

    const request = result.current.buildOptimizeRequest(
      CONTAINER_TYPES,
      PALLET_TYPES,
      true,
      { packages },
    )

    expect(request!.packages).toHaveLength(2)
  })

  it('sans palette, le conteneur reçoit des charges déjà montées', () => {
    act(() => {
      result.current.updateContainer(result.current.containers[0].clientId, {
        pallet_type_id: null,
      })
    })

    const request = result.current.buildOptimizeRequest(
      CONTAINER_TYPES,
      PALLET_TYPES,
    )

    expect(request!.containers[0].pallet).toBeNull()
  })

  it('ne rend rien sans conteneur', () => {
    const vide = editor()
    act(() => {
      vide.current.addPackage(COLIS)
    })

    expect(
      vide.current.buildOptimizeRequest(CONTAINER_TYPES, PALLET_TYPES),
    ).toBeNull()
  })

  it('ne rend rien sans colis', () => {
    const vide = editor()
    act(() => {
      vide.current.addContainer({ container_type_id: '20ft' })
    })

    expect(
      vide.current.buildOptimizeRequest(CONTAINER_TYPES, PALLET_TYPES),
    ).toBeNull()
  })

  it('ne rend rien pour une taille de conteneur inconnue', () => {
    act(() => {
      result.current.updateContainer(result.current.containers[0].clientId, {
        container_type_id: 'disparu',
      })
    })

    expect(
      result.current.buildOptimizeRequest(CONTAINER_TYPES, PALLET_TYPES),
    ).toBeNull()
  })

  it('reporte le drapeau d’extension automatique', () => {
    const sans = result.current.buildOptimizeRequest(
      CONTAINER_TYPES,
      PALLET_TYPES,
      false,
    )

    expect(sans!.auto_extend).toBe(false)
  })
})

describe("l'enregistrement", () => {
  beforeEach(() => {
    vi.mocked(createProject).mockReset()
    vi.mocked(updateProject).mockReset()
    // Le service rend le projet enregistré ; ici, un projet vide suffit.
    vi.mocked(createProject).mockResolvedValue({
      id: 'projet-1',
      name: 'Essai',
      packages: [],
      containers: [],
      last_result: null,
    } as never)
  })

  it('envoie le lot et la flotte de l’état', async () => {
    const result = editor()
    act(() => {
      result.current.addPackage(COLIS)
      result.current.addContainer({
        container_type_id: '20ft',
        pallet_type_id: 'epal',
      })
    })

    await act(async () => {
      await result.current.save()
    })

    const payload = vi.mocked(createProject).mock.calls[0][0]
    expect(payload.packages).toHaveLength(1)
    expect(payload.containers).toHaveLength(1)
  })

  it('envoie la flotte fournie plutôt que celle de l’état', async () => {
    // Le défaut d'origine : le calcul partait de la nouvelle liste, mais
    // l'enregistrement de l'ancienne, puis écrasait les brouillons avec.
    const result = editor()
    act(() => {
      result.current.addPackage(COLIS)
    })

    const containers = [
      {
        clientId: 'brouillon-1',
        container_type_id: '40ft',
        container_custom_dims: null,
        pallet_type_id: 'epal',
      },
    ]

    await act(async () => {
      await result.current.save(undefined, { containers })
    })

    const payload = vi.mocked(createProject).mock.calls[0][0]
    expect(payload.containers).toHaveLength(1)
    expect(payload.containers[0].container_type_id).toBe('40ft')
  })

  it('envoie le lot fourni plutôt que celui de l’état', async () => {
    const result = editor()

    await act(async () => {
      await result.current.save(undefined, {
        packages: [{ ...COLIS, clientId: 'brouillon-1' }],
      })
    })

    const payload = vi.mocked(createProject).mock.calls[0][0]
    expect(payload.packages).toHaveLength(1)
  })

  it('ne garde les cotes libres que pour un conteneur personnalisé', async () => {
    const result = editor()
    act(() => {
      result.current.addContainer({
        container_type_id: '20ft',
        container_custom_dims: {
          length_cm: 1,
          width_cm: 1,
          height_cm: 1,
          max_weight_kg: 1,
        },
      })
    })

    await act(async () => {
      await result.current.save()
    })

    const payload = vi.mocked(createProject).mock.calls[0][0]
    expect(payload.containers[0].container_custom_dims).toBeNull()
  })

  it('signale l’échec sans perdre le brouillon', async () => {
    vi.mocked(createProject).mockRejectedValue(new Error('serveur muet'))
    const result = editor()
    act(() => {
      result.current.addPackage(COLIS)
    })

    await act(async () => {
      const saved = await result.current.save()
      expect(saved).toBeNull()
    })

    expect(result.current.saveError).toBe('serveur muet')
    expect(result.current.packages).toHaveLength(1)
  })
})
