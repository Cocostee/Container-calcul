import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PanelHeading } from '../components/PanelHeading'
import { SizeChooser } from '../components/SizeChooser'
import { Button } from '../components/ui/Button/Button'
import { Icon } from '../components/ui/Icon'
import { Input } from '../components/ui/Input/Input'
import {
  adviseSizes,
  createProject,
  optimize,
  updateProject,
} from '../api/projects.api'
import { useContainerTypes } from '../hooks/useContainerTypes'
import { usePaletteTypes } from '../hooks/usePaletteTypes'
import { useTranslation } from '../i18n'
import { projectStepPath } from '../router/workflowRoutes'
import type { PackageLineInput } from '../types/palette.types'
import type {
  OptimizePaletteInput,
  SizeAdvice,
} from '../types/placement.types'
import { parseCesiImport, type CesiImportPreview } from '../utils/cesiImport'

/** Les trois temps de l'assistant. */
type Stage = 'file' | 'sizes' | 'done'

interface ImportOutcome {
  id: string
  name: string
  palletCount: number
  containerCount: number
  unplacedCount: number
}

/** Une ligne de colis devient une entrée de requête de calcul. */
function toOptimizeInput(
  lines: PackageLineInput[],
): OptimizePaletteInput[] {
  return lines.map((line, index) => ({
    instance_id: `imported-${index}`,
    length_cm: line.length_cm,
    width_cm: line.width_cm,
    height_cm: line.height_cm,
    weight_kg: line.weight_kg,
    quantity: line.quantity,
    stackable: line.stackable,
    rotatable: line.rotatable,
  }))
}

/**
 * Import d'un plan de chargement, en trois temps : le fichier, les tailles,
 * le projet.
 *
 * Tout le fichier forme **un seul projet** : les commandes qu'il contient
 * deviennent le lot commun, que le calcul répartit sur autant de conteneurs
 * qu'il en faut. Le code de commande reste dans le libellé de chaque charge
 * pour ne pas perdre la trace de son origine.
 */
