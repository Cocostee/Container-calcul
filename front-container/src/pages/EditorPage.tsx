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
      <aside className="sidebar">
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
        <header className="topbar">
          <Input
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
        </header>

        {editor.saveError ? (
          <p className="field-error">{editor.saveError}</p>
        ) : null}

        <div className="viewport">
          {sceneContainer ? (
            <Scene
              container={sceneContainer}
              placements={optimization.result?.placements ?? []}
              paletteLookup={paletteLookup}
            />
          ) : (
            <p className="muted">Sélectionnez un conteneur pour la vue 3D.</p>
          )}
        </div>

        <section className="palettes-panel">
          <h2>Palettes du projet</h2>
          <PaletteTable
            palettes={editor.palettes}
            onUpdate={editor.updatePalette}
            onDuplicate={editor.duplicatePalette}
            onRemove={editor.removePalette}
          />
        </section>

        <ResultsPanel
          result={optimization.result}
          isOptimizing={optimization.isOptimizing}
          error={optimization.error}
          onRecalculate={handleCalculate}
        />
      </main>
    </div>
  )
}
