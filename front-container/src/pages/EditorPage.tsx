import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { AppControls } from '../components/AppControls'
import { ConfigurationSummary } from '../components/ConfigurationSummary'
import { ContainerList } from '../components/ContainerList'
import { LoadingPlan } from '../components/LoadingPlan'
import { PackageImportButton } from '../components/PackageImportButton'
import { PaletteTable } from '../components/PaletteTable'
import { PanelHeading } from '../components/PanelHeading'
import { ProjectHome } from '../components/ProjectHome'
import { ResultsPanel } from '../components/ResultsPanel'
import { Scene } from '../components/Scene3D/Scene'
import { PalletExplorerScene } from '../components/Scene3D/PalletExplorerScene'
import { PaletteForm } from '../components/Sidebar/PaletteForm'
import {
  WorkflowSteps,
  type WorkflowStepNumber,
} from '../components/WorkflowSteps'
import { Button } from '../components/ui/Button/Button'
import { Input } from '../components/ui/Input/Input'
import { useProjectContext } from '../context/ProjectContext'
import { useContainerTypes } from '../hooks/useContainerTypes'
import { useOptimization } from '../hooks/useOptimization'
import { usePaletteForm } from '../hooks/usePaletteForm'
import { usePaletteTypes } from '../hooks/usePaletteTypes'
import { useProjectEditor } from '../hooks/useProjectEditor'
import { useProjects } from '../hooks/useProjects'
import { useSizeAdvice } from '../hooks/useSizeAdvice'
import { useTranslation } from '../i18n'
import type { EditorOverrides } from '../hooks/useProjectEditor'
import type { PackageLineInput } from '../types/palette.types'
import type { PlacementResult } from '../types/placement.types'
import {
  NEW_PROJECT_ID,
  newProjectStepPath,
  printPlanPath,
  projectStepPath,
} from '../router/workflowRoutes'

const STEP_KEYS: Record<
  WorkflowStepNumber,
  { title: string; description: string }
> = {
  1: { title: 'editor.step1Title', description: 'editor.step1Description' },
  2: { title: 'editor.step2Title', description: 'editor.step2Description' },
  3: { title: 'editor.step3Title', description: 'editor.step3Description' },
  4: { title: 'editor.step4Title', description: 'editor.step4Description' },
}

