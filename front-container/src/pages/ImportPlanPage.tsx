import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  createProject,
  optimizeImportedPallets,
} from '../api/projects.api'
import { useContainerTypes } from '../hooks/useContainerTypes'
import { projectStepPath } from '../router/workflowRoutes'
import type { OptimizePaletteInput } from '../types/placement.types'
import type { PaletteInstance } from '../types/palette.types'
import type { ProjectPayload } from '../types/project.types'
import {
  parseCesiImport,
  type CesiImportPreview,
} from '../utils/cesiImport'
import { Button } from '../components/ui/Button/Button'
import { Input } from '../components/ui/Input/Input'

interface ImportResult {
  id: string
  name: string
  palletCount: number
  unplacedCount: number
}

function containerVolume(
  container: { length_cm: number; width_cm: number; height_cm: number },
): number {
  return container.length_cm * container.width_cm * container.height_cm
}

function importPallets(
  pallets: PaletteInstance[],
): OptimizePaletteInput[] {
  return pallets.map((pallet, index) => ({
    instance_id: `imported-${pallet.id || `pallet-${index}`}`,
    length_cm: pallet.length_cm,
    width_cm: pallet.width_cm,
    height_cm: pallet.height_cm,
    weight_kg: pallet.weight_kg,
    quantity: pallet.quantity,
    stackable: pallet.stackable,
    rotatable: pallet.rotatable,
  }))
}

