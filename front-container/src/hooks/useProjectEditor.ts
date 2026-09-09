import { useCallback, useState } from 'react'

import { createProject, getProject, updateProject } from '../api/projects.api'
import type {
  ContainerCustomDims,
  ContainerType,
} from '../types/container.types'
import type { PaletteType } from '../types/palette.types'
import type { PackageDraft, PackageLineInput } from '../types/palette.types'
import type {
  OptimizeContainerInput,
  OptimizeRequest,
} from '../types/placement.types'
import type {
  ContainerDraft,
  Project,
  ProjectPayload,
} from '../types/project.types'
import { DEFAULT_CONTAINER_CUSTOM_DIMS } from '../utils/constants'

/** Listes à substituer à l'état, le temps d'un geste. */
export interface EditorOverrides {
  packages?: PackageDraft[]
  containers?: ContainerDraft[]
}

let draftCounter = 0
function nextClientId(): string {
  draftCounter += 1
  return `draft-${draftCounter}`
}

/**
 * État du projet en cours d'édition : le lot de colis et la liste des
 * conteneurs qui le recevront, chacun avec sa taille et son format de palette.
 *
 * Un projet est une expédition, pas un conteneur : c'est le calcul qui répartit
 * les colis, et il peut ajouter des conteneurs si le lot déborde.
 */