export function ImportPlanPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { containerTypes, loading: containersLoading } = useContainerTypes()
  const { paletteTypes } = usePaletteTypes()

  const [stage, setStage] = useState<Stage>('file')
  const [projectName, setProjectName] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [preview, setPreview] = useState<CesiImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)

  const [containerTypeId, setContainerTypeId] = useState<string | null>(null)
  const [palletTypeId, setPalletTypeId] = useState<string | null>(null)
  const [advice, setAdvice] = useState<SizeAdvice | null>(null)
  const [adviceToken, setAdviceToken] = useState(0)

  /** Toutes les charges du fichier, en un seul lot. */
  const packages = useMemo<PackageLineInput[]>(() => {
    if (!preview) return []
    return preview.shipments.flatMap((shipment) =>
      shipment.pallets.map((pallet) => ({
        ...pallet,
        // Le code de commande nomme la charge : c'est la seule chose que le
        // fichier apporte et que les autres colonnes ne disent pas.
        label: shipment.orderCode,
      })),
    )
  }, [preview])

  const totalPallets = useMemo(
    () => packages.reduce((total, line) => total + line.quantity, 0),
    [packages],
  )

  // Les suggestions se recalculent quand la palette change : c'est elle qui
  // détermine combien de conteneurs seront nécessaires.
  useEffect(() => {
    if (stage !== 'sizes' || packages.length === 0) return
    let cancelled = false

    void adviseSizes(toOptimizeInput(packages), palletTypeId)
      .then((next) => {
        if (cancelled) return
        setAdvice(next)
        // Au premier passage, on adopte les tailles suggérées. Le format de
        // palette d'abord : c'est lui qui détermine le nombre de conteneurs,
        // et son adoption relance donc ce calcul une fois.
        setPalletTypeId((current) => {
          if (current) return current
          const best = next.pallets.find((entry) => entry.recommended)
          return best?.pallet_type_id ?? paletteTypes[0]?.id ?? null
        })
        setContainerTypeId((current) => {
          if (current) return current
          const best = next.containers.find((entry) => entry.recommended)
          return best?.container_type_id ?? containerTypes[0]?.id ?? null
        })
      })
      .catch(() => {
        if (!cancelled) setAdvice(null)
      })

    return () => {
      cancelled = true
    }
  }, [stage, packages, palletTypeId, adviceToken, containerTypes, paletteTypes])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setOutcome(null)
    setPreview(null)
    setSelectedFileName(file.name)
    setIsParsing(true)
    try {
      const parsed = await parseCesiImport(file)
      setPreview(parsed)
      setProjectName((current) =>
        current.trim() ? current : file.name.replace(/\.[^.]+$/, ''),
      )
      setStage('sizes')
      setAdviceToken((value) => value + 1)
    } catch (caught) {
      setSelectedFileName('')
      setError((caught as Error).message)
    } finally {
      setIsParsing(false)
    }
  }

  const handleImport = useCallback(async () => {
    const name = projectName.trim()
    if (!name) {
      setError(t('import.nameRequired'))
      return
    }
    if (packages.length === 0 || !containerTypeId) return

    setError(null)
    setIsImporting(true)
    setProgress(t('wizard.creating'))

    try {
      // Un seul projet, un seul conteneur déclaré : le calcul ajoutera les
      // suivants jusqu'à ce que tout soit embarqué. Revenir sur les tailles
      // remplace le projet déjà créé pour ce fichier au lieu d'en créer un
      // second : un fichier, un projet.
      const payload = {
        name,
        packages,
        containers: [
          {
            container_type_id: containerTypeId,
            container_custom_dims: null,
            pallet_type_id: palletTypeId,
          },
        ],
      }
      const project = outcome
        ? await updateProject(outcome.id, payload)
        : await createProject(payload)

      setProgress(t('wizard.loading'))
      const container = containerTypes.find(
        (type) => type.id === containerTypeId,
      )
      const pallet = paletteTypes.find((type) => type.id === palletTypeId)
      if (!container) throw new Error(t('import.noContainerAvailable'))

      const result = await optimize(project.id, {
        packages: project.packages.map((line, index) => ({
          instance_id: String(line.id ?? index),
          length_cm: line.length_cm,
          width_cm: line.width_cm,
          height_cm: line.height_cm,
          weight_kg: line.weight_kg,
          quantity: line.quantity,
          stackable: line.stackable,
          rotatable: line.rotatable,
        })),
        containers: project.containers.map((entry) => ({
          id: entry.id,
          container: {
            name: container.name,
            length_cm: container.length_cm,
            width_cm: container.width_cm,
            height_cm: container.height_cm,
            max_weight_kg: container.max_weight_kg,
          },
          pallet: pallet
            ? {
                id: pallet.id,
                label: pallet.name,
                length_cm: pallet.length_cm,
                width_cm: pallet.width_cm,
                base_height_cm: pallet.height_cm,
                max_load_height_cm: pallet.default_load_height_cm,
                max_weight_kg: pallet.max_weight_kg,
              }
            : null,
        })),
        auto_extend: true,
      })

      setOutcome({
        id: project.id,
        name: project.name,
        palletCount: totalPallets,
        containerCount: result.containers.length,
        unplacedCount: result.unplaced_package_count,
      })
      setProgress('')
      setStage('done')
    } catch (caught) {
      setError(
        t('import.importFailed', { message: (caught as Error).message }),
      )
      setProgress('')
    } finally {
      setIsImporting(false)
    }
  }, [
    containerTypeId,
    containerTypes,
    outcome,
    packages,
    paletteTypes,
    palletTypeId,
    projectName,
    t,
    totalPallets,
  ])

  /*
   * Changer une taille après validation ramène à l'étape des tailles : le
   * projet existe déjà, il sera mis à jour plutôt que dupliqué.
   */
  const handleContainerChange = (id: string) => {
    setContainerTypeId(id)
    if (stage === 'done') setStage('sizes')
  }

  const handlePalletChange = (id: string) => {
    setPalletTypeId(id)
    if (stage === 'done') setStage('sizes')
  }

  return (
    <main className="import-plan">
      <header className="import-plan__header">
        <div>
          <p className="workspace-header__eyebrow">{t('import.eyebrow')}</p>
          <h1>{t('import.title')}</h1>
          <p>{t('import.intro')}</p>
        </div>
        <Button
          variant="ghost"
          icon="arrow-left-outline"
          onClick={() => navigate('/')}
          disabled={isImporting}
        >
          {t('editor.allProjects')}
        </Button>
      </header>

      {/* 1 — le fichier */}
      <section className="import-plan__card" aria-labelledby="import-source-title">
        <PanelHeading
          icon="file-upload-outline"
          eyebrow={t('wizard.step1')}
          title={t('import.sourceTitle')}
          titleId="import-source-title"
          meta={t('import.fileFormats')}
        />

        <div className="import-plan__fields">
          <Input
            id="import-project-name"
            label={t('import.projectNameLabel')}
            value={projectName}
            placeholder={t('import.projectNamePlaceholder')}
            onChange={(value) => {
              setProjectName(value)
              setError(null)
            }}
            disabled={isImporting}
          />
          <div className="import-file-field">
            <span className="ui-label" id="import-file-label">
              {t('import.fileLabel')}
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
              icon="file-text"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing || isImporting}
            >
              {isParsing ? t('import.readingFile') : t('import.chooseFile')}
            </Button>
            <span className="import-file-field__name" aria-live="polite">
              {selectedFileName || t('import.noFile')}
            </span>
          </div>
        </div>

        {preview ? (
          <p className="import-plan__container">
            <Icon name="check-solid" size="sm" tone="primary" />
            {t('wizard.fileRead', {
              orders: preview.shipments.length,
              pallets: totalPallets,
            })}
          </p>
        ) : null}

        {preview && (preview.ignoredRows > 0 || preview.ignoredOrders > 0) ? (
          <p className="import-plan__note">
            {t('import.ignored', {
              rows: preview.ignoredRows,
              rowWord: t('import.rowWord', { count: preview.ignoredRows }),
              orders: preview.ignoredOrders,
              orderWord: t('import.orderWord', {
                count: preview.ignoredOrders,
              }),
            })}
          </p>
        ) : null}

        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {/* 2 — les tailles, avec leurs suggestions */}
      {stage !== 'file' ? (
        <section className="import-plan__card" aria-labelledby="import-sizes-title">
          <PanelHeading
            icon="container-outline"
            eyebrow={t('wizard.step2')}
            title={t('wizard.sizesTitle')}
            titleId="import-sizes-title"
            meta={
              advice
                ? t('wizard.forPallets', { count: totalPallets })
                : t('common.loading')
            }
          />

          {containersLoading ? (
            <p className="muted">{t('import.loadingContainers')}</p>
          ) : (
            <SizeChooser
              advice={advice}
              containerTypes={containerTypes}
              palletTypes={paletteTypes}
              containerTypeId={containerTypeId}
              palletTypeId={palletTypeId}
              onContainerChange={handleContainerChange}
              onPalletChange={handlePalletChange}
              disabled={isImporting}
            />
          )}

          {stage === 'sizes' ? (
            <div className="import-plan__submit">
              <p>
                {outcome ? t('wizard.updateHelp') : t('wizard.submitHelp')}
              </p>
              <Button
                variant="primary"
                icon="check-solid"
                onClick={() => void handleImport()}
                disabled={isImporting || !containerTypeId || !palletTypeId}
              >
                {isImporting
                  ? t('import.submitting')
                  : outcome
                    ? t('wizard.update')
                    : t('wizard.validate')}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {progress ? (
        <p className="import-plan__progress" role="status">
          {progress}
        </p>
      ) : null}

      {/* 3 — le projet, prêt à ouvrir */}
      {stage === 'done' && outcome ? (
        <section className="import-plan__card" aria-labelledby="import-result-title">
          <PanelHeading
            icon="check-solid"
            eyebrow={t('wizard.step3')}
            title={t('wizard.readyTitle')}
            titleId="import-result-title"
            meta={t('containers.count', { count: outcome.containerCount })}
          />

          <div className="import-outcome">
            <span className="import-outcome__figure">
              {outcome.containerCount}
            </span>
            <div>
              <strong>{outcome.name}</strong>
              <p className="muted">
                {t('wizard.readyDetail', {
                  count: outcome.palletCount,
                  containers: t('containers.count', {
                    count: outcome.containerCount,
                  }),
                })}
              </p>
              {outcome.unplacedCount > 0 ? (
                <div className="import-outcome__leftover" role="alert">
                  <p className="field-error">
                    {t('plan.leftOver', { count: outcome.unplacedCount })}
                  </p>
                  <p className="muted">{t('wizard.leftOverTitle')}</p>
                  <Button
                    variant="secondary"
                    icon="arrow-left-outline"
                    onClick={() => setStage('sizes')}
                  >
                    {t('wizard.leftOverAction')}
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="import-outcome__actions">
              <Button
                variant="secondary"
                icon="edit-outline"
                onClick={() => setStage('sizes')}
              >
                {t('wizard.changeSizes')}
              </Button>
              <Button
                variant="primary"
                iconAfter="arrow-right-outline"
                onClick={() => navigate(projectStepPath(outcome.id, 3))}
              >
                {t('import.openProject')}
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}