/** Import a source file into ready-to-open, already optimized projects. */
export function ImportPlanPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { containerTypes, loading: containersLoading } = useContainerTypes()
  const [projectName, setProjectName] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [preview, setPreview] = useState<CesiImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [results, setResults] = useState<ImportResult[]>([])

  const automaticContainer = useMemo(
    () =>
      containerTypes.reduce<typeof containerTypes[number] | null>(
        (largest, container) =>
          !largest || containerVolume(container) > containerVolume(largest)
            ? container
            : largest,
        null,
      ),
    [containerTypes],
  )
  const totalPallets = preview?.shipments.reduce(
    (total, shipment) => total + shipment.palletCount,
    0,
  )

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setResults([])
    setPreview(null)
    setSelectedFileName(file.name)
    setIsParsing(true)
    try {
      setPreview(await parseCesiImport(file))
    } catch (caught) {
      setSelectedFileName('')
      setError((caught as Error).message)
    } finally {
      setIsParsing(false)
    }
  }

  const handleImport = async () => {
    const name = projectName.trim()
    if (!name) {
      setError('Donnez un nom au projet avant de lancer l’import.')
      return
    }
    if (!preview || !automaticContainer) return

    setError(null)
    setResults([])
    setIsImporting(true)
    const imported: ImportResult[] = []

    try {
      for (const [index, shipment] of preview.shipments.entries()) {
        setProgress(
          `Préparation de la commande ${index + 1} sur ${preview.shipments.length}…`,
        )
        const projectTitle =
          preview.shipments.length === 1
            ? name
            : `${name} · ${shipment.orderCode}`
        const payload: ProjectPayload = {
          name: projectTitle,
          container_type_id: automaticContainer.id,
          pallet_type_id: null,
          container_custom_dims: null,
          palettes: shipment.pallets,
        }
        const project = await createProject(payload)
        const result = await optimizeImportedPallets(
          project.id,
          automaticContainer,
          importPallets(project.palettes),
        )
        imported.push({
          id: project.id,
          name: project.name,
          palletCount: shipment.palletCount,
          unplacedCount: result.unplaced_count,
        })
        setResults([...imported])
      }
      setProgress('Import terminé : les projets sont prêts à être contrôlés.')
    } catch (caught) {
      setError(
        `${(caught as Error).message} Les projets déjà préparés restent disponibles dans la liste.`,
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <main className="import-plan">
      <header className="import-plan__header">
        <div>
          <p className="workspace-header__eyebrow">Import de plan de chargement</p>
          <h1>Préparer les palettes depuis un fichier</h1>
          <p>
            Importez un CSV ou un XLSX : les palettes fiables sont lues,
            positionnées automatiquement dans le plus grand conteneur disponible,
            puis prêtes à être visualisées en 3D.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/')} disabled={isImporting}>
          ← Tous les projets
        </Button>
      </header>

      <section className="import-plan__card" aria-labelledby="import-source-title">
        <div className="panel-heading">
          <div>
            <p className="panel-heading__eyebrow">Source</p>
            <h2 id="import-source-title">Un fichier, un nom de projet</h2>
          </div>
          <span className="panel-heading__meta">CSV ou XLSX</span>
        </div>

        <div className="import-plan__fields">
          <Input
            id="import-project-name"
            label="Nom de base du projet"
            value={projectName}
            placeholder="Ex. Arrivage CESI juillet"
            onChange={(value) => {
              setProjectName(value)
              setError(null)
            }}
            disabled={isImporting}
          />
          <div className="import-file-field">
            <span className="ui-label" id="import-file-label">
              Fichier source
            </span>
            <input
              ref={fileInputRef}
              id="import-file"
              className="import-file-field__input"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              aria-labelledby="import-file-label"
              disabled={isParsing || isImporting}
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing || isImporting}
            >
              {isParsing ? 'Lecture du fichier…' : 'Choisir un fichier'}
            </Button>
            <span className="import-file-field__name" aria-live="polite">
              {selectedFileName || 'Aucun fichier sélectionné'}
            </span>
          </div>
        </div>

        {automaticContainer ? (
          <p className="import-plan__container">
            Conteneur retenu automatiquement : <strong>{automaticContainer.name}</strong>
            {' · '}
            {automaticContainer.length_cm} × {automaticContainer.width_cm} ×{' '}
            {automaticContainer.height_cm} cm
          </p>
        ) : containersLoading ? (
          <p className="muted">Chargement des conteneurs disponibles…</p>
        ) : (
          <p className="field-error" role="alert">
            Aucun conteneur de référence n’est disponible.
          </p>
        )}

        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {preview ? (
        <section className="import-plan__card" aria-labelledby="import-preview-title">
          <div className="panel-heading">
            <div>
              <p className="panel-heading__eyebrow">Contrôle avant import</p>
              <h2 id="import-preview-title">{preview.shipments.length} commande{preview.shipments.length > 1 ? 's' : ''} prête{preview.shipments.length > 1 ? 's' : ''}</h2>
            </div>
            <span className="panel-heading__meta">{totalPallets} palettes</span>
          </div>

          <ul className="import-preview-list">
            {preview.shipments.map((shipment) => (
              <li key={shipment.orderCode}>
                <div>
                  <strong>{shipment.orderCode}</strong>
                  <span>{shipment.palletType}</span>
                </div>
                <span>{shipment.palletCount} palettes</span>
              </li>
            ))}
          </ul>
          {preview.ignoredRows > 0 || preview.ignoredOrders > 0 ? (
            <p className="import-plan__note">
              {preview.ignoredRows} ligne{preview.ignoredRows > 1 ? 's' : ''}{' '}
              aux dimensions inexploitables et {preview.ignoredOrders} commande
              {preview.ignoredOrders > 1 ? 's' : ''} sans palette fiable ont été écartées.
            </p>
          ) : null}

          <div className="import-plan__submit">
            <p>
              Chaque commande deviendra un projet prêt à ouvrir à l’étape 3.
            </p>
            <Button
              variant="primary"
              onClick={() => void handleImport()}
              disabled={isImporting || !automaticContainer || !projectName.trim()}
            >
              {isImporting ? 'Préparation des projets…' : 'Créer les projets et optimiser'}
            </Button>
          </div>
        </section>
      ) : null}

      {progress ? (
        <p className="import-plan__progress" role="status">
          {progress}
        </p>
      ) : null}

      {results.length > 0 ? (
        <section className="import-plan__card" aria-labelledby="import-results-title">
          <div className="panel-heading">
            <div>
              <p className="panel-heading__eyebrow">Résultat</p>
              <h2 id="import-results-title">Projets préparés</h2>
            </div>
            <span className="panel-heading__meta">{results.length} créé{results.length > 1 ? 's' : ''}</span>
          </div>
          <ul className="import-results-list">
            {results.map((result) => (
              <li key={result.id}>
                <div>
                  <strong>{result.name}</strong>
                  <span>
                    {result.palletCount} palettes · {result.unplacedCount === 0
                      ? 'toutes placées'
                      : `${result.unplacedCount} non placée${result.unplacedCount > 1 ? 's' : ''}`}
                  </span>
                </div>
                <Button variant="secondary" onClick={() => navigate(projectStepPath(result.id, 3))}>
                  Ouvrir la vue 3D
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
