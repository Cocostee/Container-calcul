import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'

import { useTranslation } from '../../i18n'
import type {
  GeneratedPallet,
  PackagePlacement,
} from '../../types/placement.types'
import {
  assignPackageColors,
  colorByPaletteType,
  packageColorKey,
} from '../../utils/colorByPaletteType'
import { buildPackageLegend } from '../../utils/packageLegend'
import { Button } from '../ui/Button/Button'
import { ColorLegend } from './ColorLegend'
import { PackageMesh } from './PackageMesh'
import { PaletteMesh } from './PaletteMesh'

// Centimetres to scene units (metres).
const SCALE = 0.01
// Écart par défaut entre colis voisins, réglable par l'utilisateur.
const DEFAULT_GAP_CM = 4
const MIN_GAP_CM = 0
const MAX_GAP_CM = 20

type Vec3 = [number, number, number]

/** Une palette du plan, rattachée au conteneur qui la reçoit. */
export interface PalletWithOrigin {
  pallet: GeneratedPallet
  containerPosition: number
  containerName: string
}

interface PalletExplorerSceneProps {
  pallets: PalletWithOrigin[]
}

interface CameraRigProps {
  distance: number
  target: Vec3
}

function CameraRig({ distance, target }: CameraRigProps) {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(distance, distance * 0.82, distance)
    camera.lookAt(target[0], target[1], target[2])
  }, [camera, distance, target])

  return null
}

/**
 * Les paliers d'une palette, dans l'ordre où ils se sont montés : la cote Z
 * de pose de chaque colis, arrondie pour absorber les écarts flottants, sans
 * doublon et triée du sol vers le haut.
 */
function layersOf(packages: PackagePlacement[]): number[] {
  const distinctZ = [...new Set(packages.map((item) => Math.round(item.z)))]
  distinctZ.sort((a, b) => a - b)
  return distinctZ
}

/**
 * Écarte chaque colis de son point de pose, en l'éloignant du centre du lot
 * dans les trois axes — sans jamais toucher à sa taille. C'est le principe
 * de la vue éclatée déjà utilisée ailleurs dans l'application, appliqué ici
 * aux colis d'une même palette plutôt qu'aux palettes d'un conteneur.
 */
function explodeOffsets(
  packages: PackagePlacement[],
  gapCm: number,
): Map<string, Vec3> {
  const offsets = new Map<string, Vec3>()
  if (packages.length === 0 || gapCm === 0) return offsets

  const centroid = packages.reduce(
    (acc, item) => [
      acc[0] + item.x + item.length / 2,
      acc[1] + item.y + item.width / 2,
      acc[2] + item.z + item.height / 2,
    ],
    [0, 0, 0],
  )
  centroid[0] /= packages.length
  centroid[1] /= packages.length
  centroid[2] /= packages.length

  for (const item of packages) {
    const center: Vec3 = [
      item.x + item.length / 2,
      item.y + item.width / 2,
      item.z + item.height / 2,
    ]
    const direction: Vec3 = [
      center[0] - centroid[0],
      center[1] - centroid[1],
      center[2] - centroid[2],
    ]
    const magnitude = Math.hypot(direction[0], direction[1], direction[2])
    offsets.set(
      item.package_id,
      magnitude > 1e-6
        ? [
            (direction[0] / magnitude) * gapCm,
            (direction[1] / magnitude) * gapCm,
            (direction[2] / magnitude) * gapCm,
          ]
        : [0, 0, 0],
    )
  }

  return offsets
}

/**
 * Les palettes montées, parcourues une à une pour que chaque colis reste
 * lisible — ce que le plan de chargement ne permet pas, puisqu'il les serre
 * dans la cale. L'écart entre colis et la couche affichée se règlent au fil
 * de la page, au-dessus du hublot, qui garde ainsi toute la place pour la 3D.
 */
