import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ConfigurationSummary } from '../components/ConfigurationSummary'
import { PaletteTable } from '../components/PaletteTable'
import { PalletizationScene } from '../components/Scene3D/PalletizationScene'
import { Scene } from '../components/Scene3D/Scene'
import { ProjectHome } from '../components/ProjectHome'
import { ResultsPanel } from '../components/ResultsPanel'
import { ContainerSelector } from '../components/Sidebar/ContainerSelector'
import { PaletteForm } from '../components/Sidebar/PaletteForm'
import { PalletSelector } from '../components/Sidebar/PalletSelector'
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
import { CUSTOM_CONTAINER_VALUE } from '../utils/constants'

type Screen = 'projects' | 'workflow'

const STEP_COPY: Record<WorkflowStepNumber, { title: string; description: string }> = {
  1: {
    title: 'Configurer le chargement',
    description:
      'Choisissez le conteneur et le modèle de palette qui serviront au calcul.',
  },
  2: {
    title: 'Charger les palettes',
    description:
      'Ajoutez les colis, calculez leur répartition et vérifiez toutes les palettes en 3D.',
  },
  3: {
    title: 'Placer les palettes dans le conteneur',
    description:
      'Contrôlez le chargement final, explorez une palette et utilisez la vue éclatée.',
  },
}