export function EditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId: routeProjectId, step: routeStep } = useParams()
  const { containerTypes } = useContainerTypes()
  const { paletteTypes } = usePaletteTypes()
  const projects = useProjects()
  const editor = useProjectEditor()
  const optimization = useOptimization()
  const { selectProject, clearProject } = useProjectContext()
  const [routeError, setRouteError] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [inspectedPosition, setInspectedPosition] = useState(1)
  const workspaceRef = useRef<HTMLElement>(null)
  const [dockIsStuck, setDockIsStuck] = useState(false)
  /*
   * Le calcul peut ajouter des conteneurs pour vider le quai. Ils sont copiés
   * du dernier déclaré, donc pas forcément du matériel dont on dispose : on
   * le dit, plutôt que de les faire apparaître en silence. « rétabli » est le
   * même fait après une suppression, où il se lit autrement.
   */
  const [fleetNotice, setFleetNotice] = useState<{
    kind: 'added' | 'restored'
    count: number
  } | null>(null)
  const handledRouteProjectId = useRef<string | null>(null)

  const { loadProjectById } = editor
  const { setResult } = optimization
  const isWorkflowRoute = Boolean(routeProjectId && routeStep)
  const currentStep = (Number(routeStep) || 1) as WorkflowStepNumber

  const packageCount = useMemo(
    () => editor.packages.reduce((total, item) => total + item.quantity, 0),
    [editor.packages],
  )
  const packageLineCount = editor.packages.length
  const hasContainers = editor.containers.length > 0
  // Tout voyage sur palette : un conteneur sans format ne peut rien recevoir.
  const everyContainerHasPallet = editor.containers.every(
    (draft) => draft.pallet_type_id !== null,
  )
  const isReadyToCalculate =
    packageCount > 0 && hasContainers && everyContainerHasPallet

  // Les recommandations portent sur les colis enregistrés : elles suivent le
  // format de palette du premier conteneur, pour être comparables. Tant
  // qu'aucun n'est choisi, c'est le format le mieux placé qui sert de base —
  // tout voyage sur palette, donc il y en a toujours un.
  const { advice, refresh: refreshAdvice } = useSizeAdvice(
    editor.projectId,
    editor.containers[0]?.pallet_type_id ?? null,
  )

  // Le routeur valide la forme de l'URL ; cet effet en charge le projet, ce
  // qui rend fiables le rechargement et le bouton « précédent » du navigateur.
  useEffect(() => {
    if (!isWorkflowRoute || !routeProjectId) {
      handledRouteProjectId.current = null
      return
    }

    if (handledRouteProjectId.current === routeProjectId) return
    handledRouteProjectId.current = routeProjectId
    setRouteError(null)

    if (routeProjectId === NEW_PROJECT_ID) {
      editor.reset()
      optimization.setResult(null)
      clearProject()
      return
    }

    if (routeProjectId === editor.projectId) {
      selectProject(routeProjectId)
      return
    }

    void loadProjectById(routeProjectId).then((project) => {
      if (!project) {
        setRouteError(t('errors.projectNotFound'))
        return
      }
      selectProject(project.id)
      setResult(project.last_result)
    })
  }, [
    clearProject,
    editor.projectId,
    editor,
    isWorkflowRoute,
    loadProjectById,
    optimization,
    routeProjectId,
    selectProject,
    setResult,
    t,
  ])

  /*
   * Changer d'étape ramène en haut. On arrive par les flèches du bas de page,
   * et sans cela on se retrouvait au bas de l'étape suivante, devant son pied
   * de page — jamais devant ce qu'on venait y faire.
   */
  useEffect(() => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
      ? 'auto'
      : 'smooth'
    // Le plan de travail défile sur grand écran, la fenêtre en dessous de
    // 1060px : les deux sont remis en haut, l'inactif ne bouge pas.
    workspaceRef.current?.scrollTo({ top: 0, behavior })
    window.scrollTo({ top: 0, behavior })
  }, [currentStep])

  // Les étapes 3 et 4 n'ont de sens qu'avec un plan calculé.
  useEffect(() => {
    if (
      (currentStep !== 3 && currentStep !== 4) ||
      routeError ||
      !routeProjectId ||
      routeProjectId === NEW_PROJECT_ID ||
      routeProjectId !== editor.projectId ||
      optimization.result
    ) {
      return
    }
    navigate(projectStepPath(routeProjectId, 2), { replace: true })
  }, [
    currentStep,
    editor.projectId,
    navigate,
    optimization.result,
    routeError,
    routeProjectId,
  ])

  const inspectedLoad = useMemo(() => {
    if (!optimization.result) return null
    return (
      optimization.result.containers.find(
        (load) => load.position === inspectedPosition,
      ) ?? optimization.result.containers[0] ?? null
    )
  }, [optimization.result, inspectedPosition])

  /*
   * Le total de palettes de l'étape 3 porte sur toute l'expédition, pas sur
   * le seul conteneur inspecté : chaque palette montée garde la trace de son
   * conteneur d'origine, pour s'orienter en la parcourant.
   */
  const allPallets = useMemo(() => {
    if (!optimization.result) return []
    return optimization.result.containers.flatMap((load) =>
      load.pallets.map((pallet) => ({
        pallet,
        containerPosition: load.position,
        containerName: load.name,
      })),
    )
  }, [optimization.result])

  const saveProject = useCallback(
    async (
      projectName?: string,
      overrides?: EditorOverrides,
    ): Promise<string | null> => {
      const saved = await editor.save(projectName, overrides)
      if (!saved) return null
      await projects.refresh()
      selectProject(saved.id)
      return saved.id
    },
    [editor, projects, selectProject],
  )

  /**
   * Lance la répartition. `autoExtend` laisse le serveur ajouter les
   * conteneurs manquants ; on recharge alors le projet pour récupérer ceux
   * qu'il a créés.
   */
  const handleCalculate = useCallback(
    async (
      autoExtend: boolean,
      overrides?: EditorOverrides,
    ): Promise<PlacementResult | null> => {
      const request = editor.buildOptimizeRequest(
        containerTypes,
        paletteTypes,
        autoExtend,
        overrides,
      )
      if (!request) return null

      // La configuration calculée est aussi celle qu'on enregistre.
      const projectId = await saveProject(undefined, overrides)
      if (!projectId) return null

      const outcome = await optimization.run(projectId, request)
      if (!outcome) return null

      if (outcome.didExtend) {
        await editor.loadProjectById(projectId)
      }
      const added =
        outcome.result.containers.length - request.containers.length
      setFleetNotice(added > 0 ? { kind: 'added', count: added } : null)
      void refreshAdvice()
      return outcome.result
    },
    [
      containerTypes,
      editor,
      optimization,
      paletteTypes,
      refreshAdvice,
      saveProject,
    ],
  )

  /*
   * Modifier la liste des conteneurs met le plan à jour dans le même geste :
   * aucune palette ne doit rester à quai en attendant qu'on pense à relancer
   * le calcul. Tant qu'aucun plan n'existe, le geste ne fait que déclarer —
   * c'est le bouton « Calculer » de l'étape 2 qui l'établira.
   */
  /**
   * Répercute un changement de configuration sur le plan, dans le même geste.
   * Tant qu'aucun plan n'existe, le geste ne fait que déclarer — c'est le
   * bouton « Calculer » de l'étape 2 qui l'établira.
   */
  const syncPlan = useCallback(
    async (overrides: EditorOverrides) => {
      if (!optimization.result) return
      await handleCalculate(true, overrides)
    },
    [handleCalculate, optimization.result],
  )

  /*
   * Quand des colis restent à quai, la cause n'est pas toujours le nombre de
   * conteneurs : un format de palette qui ne peut pas porter les charges les
   * bloque tous. Le dire, et proposer le format qui passe, plutôt que de
   * laisser ajouter des conteneurs sans effet.
   */
  const palletBlockage = useMemo(() => {
    const chosen = editor.containers[0]?.pallet_type_id
    const current = advice?.pallets.find(
      (entry) => entry.pallet_type_id === chosen,
    )
    if (!current || current.unplaced_package_count === 0) return null
    const better = advice?.pallets.find(
      (entry) => entry.recommended && entry.unplaced_package_count === 0,
    )
    return {
      name: current.name,
      count: current.unplaced_package_count,
      better: better
        ? { id: better.pallet_type_id, name: better.name }
        : null,
    }
  }, [advice, editor.containers])

  const handleUsePallet = useCallback(
    async (palletTypeId: string) => {
      const containers = editor.setAllPallets(palletTypeId)
      setDockIsStuck(false)
      await handleCalculate(true, { containers })
    },
    [editor, handleCalculate],
  )

  /**
   * Retire un conteneur. Si l'expédition ne tient pas sans lui, le calcul le
   * rétablit — aucun colis ne reste à quai — et on le dit, plutôt que de
   * laisser croire que la suppression n'a rien fait.
   */
  const handleRemoveContainer = useCallback(
    async (clientId: string) => {
      const containers = editor.removeContainer(clientId)
      if (!optimization.result) return
      const plan = await handleCalculate(true, { containers })
      const restored = plan
        ? plan.containers.length - containers.length
        : 0
      if (restored > 0) {
        setFleetNotice({ kind: 'restored', count: restored })
      }
    },
    [editor, handleCalculate, optimization.result],
  )

  /**
   * Ajoute un conteneur et y verse ce qui attendait à quai. Si le reliquat ne
   * bouge pas, aucun conteneur de cette taille ne peut le prendre : on le dit
   * plutôt que de laisser le bouton sans effet visible.
   */
  const handleAddContainer = useCallback(async () => {
    const leftBefore = optimization.result?.unplaced_package_count ?? 0
    // Les conteneurs suivants reprennent le dernier déclaré ; le premier part
    // des tailles les mieux placées, pour n'avoir rien à régler avant de voir
    // un plan.
    const seed =
      editor.containers.length === 0
        ? {
            container_type_id:
              advice?.containers.find((entry) => entry.recommended)
                ?.container_type_id ?? containerTypes[0]?.id ?? null,
            pallet_type_id:
              advice?.pallets.find((entry) => entry.recommended)
                ?.pallet_type_id ?? paletteTypes[0]?.id ?? null,
          }
        : undefined
    const containers = editor.addContainer(seed)
    setDockIsStuck(false)
    if (!optimization.result) return
    const plan = await handleCalculate(true, { containers })
    if (plan && leftBefore > 0 && plan.unplaced_package_count >= leftBefore) {
      setDockIsStuck(true)
    }
  }, [
    advice,
    containerTypes,
    editor,
    handleCalculate,
    optimization.result,
    paletteTypes,
  ])

  /*
   * Le lot commande le plan autant que la flotte : chaque geste sur les colis
   * le refait dans le même mouvement. Sans cela, on ajoutait des colis au lot
   * et le plan restait celui d'avant.
   *
   * Tout geste sur la liste rend le formulaire à l'ajout : l'enregistrement
   * régénère les identifiants de brouillon, si bien qu'une modification en
   * cours pointerait sur une ligne disparue.
   */
  const paletteForm = usePaletteForm(
    (values) => void syncPlan({ packages: editor.addPackage(values) }),
    (clientId, patch) =>
      void syncPlan({ packages: editor.updatePackage(clientId, patch) }),
  )

  const handleDuplicatePackage = (clientId: string) => {
    paletteForm.cancelEdit()
    void syncPlan({ packages: editor.duplicatePackage(clientId) })
  }

  const handleRemovePackage = (clientId: string) => {
    paletteForm.cancelEdit()
    void syncPlan({ packages: editor.removePackage(clientId) })
  }

  const handleImportPackages = (lines: PackageLineInput[]) => {
    paletteForm.cancelEdit()
    void syncPlan({ packages: editor.addPackages(lines) })
  }

  const handleCreate = () => {
    editor.reset()
    optimization.setResult(null)
    clearProject()
    navigate(newProjectStepPath())
  }

  const handleOpen = (id: string) => {
    selectProject(id)
    navigate(projectStepPath(id, 1))
  }

  const handleBackToProjects = () => {
    void projects.refresh()
    navigate('/')
  }

  const handleDelete = async (id: string) => {
    await projects.remove(id)
    if (id === editor.projectId) {
      editor.reset()
      optimization.setResult(null)
      clearProject()
    }
    if (id === routeProjectId) navigate('/', { replace: true })
  }

  const handleSave = async () => {
    const projectId = await saveProject()
    if (projectId && routeProjectId === NEW_PROJECT_ID) {
      navigate(projectStepPath(projectId, currentStep), { replace: true })
    }
    void refreshAdvice()
  }

  const handleStartRename = () => {
    setRenameDraft(editor.name)
    setRenameError(null)
    setIsRenaming(true)
  }

  const handleRename = async () => {
    const nextName = renameDraft.trim()
    if (!nextName) {
      setRenameError(t('errors.projectNameRequired'))
      return
    }
    const savedProjectId = await saveProject(nextName)
    if (!savedProjectId) return
    setIsRenaming(false)
    setRenameError(null)
    navigate(projectStepPath(savedProjectId, currentStep), { replace: true })
  }

  const handleStepChange = async (step: WorkflowStepNumber) => {
    if ((step === 3 || step === 4) && !optimization.result) return
    if (step === currentStep) return

    let projectId =
      routeProjectId && routeProjectId !== NEW_PROJECT_ID
        ? routeProjectId
        : editor.projectId
    if (!projectId) {
      projectId = await saveProject()
      if (!projectId) return
    }
    navigate(projectStepPath(projectId, step))
  }

  const handleStepOneNext = async () => {
    if (packageCount === 0) return
    const projectId = await saveProject()
    if (projectId) navigate(projectStepPath(projectId, 2))
  }

  const handleStepTwoAction = async () => {
    if (optimization.result) {
      if (editor.projectId) navigate(projectStepPath(editor.projectId, 3))
      return
    }
    if (await handleCalculate(true)) {
      if (editor.projectId) navigate(projectStepPath(editor.projectId, 3))
    }
  }

  if (!isWorkflowRoute) {
    return (
      <ProjectHome
        projects={projects.projects}
        isLoading={projects.loading}
        error={projects.error}
        onCreate={handleCreate}
        onImport={() => navigate('/imports/new')}
        onOpen={handleOpen}
        onDelete={handleDelete}
      />
    )
  }

  if (routeError) {
    return (
      <main className="route-feedback">
        <p className="workspace-header__eyebrow">
          {t('editor.unavailableEyebrow')}
        </p>
        <h1>{t('editor.unavailableTitle')}</h1>
        <p>{routeError}</p>
        <Button
          variant="primary"
          icon="arrow-left-outline"
          onClick={() => navigate('/', { replace: true })}
        >
          {t('editor.backToProjects')}
        </Button>
      </main>
    )
  }

  return (
    <div className="editor">
      <aside
        className="sidebar"
        aria-label={t('editor.toolsAriaLabel', { step: currentStep })}
      >
        <div className="sidebar__brand">
          <span className="sidebar__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <div>
            <p className="sidebar__eyebrow">{t('home.eyebrow')}</p>
            <p className="sidebar__title">{editor.name}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="sidebar__back"
          icon="arrow-left-outline"
          onClick={handleBackToProjects}
        >
          {t('editor.allProjects')}
        </Button>
        <p className="sidebar__intro">
          {currentStep === 1
            ? t('editor.railIntro1')
            : currentStep === 2
              ? t('editor.railIntro2')
              : currentStep === 3
                ? t('editor.railIntro3')
                : t('editor.railIntro4')}
        </p>

        {currentStep === 1 ? (
          <>
            <PaletteForm
              values={paletteForm.values}
              errors={paletteForm.errors}
              editingId={paletteForm.editingId}
              setField={paletteForm.setField}
              submit={paletteForm.submit}
              cancelEdit={paletteForm.cancelEdit}
              onDelete={handleRemovePackage}
            />
            <PackageImportButton
              onImported={handleImportPackages}
              disabled={editor.isSaving || optimization.isOptimizing}
            />
          </>
        ) : (
          <ConfigurationSummary
            containers={editor.containers}
            containerTypes={containerTypes}
            palletTypes={paletteTypes}
            packageCount={packageCount}
            step={currentStep}
          />
        )}
      </aside>

      <main className="workspace" ref={workspaceRef}>
        <header className="workspace-header workflow-header">
          <div>
            <p className="workspace-header__eyebrow">
              {t('editor.stepOf', { step: currentStep })}
            </p>
            <h1>{t(STEP_KEYS[currentStep].title)}</h1>
            <p className="workspace-header__description">
              {t(STEP_KEYS[currentStep].description)}
            </p>
          </div>
          <div className="workflow-header__actions">
            <Button
              variant="secondary"
              icon="save-outline"
              onClick={handleSave}
              disabled={editor.isSaving}
            >
              {editor.isSaving ? t('common.saving') : t('common.save')}
            </Button>
            {!isRenaming ? (
              <Button
                variant="ghost"
                icon="edit-outline"
                onClick={handleStartRename}
              >
                {t('common.rename')}
              </Button>
            ) : null}
            {currentStep === 4 && optimization.result && editor.projectId ? (
              <Button
                variant="ghost"
                icon="file-download-outline"
                onClick={() => {
                  // Son propre onglet : l'assistant reste intact pendant que
                  // le navigateur imprime ou enregistre en PDF.
                  window.open(
                    printPlanPath(editor.projectId as string),
                    '_blank',
                    'noopener',
                  )
                }}
              >
                {t('print.action')}
              </Button>
            ) : null}
            <div
              className={
                isReadyToCalculate
                  ? 'project-status project-status--ready'
                  : 'project-status'
              }
              aria-live="polite"
            >
              <span className="project-status__dot" aria-hidden="true" />
              {isReadyToCalculate
                ? t('common.projectStatusReady', {
                    count: packageCount,
                    unit: t('units.packages', { count: packageCount }),
                  })
                : t('common.projectStatusIncomplete')}
            </div>
            <AppControls />
          </div>
        </header>

        {isRenaming ? (
          <section
            className="workflow-rename"
            aria-label={t('editor.renameAriaLabel')}
          >
            <Input
              id="project-rename"
              label={t('editor.renameLabel')}
              value={renameDraft}
              onChange={(value) => {
                setRenameDraft(value)
                setRenameError(null)
              }}
              disabled={editor.isSaving}
            />
            <div className="workflow-rename__actions">
              <Button
                variant="primary"
                onClick={() => void handleRename()}
                disabled={editor.isSaving}
              >
                {editor.isSaving ? t('common.saving') : t('editor.renameConfirm')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsRenaming(false)
                  setRenameError(null)
                }}
                disabled={editor.isSaving}
              >
                {t('common.cancel')}
              </Button>
            </div>
            {renameError ? (
              <p className="field-error" role="alert">
                {renameError}
              </p>
            ) : null}
          </section>
        ) : null}

        <WorkflowSteps
          currentStep={currentStep}
          hasPackages={packageCount > 0}
          hasContainers={hasContainers}
          packageCount={packageCount}
          containerCount={editor.containers.length}
          palletCount={allPallets.length}
          hasResult={Boolean(optimization.result)}
          onStepChange={(step) => void handleStepChange(step)}
        />

        {editor.saveError ? (
          <p className="field-error" role="alert">
            {editor.saveError}
          </p>
        ) : null}

        {/* Étape 1 — le lot de colis à expédier. */}
        {currentStep === 1 ? (
          <section className="palettes-panel" aria-labelledby="packages-title">
            <PanelHeading
              icon="box-outline"
              eyebrow={t('packages.panelEyebrow')}
              title={t('packages.panelTitle')}
              titleId="packages-title"
              meta={t('packages.meta', {
                packages: packageCount,
                lines: packageLineCount,
                lineWord: t('packages.lineWord', { count: packageLineCount }),
              })}
            />
            <PaletteTable
              packages={editor.packages}
              editingId={paletteForm.editingId}
              onEdit={(clientId) => {
                const found = editor.packages.find(
                  (item) => item.clientId === clientId,
                )
                if (found) paletteForm.beginEdit(found)
              }}
              onDuplicate={handleDuplicatePackage}
            />
          </section>
        ) : null}

        {/* Les conteneurs qui recevront le lot. */}
        {currentStep === 2 ? (
          <section className="configuration-panel" aria-labelledby="containers-title">
            <PanelHeading
              icon="container-outline"
              eyebrow={t('containers.eyebrow')}
              title={t('containers.title')}
              titleId="containers-title"
              meta={t('containers.count', {
                count: editor.containers.length,
              })}
            />
            <ContainerList
              containers={editor.containers}
              containerTypes={containerTypes}
              palletTypes={paletteTypes}
              advice={advice}
              onAdd={() => void handleAddContainer()}
              onRemove={(clientId) => void handleRemoveContainer(clientId)}
              onChange={(clientId, patch) =>
                void syncPlan({
                  containers: editor.updateContainer(clientId, patch),
                })
              }
              onCustomDimChange={(clientId, field, value) =>
                void syncPlan({
                  containers: editor.setContainerCustomDim(
                    clientId,
                    field,
                    value,
                  ),
                })
              }
            />
            {hasContainers && !everyContainerHasPallet ? (
              <p className="field-error" role="alert">
                {t('containers.palletRequired')}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Étape 3 — chaque palette montée, parcourue une à une. */}
        {currentStep === 3 && optimization.result ? (
          <section
            className="pallet-explorer-panel"
            aria-labelledby="palletization-title"
          >
            <PanelHeading
              icon="layers-outline"
              eyebrow={t('palletization.eyebrow')}
              title={t('palletization.title')}
              titleId="palletization-title"
            />
            {optimization.isOptimizing ? (
              <div className="palletization-viewport is-busy">
                <p className="muted" role="status">
                  {t('palletization.updating')}
                </p>
              </div>
            ) : allPallets.length > 0 ? (
              <PalletExplorerScene pallets={allPallets} />
            ) : (
              <div className="palletization-viewport">
                <p className="muted">{t('palletization.empty')}</p>
              </div>
            )}
          </section>
        ) : null}

        {/* Étape 4 — le plan, conteneur par conteneur. */}
        {currentStep === 4 && optimization.result ? (
          <section className="final-placement" aria-labelledby="scene-title">
            <LoadingPlan
              result={optimization.result}
              containers={editor.containers}
              containerTypes={containerTypes}
              palletTypes={paletteTypes}
              advice={advice}
              selectedPosition={inspectedLoad?.position ?? 1}
              onSelect={setInspectedPosition}
              /* Un conteneur de plus, rempli dans le même geste. */
              onAddContainer={() => void handleAddContainer()}
              /* Retirer ou retailler un conteneur depuis le plan : le geste
                 se fait là où l'on voit son effet, et le plan se refait. */
              onRemoveContainer={(clientId) =>
                void handleRemoveContainer(clientId)
              }
              fleetNotice={fleetNotice}
              onChangeContainer={(clientId, patch) =>
                void syncPlan({
                  containers: editor.updateContainer(clientId, patch),
                })
              }
              onCustomDimChange={(clientId, field, value) =>
                void syncPlan({
                  containers: editor.setContainerCustomDim(
                    clientId,
                    field,
                    value,
                  ),
                })
              }
              palletBlockage={palletBlockage}
              onUsePallet={(palletTypeId) =>
                void handleUsePallet(palletTypeId)
              }
              dockIsStuck={dockIsStuck}
              onChangeSizes={() => void handleStepChange(2)}
            />

            <section className="scene-panel" aria-labelledby="scene-title">
              <PanelHeading
                icon="expand-outline"
                eyebrow={t('placement.eyebrow')}
                title={
                  inspectedLoad?.container.name ?? t('container.customName')
                }
                titleId="scene-title"
                meta={t('placement.metaPosition', {
                  position: inspectedLoad?.position ?? 1,
                  total: optimization.result.containers.length,
                })}
              />
              <div
                className={
                  optimization.isOptimizing
                    ? 'viewport viewport--final is-busy'
                    : 'viewport viewport--final'
                }
              >
                {optimization.isOptimizing ? (
                  <p className="muted" role="status">
                    {t('placement.updating')}
                  </p>
                ) : inspectedLoad ? (
                  <Scene
                    container={inspectedLoad.container}
                    placements={inspectedLoad.placements}
                    pallets={inspectedLoad.pallets}
                  />
                ) : (
                  <p className="muted">{t('placement.noContainer')}</p>
                )}
              </div>
            </section>

            <ResultsPanel
              result={optimization.result}
              load={inspectedLoad}
              isOptimizing={optimization.isOptimizing}
              error={optimization.error}
            />
          </section>
        ) : null}

        <footer
          className="step-navigation"
          aria-label={t('editor.stepNavigation')}
        >
          {currentStep > 1 ? (
            <Button
              variant="secondary"
              icon="arrow-left-outline"
              onClick={() =>
                void handleStepChange((currentStep - 1) as WorkflowStepNumber)
              }
            >
              {t('common.previousStep')}
            </Button>
          ) : (
            <span />
          )}

          {currentStep === 1 ? (
            <Button
              variant="primary"
              iconAfter="arrow-right-outline"
              onClick={() => void handleStepOneNext()}
              disabled={packageCount === 0 || editor.isSaving}
            >
              {t('editor.nextChooseContainers')}
            </Button>
          ) : null}
          {currentStep === 2 ? (
            <Button
              variant="primary"
              iconAfter={
                optimization.result && !optimization.isOptimizing
                  ? 'arrow-right-outline'
                  : undefined
              }
              onClick={() => void handleStepTwoAction()}
              disabled={!isReadyToCalculate || optimization.isOptimizing}
            >
              {optimization.isOptimizing
                ? t('editor.calculating')
                : optimization.result
                  ? t('editor.nextSeePlan')
                  : t('editor.calculate')}
            </Button>
          ) : null}
          {currentStep === 3 ? (
            <Button
              variant="primary"
              iconAfter="arrow-right-outline"
              onClick={() => void handleStepChange(4)}
            >
              {t('editor.nextSeeFinalPlan')}
            </Button>
          ) : null}
          {currentStep === 4 ? (
            <Button
              variant="secondary"
              icon="check-outline"
              onClick={handleBackToProjects}
            >
              {t('editor.finish')}
            </Button>
          ) : null}
        </footer>
      </main>
    </div>
  )
}
