import { useCallback, useState } from 'react'

import { createProject, getProject, updateProject } from '../api/projects.api'
import type {
  ContainerCustomDims,
  ContainerType,
} from '../types/container.types'
import type {
  OptimizeContainer,
  OptimizeRequest,
} from '../types/placement.types'
import type {
  PaletteDraft,
  PaletteInstanceInput,
} from '../types/palette.types'
import type { Project, ProjectPayload } from '../types/project.types'
import {
  CUSTOM_CONTAINER_VALUE,
  DEFAULT_CONTAINER_CUSTOM_DIMS,
} from '../utils/constants'

let draftCounter = 0
function nextClientId(): string {
  draftCounter += 1
  return `draft-${draftCounter}`
}

// Owns the state of the project being edited: container config + pallet lines,
// plus persistence and the request built for optimization.
export function useProjectEditor() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [name, setName] = useState('Nouveau projet')
  const [containerValue, setContainerValue] = useState<string>(
    CUSTOM_CONTAINER_VALUE,
  )
  const [customDims, setCustomDims] = useState<ContainerCustomDims>(
    DEFAULT_CONTAINER_CUSTOM_DIMS,
  )
  const [palettes, setPalettes] = useState<PaletteDraft[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const addPalette = useCallback((input: PaletteInstanceInput) => {
    setPalettes((prev) => [...prev, { ...input, clientId: nextClientId() }])
  }, [])

  const updatePalette = useCallback(
    (clientId: string, patch: Partial<PaletteInstanceInput>) => {
      setPalettes((prev) =>
        prev.map((item) =>
          item.clientId === clientId ? { ...item, ...patch } : item,
        ),
      )
    },
    [],
  )

  const duplicatePalette = useCallback((clientId: string) => {
    setPalettes((prev) => {
      const found = prev.find((item) => item.clientId === clientId)
      if (!found) return prev
      return [
        ...prev,
        { ...found, clientId: nextClientId(), label: `${found.label} (copie)` },
      ]
    })
  }, [])

  const removePalette = useCallback((clientId: string) => {
    setPalettes((prev) => prev.filter((item) => item.clientId !== clientId))
  }, [])

  const setCustomDim = useCallback(
    (field: keyof ContainerCustomDims, value: number) => {
      setCustomDims((prev) => ({ ...prev, [field]: value }))
    },
    [],
  )

  const reset = useCallback(() => {
    setProjectId(null)
    setName('Nouveau projet')
    setContainerValue(CUSTOM_CONTAINER_VALUE)
    setCustomDims(DEFAULT_CONTAINER_CUSTOM_DIMS)
    setPalettes([])
    setSaveError(null)
  }, [])

  const loadProject = useCallback((project: Project) => {
    setProjectId(project.id)
    setName(project.name)
    setContainerValue(project.container_type_id ?? CUSTOM_CONTAINER_VALUE)
    setCustomDims(project.container_custom_dims ?? DEFAULT_CONTAINER_CUSTOM_DIMS)
    setPalettes(
      project.palettes.map((item) => ({
        clientId: nextClientId(),
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
    setSaveError(null)
  }, [])

  const buildPayload = useCallback((): ProjectPayload => {
    const isCustom = containerValue === CUSTOM_CONTAINER_VALUE
    return {
      name,
      container_type_id: isCustom ? null : containerValue,
      container_custom_dims: isCustom ? customDims : null,
      palettes: palettes.map((item) => ({
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
    }
  }, [name, containerValue, customDims, palettes])

  const save = useCallback(async (): Promise<Project | null> => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const payload = buildPayload()
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
  }, [projectId, buildPayload, loadProject])

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

  // Resolve the container envelope from the selected reference type or custom.
  const resolveContainer = useCallback(
    (containerTypes: ContainerType[]): OptimizeContainer | null => {
      const source =
        containerValue === CUSTOM_CONTAINER_VALUE
          ? customDims
          : containerTypes.find((type) => type.id === containerValue)
      if (!source) return null
      return {
        length_cm: source.length_cm,
        width_cm: source.width_cm,
        height_cm: source.height_cm,
        max_weight_kg: source.max_weight_kg,
      }
    },
    [containerValue, customDims],
  )

  const buildOptimizeRequest = useCallback(
    (containerTypes: ContainerType[]): OptimizeRequest | null => {
      const container = resolveContainer(containerTypes)
      if (!container || palettes.length === 0) return null
      return {
        container,
        palettes: palettes.map((item) => ({
          instance_id: item.clientId,
          length_cm: item.length_cm,
          width_cm: item.width_cm,
          height_cm: item.height_cm,
          weight_kg: item.weight_kg,
          quantity: item.quantity,
          stackable: item.stackable,
          rotatable: item.rotatable,
        })),
      }
    },
    [resolveContainer, palettes],
  )

  return {
    projectId,
    name,
    setName,
    containerValue,
    setContainerValue,
    customDims,
    setCustomDim,
    palettes,
    addPalette,
    updatePalette,
    duplicatePalette,
    removePalette,
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
