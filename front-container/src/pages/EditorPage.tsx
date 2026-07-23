import { useEffect, useMemo } from 'react'

import { PaletteTable } from '../components/PaletteTable'
import { ResultsPanel } from '../components/ResultsPanel'
import { Scene } from '../components/Scene3D/Scene'
import { ContainerSelector } from '../components/Sidebar/ContainerSelector'
import { PaletteForm } from '../components/Sidebar/PaletteForm'
import { ProjectList } from '../components/Sidebar/ProjectList'
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
  const paletteCount = editor.palettes.length
  const isReadyToCalculate = Boolean(sceneContainer) && paletteCount > 0

  const paletteLookup = useMemo(
    () =>
      Object.fromEntries(
        editor.palettes.map((palette) => [
          palette.clientId,
          { label: palette.label, weight: palette.weight_kg },
        ]),
      ),
    [editor.palettes],
  )

  const handleSave = async () => {
    const saved = await editor.save()
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
      const saved = await editor.save()
      if (!saved) return
      id = saved.id
      await projects.refresh()
      selectProject(id)
    }
    const request = editor.buildOptimizeRequest(containerTypes)
    if (!request) return
    await optimization.run(id, request)
  }

  return (
    <div className="editor">
      <aside className="sidebar" aria-label="Préparation du projet">
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
          Configurez le conteneur et les palettes avant de calculer la meilleure
          répartition.
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
        <PaletteForm
          paletteTypes={paletteTypes}
          values={paletteForm.values}
          errors={paletteForm.errors}
          setField={paletteForm.setField}
          applyType={paletteForm.applyType}
          submit={paletteForm.submit}
        />
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="workspace-header__eyebrow">Optimisation</p>
            <h1>Préparer un chargement</h1>
            <p className="workspace-header__description">
              Organisez vos palettes, visualisez le conteneur et lancez le
              calcul lorsque le projet est prêt.
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
              ? `Prêt · ${paletteCount} palette${paletteCount > 1 ? 's' : ''}`
              : 'À compléter'}
          </div>
        </header>

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
              Calculer le chargement
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

        <div className="workspace-overview">
          <section className="scene-panel" aria-labelledby="scene-title">
            <div className="panel-heading">
              <div>
                <p className="panel-heading__eyebrow">Visualisation</p>
                <h2 id="scene-title">Vue du conteneur</h2>
              </div>
              <span className="panel-heading__meta">
                {optimization.result?.placements.length ?? 0} palette
                {(optimization.result?.placements.length ?? 0) > 1 ? 's' : ''}{' '}
                placée{(optimization.result?.placements.length ?? 0) > 1 ? 's' : ''}
              </span>
            </div>
            <div className="viewport">
              {sceneContainer ? (
                <Scene
                  container={sceneContainer}
                  placements={optimization.result?.placements ?? []}
                  paletteLookup={paletteLookup}
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

        <section className="palettes-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-heading__eyebrow">Inventaire</p>
              <h2>Palettes du projet</h2>
            </div>
            <span className="panel-heading__meta">
              {paletteCount} ligne{paletteCount > 1 ? 's' : ''}
            </span>
          </div>
          <PaletteTable
            palettes={editor.palettes}
            onUpdate={editor.updatePalette}
            onDuplicate={editor.duplicatePalette}
            onRemove={editor.removePalette}
          />
        </section>
      </main>
    </div>
  )
}
