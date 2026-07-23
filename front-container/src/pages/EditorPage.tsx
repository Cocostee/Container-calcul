import { useEffect, useMemo } from 'react'

import { PaletteTable } from '../components/PaletteTable'
import { ResultsPanel } from '../components/ResultsPanel'
import { PalletizationScene } from '../components/Scene3D/PalletizationScene'
import { Scene } from '../components/Scene3D/Scene'
import { ContainerSelector } from '../components/Sidebar/ContainerSelector'
import { PaletteForm } from '../components/Sidebar/PaletteForm'
import { PalletSelector } from '../components/Sidebar/PalletSelector'
import { ProjectList } from '../components/Sidebar/ProjectList'
import { WorkflowSteps } from '../components/WorkflowSteps'
import { Button } from '../components/ui/Button/Button'
import { Input } from '../components/ui/Input/Input'
import { useProjectContext } from '../context/ProjectContext'
import { useContainerTypes } from '../hooks/useContainerTypes'
import { useOptimization } from '../hooks/useOptimization'
import { usePaletteForm } from '../hooks/usePaletteForm'
import { usePaletteTypes } from '../hooks/usePaletteTypes'
import { useProjectEditor } from '../hooks/useProjectEditor'
import { useProjects } from '../hooks/useProjects'

export function EditorPage() {
  const { containerTypes } = useContainerTypes()
  const { paletteTypes } = usePaletteTypes()
  const projects = useProjects()
  const editor = useProjectEditor()
  const optimization = useOptimization()
  const paletteForm = usePaletteForm(editor.addPalette)
  const { activeProjectId, selectProject, clearProject } = useProjectContext()

  const { loadProjectById } = editor
  const { setResult } = optimization

  // Load a project when it is selected in the sidebar.
  useEffect(() => {
    if (!activeProjectId || activeProjectId === editor.projectId) return
    void loadProjectById(activeProjectId).then((project) => {
      setResult(project?.last_result ?? null)
    })
  }, [activeProjectId, editor.projectId, loadProjectById, setResult])

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
  const isReadyToCalculate =
    Boolean(sceneContainer) && Boolean(selectedPallet) && packageCount > 0
  const generatedPalletCount = optimization.result?.pallets.length ?? 0

  const handleSave = async () => {
    const saved = await editor.save(effectivePalletId)
    if (saved) {
      await projects.refresh()
      selectProject(saved.id)
    }
  }

  const handleNew = () => {
    editor.reset()
    optimization.setResult(null)
    clearProject()
  }

  const handleCalculate = async () => {
    let id = editor.projectId
    if (!id) {
      const saved = await editor.save(effectivePalletId)
      if (!saved) return
      id = saved.id
      await projects.refresh()
      selectProject(id)
    }
    const request = editor.buildOptimizeRequest(containerTypes, selectedPallet)
    if (!request) return
    await optimization.run(id, request)
  }

  return (
    <div className="editor">
      <aside id="step-1" className="sidebar" aria-label="Préparation du projet">
        <div className="sidebar__brand">
          <span className="sidebar__mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <div>
            <p className="sidebar__eyebrow">Logistique</p>
            <p className="sidebar__title">Plan de chargement</p>
          </div>
        </div>
        <p className="sidebar__intro">
          Définissez le conteneur et la palette, chargez les colis, puis
          contrôlez leur implantation finale.
        </p>
        <ProjectList
          projects={projects.projects}
          activeId={editor.projectId}
          onSelect={selectProject}
          onDelete={projects.remove}
          onNew={handleNew}
        />
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
        <PaletteForm
          values={paletteForm.values}
          errors={paletteForm.errors}
          setField={paletteForm.setField}
          submit={paletteForm.submit}
        />
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="workspace-header__eyebrow">Optimisation</p>
            <h1>Préparer un chargement</h1>
            <p className="workspace-header__description">
              Configurez d&apos;abord le conteneur et le modèle de palette. Les
              colis sont ensuite répartis sur toutes les palettes générées,
              avant leur placement final dans le conteneur.
            </p>
          </div>
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
        </header>

        <WorkflowSteps
          hasConfiguration={Boolean(sceneContainer) && Boolean(selectedPallet)}
          packageCount={packageCount}
          palletCount={generatedPalletCount}
          hasResult={Boolean(optimization.result)}
        />

        <section className="project-bar" aria-label="Actions du projet">
          <Input
            id="project-name"
            label="Nom du projet"
            value={editor.name}
            onChange={editor.setName}
          />
          <div className="topbar__actions">
            <Button
              variant="primary"
              onClick={handleCalculate}
              disabled={optimization.isOptimizing}
            >
              Calculer le plan
            </Button>
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={editor.isSaving}
            >
              {editor.isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </section>

        {editor.saveError ? (
          <p className="field-error" role="alert">
            {editor.saveError}
          </p>
        ) : null}

        <section
          id="step-2"
          className="palettes-panel"
          aria-labelledby="packages-title"
        >
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
            {optimization.result?.pallets.length ? (
              <PalletizationScene pallets={optimization.result.pallets} />
            ) : (
              <p className="muted">
                Ajoutez les colis puis calculez le plan pour visualiser leur
                répartition sur chaque palette.
              </p>
            )}
          </div>
        </section>

        <div id="step-3" className="workspace-overview">
          <section className="scene-panel" aria-labelledby="scene-title">
            <div className="panel-heading">
              <div>
                <p className="panel-heading__eyebrow">
                  Étape 3 · Implantation finale
                </p>
                <h2 id="scene-title">Palettes dans le conteneur</h2>
              </div>
              <span className="panel-heading__meta">
                {optimization.result?.pallets.length ?? 0} palette
                {(optimization.result?.pallets.length ?? 0) > 1 ? 's' : ''}{' '}
                générée{(optimization.result?.pallets.length ?? 0) > 1 ? 's' : ''}
              </span>
            </div>
            <div className="viewport">
              {sceneContainer ? (
                <Scene
                  container={sceneContainer}
                  placements={optimization.result?.placements ?? []}
                  pallets={optimization.result?.pallets ?? []}
                />
              ) : (
                <p className="muted">
                  Sélectionnez un conteneur pour activer la vue 3D.
                </p>
              )}
            </div>
          </section>

          <ResultsPanel
            result={optimization.result}
            isOptimizing={optimization.isOptimizing}
            error={optimization.error}
            onRecalculate={handleCalculate}
          />
        </div>
      </main>
    </div>
  )
}