export function PalletExplorerScene({ pallets }: PalletExplorerSceneProps) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [gapCm, setGapCm] = useState(DEFAULT_GAP_CM)
  // La couche isolée, ou `null` pour montrer tout l'empilage.
  const [layerIndex, setLayerIndex] = useState<number | null>(null)
  // Le groupe isolé par un clic sur la légende ; `null` montre tout normalement.
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)

  // Le lot peut rétrécir (import, suppression) : on affiche la dernière
  // palette valide plutôt qu'une position qui a disparu.
  const clampedIndex = Math.min(index, Math.max(pallets.length - 1, 0))
  const current = pallets[clampedIndex] ?? null

  /*
   * Chaque palette a ses propres paliers : une couche isolée sur la
   * précédente ne correspond à rien sur la suivante. On l'ajuste pendant le
   * rendu plutôt que dans un effet, pour ne jamais peindre un état
   * transitoire incohérent (voir la doc React sur l'ajustement d'état).
   */
  const [lastPalletId, setLastPalletId] = useState(current?.pallet.id)
  if (current && current.pallet.id !== lastPalletId) {
    setLastPalletId(current.pallet.id)
    if (layerIndex !== null) setLayerIndex(null)
  }

  const layers = useMemo(
    () => (current ? layersOf(current.pallet.packages) : []),
    [current],
  )

  const layerOf = (z: number): number => layers.indexOf(Math.round(z)) + 1

  const offsets = useMemo(
    () => explodeOffsets(current?.pallet.packages ?? [], gapCm),
    [current, gapCm],
  )

  // Une seule attribution pour tout le lot visible : la couleur d'une
  // commande reste la même d'une palette à l'autre pendant qu'on les parcourt.
  const allPackages = useMemo(
    () => pallets.flatMap((entry) => entry.pallet.packages),
    [pallets],
  )
  const packageColors = useMemo(
    () => assignPackageColors(allPackages),
    [allPackages],
  )
  const legend = useMemo(
    () => buildPackageLegend(current?.pallet.packages ?? [], packageColors),
    [current, packageColors],
  )

  const layout = useMemo(() => {
    if (!current) {
      return { distance: 4, target: [0, 0.5, 0] as Vec3 }
    }
    const { pallet } = current
    const maxDim = Math.max(
      pallet.length * SCALE,
      pallet.width * SCALE,
      pallet.height * SCALE,
      1,
    )
    // La vue éclatée gagne en portée : la caméra recule pour la garder entière.
    const spread = 1 + (gapCm * SCALE) / maxDim
    return {
      distance: maxDim * 3.2 * spread,
      target: [0, (pallet.height * SCALE) / 2, 0] as Vec3,
    }
  }, [current, gapCm])

  if (!current) return null

  const { pallet } = current
  const palletBottom = -(pallet.height * SCALE) / 2

  return (
    <div className="pallet-explorer">
      <div className="pallet-explorer__toolbar">
        <div className="pallet-explorer__total" role="status">
          <strong>{pallets.length}</strong>
          <span>{t('palletization.totalLabel')}</span>
        </div>

        <div
          className="pallet-explorer__nav"
          role="group"
          aria-label={t('palletization.title')}
        >
          <Button
            variant="ghost"
            icon="arrow-left-outline"
            disabled={clampedIndex === 0}
            onClick={() => setIndex(Math.max(0, clampedIndex - 1))}
          >
            {t('palletization.navPrevious')}
          </Button>
          <label className="pallet-explorer__pallet-select">
            <span>{t('palletization.choosePalletLabel')}</span>
            <select
              value={clampedIndex}
              onChange={(event) => setIndex(Number(event.target.value))}
            >
              {pallets.map((entry, entryIndex) => (
                <option key={entry.pallet.id} value={entryIndex}>
                  {t('palletization.palletSelectOption', {
                    index: entryIndex + 1,
                    total: pallets.length,
                    position: entry.containerPosition,
                  })}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="ghost"
            iconAfter="arrow-right-outline"
            disabled={clampedIndex === pallets.length - 1}
            onClick={() =>
              setIndex(Math.min(pallets.length - 1, clampedIndex + 1))
            }
          >
            {t('palletization.navNext')}
          </Button>
        </div>
      </div>

      <div className="pallet-explorer__adjustments">
        <label className="pallet-explorer__gap">
          <span>
            {t('palletization.gapLabel')} ·{' '}
            {t('palletization.gapValue', { value: gapCm })}
          </span>
          <input
            type="range"
            min={MIN_GAP_CM}
            max={MAX_GAP_CM}
            step={1}
            value={gapCm}
            aria-label={t('palletization.gapLabel')}
            onChange={(event) => setGapCm(Number(event.target.value))}
          />
        </label>

        {layers.length > 1 ? (
          <label className="pallet-explorer__layer-select">
            <span>{t('palletization.layersLabel')}</span>
            <select
              value={layerIndex ?? 'all'}
              onChange={(event) =>
                setLayerIndex(
                  event.target.value === 'all'
                    ? null
                    : Number(event.target.value),
                )
              }
            >
              <option value="all">{t('palletization.layerAll')}</option>
              {layers.map((_, layerOffset) => {
                const number = layerOffset + 1
                return (
                  <option key={number} value={number}>
                    {t('palletization.layerOption', {
                      index: number,
                      total: layers.length,
                    })}
                  </option>
                )
              })}
            </select>
          </label>
        ) : null}
      </div>

      <div className="palletization-viewport">
        <ColorLegend
          entries={legend}
          selectedKey={highlightedKey}
          onToggle={(key) =>
            setHighlightedKey((value) => (value === key ? null : key))
          }
        />
        <p className="palletization-scene__hint">
          {t('scene.palletExplorerHint')}
        </p>

        <Canvas
          aria-label={t('scene.palletExplorerAriaLabel')}
          camera={{
            position: [layout.distance, layout.distance, layout.distance],
            fov: 28,
          }}
        >
          <ambientLight intensity={0.82} />
          <directionalLight position={[10, 20, 10]} intensity={0.76} />
          <CameraRig distance={layout.distance} target={layout.target} />
          <OrbitControls target={layout.target} makeDefault />
          <PaletteMesh
            position={[0, (pallet.height * SCALE) / 2, 0]}
            size={[
              pallet.length * SCALE,
              pallet.height * SCALE,
              pallet.width * SCALE,
            ]}
            baseHeight={pallet.base_height * SCALE}
            color={colorByPaletteType(pallet.id)}
            label={pallet.label}
            weightKg={pallet.weight_kg}
            dimsLabel={`${Math.round(pallet.length)}×${Math.round(
              pallet.width,
            )}×${Math.round(pallet.height)} cm`}
            packageCount={pallet.package_count}
            selected
          />
          {pallet.packages.map((packagePlacement) => {
            const dimmedByLegend =
              highlightedKey !== null &&
              packageColorKey(packagePlacement) !== highlightedKey
            const dimmedByLayer =
              layerIndex !== null &&
              layerOf(packagePlacement.z) !== layerIndex
            const offset = offsets.get(packagePlacement.package_id) ?? [
              0, 0, 0,
            ]

            return (
              <PackageMesh
                key={packagePlacement.package_id}
                position={[
                  -(pallet.length * SCALE) / 2 +
                    (packagePlacement.x +
                      packagePlacement.length / 2 +
                      offset[0]) *
                      SCALE,
                  palletBottom +
                    pallet.base_height * SCALE +
                    (packagePlacement.z +
                      packagePlacement.height / 2 +
                      offset[2]) *
                      SCALE,
                  -(pallet.width * SCALE) / 2 +
                    (packagePlacement.y +
                      packagePlacement.width / 2 +
                      offset[1]) *
                      SCALE,
                ]}
                // La taille d'origine du colis, intacte : seul son écart aux
                // voisins bouge avec le réglage, jamais sa taille.
                size={[
                  packagePlacement.length * SCALE,
                  packagePlacement.height * SCALE,
                  packagePlacement.width * SCALE,
                ]}
                color={
                  packageColors.get(packageColorKey(packagePlacement)) ??
                  colorByPaletteType(packagePlacement.package_id)
                }
                label={packagePlacement.label ?? packagePlacement.package_id}
                dimmed={dimmedByLegend || dimmedByLayer}
              />
            )
          })}
        </Canvas>
      </div>
    </div>
  )
}