export function useProjectEditor() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [name, setName] = useState('Nouveau projet')
  const [packages, setPackages] = useState<PackageDraft[]>([])
  const [containers, setContainers] = useState<ContainerDraft[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  /* ---------------------------------------------------------- Les colis - */

  /*
   * Comme les gestes sur les conteneurs, ceux du lot rendent la liste
   * obtenue : l'appelant peut enregistrer et recalculer dans le même geste,
   * sans attendre le rendu suivant.
   */

  const addPackage = useCallback(
    (input: PackageLineInput): PackageDraft[] => {
      const next = [...packages, { ...input, clientId: nextClientId() }]
      setPackages(next)
      return next
    },
    [packages],
  )

  /** Un fichier de commande d'un coup, à la fin du lot. */
  const addPackages = useCallback(
    (lines: PackageLineInput[]): PackageDraft[] => {
      const next = [
        ...packages,
        ...lines.map((line) => ({ ...line, clientId: nextClientId() })),
      ]
      setPackages(next)
      return next
    },
    [packages],
  )

  const updatePackage = useCallback(
    (clientId: string, patch: Partial<PackageLineInput>): PackageDraft[] => {
      const next = packages.map((item) =>
        item.clientId === clientId ? { ...item, ...patch } : item,
      )
      setPackages(next)
      return next
    },
    [packages],
  )

  const duplicatePackage = useCallback(
    (clientId: string): PackageDraft[] => {
      const found = packages.find((item) => item.clientId === clientId)
      if (!found) return packages
      const next = [
        ...packages,
        {
          ...found,
          clientId: nextClientId(),
          persistedId: undefined,
          label: `${found.label} (copie)`,
        },
      ]
      setPackages(next)
      return next
    },
    [packages],
  )

  const removePackage = useCallback(
    (clientId: string): PackageDraft[] => {
      const next = packages.filter((item) => item.clientId !== clientId)
      setPackages(next)
      return next
    },
    [packages],
  )

  /* ----------------------------------------------------- Les conteneurs - */

  /*
   * Les trois gestes sur la liste des conteneurs rendent la liste obtenue.
   * Le plan doit être recalculé dans le même geste — l'appelant n'a pas à
   * attendre le rendu suivant pour connaître la configuration à envoyer.
   */

  const addContainer = useCallback(
    (input?: Partial<ContainerDraft>): ContainerDraft[] => {
      // Un nouveau conteneur reprend par défaut le dernier déclaré : on
      // ajoute presque toujours « le même en plus ».
      const template = containers[containers.length - 1]
      const next = [
        ...containers,
        {
          clientId: nextClientId(),
          container_type_id:
            input?.container_type_id ?? template?.container_type_id ?? null,
          container_custom_dims:
            input?.container_custom_dims ??
            template?.container_custom_dims ??
            null,
          pallet_type_id:
            input?.pallet_type_id ?? template?.pallet_type_id ?? null,
        },
      ]
      setContainers(next)
      return next
    },
    [containers],
  )

  const updateContainer = useCallback(
    (clientId: string, patch: Partial<ContainerDraft>): ContainerDraft[] => {
      const next = containers.map((item) =>
        item.clientId === clientId ? { ...item, ...patch } : item,
      )
      setContainers(next)
      return next
    },
    [containers],
  )

  /** Le meme format de palette sur toute l'expedition, d'un seul geste. */
  const setAllPallets = useCallback(
    (palletTypeId: string): ContainerDraft[] => {
      const next = containers.map((item) => ({
        ...item,
        pallet_type_id: palletTypeId,
      }))
      setContainers(next)
      return next
    },
    [containers],
  )

  const removeContainer = useCallback(
    (clientId: string): ContainerDraft[] => {
      const next = containers.filter((item) => item.clientId !== clientId)
      setContainers(next)
      return next
    },
    [containers],
  )

  const setContainerCustomDim = useCallback(
    (
      clientId: string,
      field: keyof ContainerCustomDims,
      value: number,
    ): ContainerDraft[] => {
      const next = containers.map((item) =>
        item.clientId === clientId
          ? {
              ...item,
              container_custom_dims: {
                ...(item.container_custom_dims ??
                  DEFAULT_CONTAINER_CUSTOM_DIMS),
                [field]: value,
              },
            }
          : item,
      )
      setContainers(next)
      return next
    },
    [containers],
  )

  /* ------------------------------------------------------ Chargement/état - */

  const reset = useCallback(() => {
    setProjectId(null)
    setName('Nouveau projet')
    setPackages([])
    setContainers([])
    setSaveError(null)
  }, [])

  const loadProject = useCallback((project: Project) => {
    setProjectId(project.id)
    setName(project.name)
    setPackages(
      project.packages.map((item) => ({
        clientId: nextClientId(),
        persistedId: item.id,
        palette_type_id: item.palette_type_id,
        label: item.label,
        length_cm: item.length_cm,
        width_cm: item.width_cm,
        height_cm: item.height_cm,
        weight_kg: item.weight_kg,
        quantity: item.quantity,
        stackable: item.stackable,
        rotatable: item.rotatable,
      })),
    )
    setContainers(
      project.containers.map((item) => ({
        clientId: nextClientId(),
        persistedId: item.id,
        container_type_id: item.container_type_id,
        container_custom_dims: item.container_custom_dims,
        pallet_type_id: item.pallet_type_id,
      })),
    )
    setSaveError(null)
  }, [])

  const loadProjectById = useCallback(
    async (id: string): Promise<Project | null> => {
      try {
        const project = await getProject(id)
        loadProject(project)
        return project
      } catch (err) {
        setSaveError((err as Error).message)
        return null
      }
    },
    [loadProject],
  )

  /*
   * `overrides` : les listes que le geste vient de produire. Sans elles,
   * l'enregistrement repartirait de l'état, encore à sa valeur précédente
   * dans le même gestionnaire d'événement, et la modification serait perdue.
   */
  const buildPayload = useCallback(
    (projectName?: string, overrides?: EditorOverrides): ProjectPayload => ({
      name: (projectName ?? name).trim() || 'Projet sans nom',
      packages: (overrides?.packages ?? packages).map((item) => ({
        palette_type_id: item.palette_type_id,
        label: item.label,
        length_cm: item.length_cm,
        width_cm: item.width_cm,
        height_cm: item.height_cm,
        weight_kg: item.weight_kg,
        quantity: item.quantity,
        stackable: item.stackable,
        rotatable: item.rotatable,
      })),
      containers: (overrides?.containers ?? containers).map((item) => ({
        container_type_id: item.container_type_id,
        container_custom_dims:
          item.container_type_id === null ? item.container_custom_dims : null,
        pallet_type_id: item.pallet_type_id,
      })),
    }),
    [name, packages, containers],
  )

  const save = useCallback(
    async (
      projectName?: string,
      overrides?: EditorOverrides,
    ): Promise<Project | null> => {
      setIsSaving(true)
      setSaveError(null)
      try {
        const payload = buildPayload(projectName, overrides)
        const saved = projectId
          ? await updateProject(projectId, payload)
          : await createProject(payload)
        loadProject(saved)
        return saved
      } catch (err) {
        setSaveError((err as Error).message)
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [buildPayload, loadProject, projectId],
  )

  /* ------------------------------------------------- Requête de calcul - */

  /** Enveloppe d'un conteneur : son type de référence ou ses dimensions libres. */
  const resolveContainer = useCallback(
    (draft: ContainerDraft, containerTypes: ContainerType[]) => {
      if (draft.container_type_id === null) {
        const dims = draft.container_custom_dims ?? DEFAULT_CONTAINER_CUSTOM_DIMS
        return {
          name: null,
          length_cm: dims.length_cm,
          width_cm: dims.width_cm,
          height_cm: dims.height_cm,
          max_weight_kg: dims.max_weight_kg,
        }
      }
      const type = containerTypes.find(
        (candidate) => candidate.id === draft.container_type_id,
      )
      if (!type) return null
      return {
        name: type.name,
        length_cm: type.length_cm,
        width_cm: type.width_cm,
        height_cm: type.height_cm,
        max_weight_kg: type.max_weight_kg,
      }
    },
    [],
  )

  const buildOptimizeRequest = useCallback(
    (
      containerTypes: ContainerType[],
      palletTypes: PaletteType[],
      autoExtend = true,
      /* Listes à utiliser au lieu de l'état : elles permettent de calculer
         dans le geste même qui vient de modifier le lot ou la flotte. */
      overrides?: EditorOverrides,
    ): OptimizeRequest | null => {
      const declared = overrides?.containers ?? containers
      const lot = overrides?.packages ?? packages
      if (declared.length === 0 || lot.length === 0) return null

      const slots: OptimizeContainerInput[] = []
      for (const draft of declared) {
        const envelope = resolveContainer(draft, containerTypes)
        if (!envelope) return null

        const palletType = palletTypes.find(
          (candidate) => candidate.id === draft.pallet_type_id,
        )
        slots.push({
          id: draft.persistedId ?? null,
          container: envelope,
          // Sans format de palette, le conteneur reçoit des charges déjà
          // montées : c'est le cas d'un plan importé.
          pallet: palletType
            ? {
                id: palletType.id,
                label: palletType.name,
                length_cm: palletType.length_cm,
                width_cm: palletType.width_cm,
                base_height_cm: palletType.height_cm,
                max_load_height_cm: palletType.default_load_height_cm,
                max_weight_kg: palletType.max_weight_kg,
              }
            : null,
        })
      }

      return {
        packages: lot.map((item) => ({
          instance_id: item.clientId,
          label: item.label,
          length_cm: item.length_cm,
          width_cm: item.width_cm,
          height_cm: item.height_cm,
          weight_kg: item.weight_kg,
          quantity: item.quantity,
          stackable: item.stackable,
          rotatable: item.rotatable,
        })),
        containers: slots,
        auto_extend: autoExtend,
      }
    },
    [containers, packages, resolveContainer],
  )


  return {
    projectId,
    name,
    setName,
    packages,
    addPackage,
    addPackages,
    updatePackage,
    duplicatePackage,
    removePackage,
    containers,
    addContainer,
    updateContainer,
    removeContainer,
    setAllPallets,
    setContainerCustomDim,
    isSaving,
    saveError,
    save,
    reset,
    loadProject,
    loadProjectById,
    resolveContainer,
    buildOptimizeRequest,
  }
}