export function EditorPage() {
  const { containerTypes } = useContainerTypes()
  const { paletteTypes } = usePaletteTypes()
  const projects = useProjects()
  const editor = useProjectEditor()
  const optimization = useOptimization()
  const paletteForm = usePaletteForm(editor.addPalette)
  const { activeProjectId, selectProject, clearProject } = useProjectContext()
  const [screen, setScreen] = useState<Screen>('projects')
  const [currentStep, setCurrentStep] = useState<WorkflowStepNumber>(1)
  const lastCalculatedSignature = useRef<string | null>(null)
  const calculateRef = useRef<() => Promise<boolean>>(async () => false)

  const { loadProjectById } = editor
  const { setResult } = optimization

  // Load a saved project only after the user opens it from the project home.
  useEffect(() => {
    if (screen !== 'workflow') return
    if (!activeProjectId || activeProjectId === editor.projectId) return
    void loadProjectById(activeProjectId).then((project) => {
      setResult(project?.last_result ?? null)
    })
  }, [
    activeProjectId,
    editor.projectId,
    loadProjectById,
    screen,
    setResult,
  ])

  const sceneContainer = editor.resolveContainer(containerTypes)
  const packageLineCount = editor.palettes.length
  const packageCount = useMemo(
    () => editor.palettes.reduce((total, item) => total + item.quantity, 0),
    [editor.palettes],
  )
  const effectivePalletId = editor.palletTypeId || paletteTypes[0]?.id || ''
  const selectedPalletType = useMemo(
    () => paletteTypes.find((type) => type.id === effectivePalletId) ?? null,
    [paletteTypes, effectivePalletId],
  )
  const selectedPallet = useMemo(
    () =>
      selectedPalletType
        ? {
            id: selectedPalletType.id,
            label: selectedPalletType.name,
            length_cm: selectedPalletType.length_cm,
            width_cm: selectedPalletType.width_cm,
            base_height_cm: selectedPalletType.height_cm,
            max_load_height_cm: selectedPalletType.default_load_height_cm,
            max_weight_kg: selectedPalletType.max_weight_kg,
          }
        : null,
    [selectedPalletType],
  )
  const isConfigured = Boolean(sceneContainer) && Boolean(selectedPallet)
  const isReadyToCalculate = isConfigured && packageCount > 0
  const generatedPalletCount = optimization.result?.pallets.length ?? 0
  const optimizationSignature = useMemo(
    () =>
      JSON.stringify({
        container: editor.containerValue,
        customDimensions:
          editor.containerValue === CUSTOM_CONTAINER_VALUE
            ? editor.customDims
            : null,
        pallet: effectivePalletId,
        packages: editor.palettes.map((item) => ({
          label: item.label,
          length: item.length_cm,
          width: item.width_cm,
          height: item.height_cm,
          weight: item.weight_kg,
          quantity: item.quantity,
          stackable: item.stackable,
          rotatable: item.rotatable,
        })),
      }),
    [
      editor.containerValue,
      editor.customDims,
      editor.palettes,
      effectivePalletId,
    ],
  )
  const containerName = useMemo(() => {
    if (editor.containerValue === CUSTOM_CONTAINER_VALUE) {
      return 'Conteneur personnalisé'
    }
    return (
      containerTypes.find((type) => type.id === editor.containerValue)?.name ??
      'Conteneur à sélectionner'
    )
  }, [containerTypes, editor.containerValue])

  const saveProject = useCallback(async (): Promise<string | null> => {
    const saved = await editor.save(effectivePalletId)
    if (!saved) return null
    await projects.refresh()
    selectProject(saved.id)
    return saved.id
  }, [editor, effectivePalletId, projects, selectProject])

  const handleSave = async () => {
    await saveProject()
  }

  const handleCreate = () => {
    editor.reset()
    optimization.setResult(null)
    clearProject()
    setCurrentStep(1)
    setScreen('workflow')
  }

  const handleOpen = (id: string) => {
    selectProject(id)
    setCurrentStep(1)
    setScreen('workflow')
  }

  const handleBackToProjects = () => {
    void projects.refresh()
    setScreen('projects')
  }

  const handleDelete = async (id: string) => {
    await projects.remove(id)
    if (id === editor.projectId) {
      editor.reset()
      optimization.setResult(null)
      clearProject()
    }
  }

  const handleCalculate = useCallback(async (): Promise<boolean> => {
    const request = editor.buildOptimizeRequest(containerTypes, selectedPallet)
    if (!request) return false
    lastCalculatedSignature.current = optimizationSignature
    optimization.setResult(null)
    const projectId = await saveProject()
    if (!projectId) return false
    return Boolean(await optimization.run(projectId, request))
  }, [
    containerTypes,
    editor,
    optimization,
    optimizationSignature,
    saveProject,
    selectedPallet,
  ])

  // Keep the displayed pallets in sync with edits made at step 2. A short
  // debounce avoids sending a request for every keystroke in a numeric field.
  useEffect(() => {
    calculateRef.current = handleCalculate
  }, [handleCalculate])

  useEffect(() => {
    if (currentStep !== 2 || !isReadyToCalculate) return
    if (lastCalculatedSignature.current === optimizationSignature) return

    setResult(null)
    const timer = window.setTimeout(() => {
      lastCalculatedSignature.current = optimizationSignature
      void calculateRef.current()
    }, 350)

    return () => window.clearTimeout(timer)
  }, [currentStep, isReadyToCalculate, optimizationSignature, setResult])

  const handleStepChange = (step: WorkflowStepNumber) => {
    if (step === 3 && !optimization.result) return
    setCurrentStep(step)
  }

  const handleStepOneNext = async () => {
    if (!isConfigured) return
    if (await saveProject()) setCurrentStep(2)
  }

  const handleStepTwoAction = async () => {
    if (optimization.result) {
      setCurrentStep(3)
      return
    }
    await handleCalculate()
  }

  if (screen === 'projects') {
    return (
      <ProjectHome
        projects={projects.projects}
        isLoading={projects.loading}
        error={projects.error}
        onCreate={handleCreate}
        onOpen={handleOpen}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <div className="editor">
      <aside className="sidebar" aria-label={`Outils de l’étape ${currentStep}`}>
        <div className="sidebar__brand">
          <span className="sidebar__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <div>
            <p className="sidebar__eyebrow">Logistique</p>
            <p className="sidebar__title">{editor.name}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="sidebar__back"
          onClick={handleBackToProjects}
        >
          ← Tous les projets
        </Button>
        <p className="sidebar__intro">
          {currentStep === 1
            ? 'Choisissez les deux éléments qui cadrent le calcul.'
            : currentStep === 2
              ? 'Ajoutez les colis à répartir sur les palettes sélectionnées.'
              : 'La configuration est verrouillée pour contrôler le chargement final.'}
        </p>

        {currentStep === 1 ? (
          <>
            <ContainerSelector
              containerTypes={containerTypes}
              value={editor.containerValue}
              onChange={editor.setContainerValue}
              customDims={editor.customDims}
              onCustomDimChange={editor.setCustomDim}
            />
            <PalletSelector
              palletTypes={paletteTypes}
              value={effectivePalletId}
              onChange={editor.setPalletTypeId}
            />
          </>
        ) : currentStep === 2 ? (
          <>
            <ConfigurationSummary
              containerName={containerName}
              container={sceneContainer}
              pallet={selectedPalletType}
              step={currentStep}
            />
            <PaletteForm
              values={paletteForm.values}
              errors={paletteForm.errors}
              setField={paletteForm.setField}
              submit={paletteForm.submit}
            />
          </>
        ) : (
          <ConfigurationSummary
            containerName={containerName}
            container={sceneContainer}
            pallet={selectedPalletType}
            step={currentStep}
          />
        )}
      </aside>

      <main className="workspace">
        <header className="workspace-header workflow-header">
          <div>
            <p className="workspace-header__eyebrow">Étape {currentStep} sur 3</p>
            <h1>{STEP_COPY[currentStep].title}</h1>
            <p className="workspace-header__description">
              {STEP_COPY[currentStep].description}
            </p>
          </div>
          <div className="workflow-header__actions">
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={editor.isSaving}
            >
              {editor.isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
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
                ? `Prêt · ${packageCount} colis`
                : 'À compléter'}
            </div>
          </div>
        </header>

        <WorkflowSteps
          currentStep={currentStep}
          hasConfiguration={isConfigured}
          packageCount={packageCount}
          palletCount={generatedPalletCount}
          hasResult={Boolean(optimization.result)}
          onStepChange={handleStepChange}
        />

        {editor.saveError ? (
          <p className="field-error" role="alert">
            {editor.saveError}
          </p>
        ) : null}

        {currentStep === 1 ? (
          <section className="configuration-panel" aria-labelledby="configuration-title">
            <div className="panel-heading">
              <div>
                <p className="panel-heading__eyebrow">Étape 1 · Préparation</p>
                <h2 id="configuration-title">Cadre de l&apos;optimisation</h2>
              </div>
              <span className="panel-heading__meta">Configuration requise</span>
            </div>
            <Input
              id="project-name"
              label="Nom du projet"
              value={editor.name}
              onChange={editor.setName}
            />
            <div className="configuration-guide">
              <article>
                <span aria-hidden="true">1</span>
                <div>
                  <h3>Conteneur</h3>
                  <p>
                    Sélectionnez un modèle existant ou renseignez un conteneur
                    personnalisé dans le volet latéral.
                  </p>
                </div>
              </article>
              <article>
                <span aria-hidden="true">2</span>
                <div>
                  <h3>Palette</h3>
                  <p>
                    Choisissez le format de palette qui recevra les colis à
                    l&apos;étape suivante.
                  </p>
                </div>
              </article>
            </div>
            <div className="configuration-status-grid">
              <div>
                <span>Conteneur</span>
                <strong>{containerName}</strong>
              </div>
              <div>
                <span>Palette</span>
                <strong>{selectedPalletType?.name ?? 'À sélectionner'}</strong>
              </div>
            </div>
          </section>
        ) : null}

        {currentStep === 2 ? (
          <>
            <section className="palettes-panel" aria-labelledby="packages-title">
              <div className="panel-heading">
                <div>
                  <p className="panel-heading__eyebrow">Étape 2 · Chargement</p>
                  <h2 id="packages-title">Colis à charger sur les palettes</h2>
                </div>
                <span className="panel-heading__meta">
                  {packageCount} colis · {packageLineCount} référence
                  {packageLineCount > 1 ? 's' : ''}
                </span>
              </div>
              <PaletteTable
                palettes={editor.palettes}
                onUpdate={editor.updatePalette}
                onDuplicate={editor.duplicatePalette}
                onRemove={editor.removePalette}
              />
            </section>

            <section
              className="palletization-panel"
              aria-labelledby="palletization-title"
            >
              <div className="panel-heading">
                <div>
                  <p className="panel-heading__eyebrow">
                    Étape 2 · Prévisualisation 3D
                  </p>
                  <h2 id="palletization-title">Toutes les palettes chargées</h2>
                </div>
                <span className="panel-heading__meta">
                  {generatedPalletCount} palette
                  {generatedPalletCount > 1 ? 's' : ''}
                </span>
              </div>
              <div className="palletization-viewport">
                {optimization.isOptimizing ? (
                  <p className="muted" role="status">
                    Mise à jour automatique de la répartition…
                  </p>
                ) : optimization.result?.pallets.length ? (
                  <PalletizationScene pallets={optimization.result.pallets} />
                ) : (
                  <p className="muted">
                    Ajoutez les colis puis utilisez le bouton en bas de page
                    pour générer leur répartition sur chaque palette.
                  </p>
                )}
              </div>
            </section>
          </>
        ) : null}

        {currentStep === 3 ? (
          <section className="final-placement" aria-labelledby="scene-title">
            <section className="scene-panel" aria-labelledby="scene-title">
              <div className="panel-heading">
                <div>
                  <p className="panel-heading__eyebrow">
                    Étape 3 · Implantation finale
                  </p>
                  <h2 id="scene-title">Palettes dans le conteneur</h2>
                </div>
                <span className="panel-heading__meta">
                  {generatedPalletCount} palette
                  {generatedPalletCount > 1 ? 's' : ''} générée
                  {generatedPalletCount > 1 ? 's' : ''}
                </span>
              </div>
              <div className="viewport viewport--final">
                {optimization.isOptimizing ? (
                  <p className="muted" role="status">
                    Mise à jour de l&apos;implantation finale…
                  </p>
                ) : sceneContainer ? (
                  <Scene
                    container={sceneContainer}
                    placements={optimization.result?.placements ?? []}
                    pallets={optimization.result?.pallets ?? []}
                  />
                ) : (
                  <p className="muted">
                    Revenez à l&apos;étape 1 pour sélectionner un conteneur.
                  </p>
                )}
              </div>
            </section>

            <ResultsPanel
              result={optimization.result}
              isOptimizing={optimization.isOptimizing}
              error={optimization.error}
              onRecalculate={() => void handleCalculate()}
            />
          </section>
        ) : null}

        <footer className="step-navigation" aria-label="Navigation entre les étapes">
          {currentStep > 1 ? (
            <Button
              variant="secondary"
              onClick={() => setCurrentStep((currentStep - 1) as WorkflowStepNumber)}
            >
              ← Étape précédente
            </Button>
          ) : (
            <span />
          )}

          {currentStep === 1 ? (
            <Button
              variant="primary"
              onClick={() => void handleStepOneNext()}
              disabled={!isConfigured || editor.isSaving}
            >
              Suivant : charger les colis →
            </Button>
          ) : null}
          {currentStep === 2 ? (
            <Button
              variant="primary"
              onClick={() => void handleStepTwoAction()}
              disabled={!isReadyToCalculate || optimization.isOptimizing}
            >
              {optimization.isOptimizing
                ? 'Calcul de la répartition…'
                : optimization.result
                  ? 'Suivant : placer les palettes →'
                  : 'Calculer la répartition'}
            </Button>
          ) : null}
          {currentStep === 3 ? (
            <Button variant="primary" onClick={handleBackToProjects}>
              Terminer et revenir aux projets
            </Button>
          ) : null}
        </footer>
      </main>
    </div>
  )
}
