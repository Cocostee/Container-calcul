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
  target: [number, number, number]
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
 * Les palettes montées, parcourues une à une pour que chaque colis reste
 * lisible — ce que le plan de chargement ne permet pas, puisqu'il les serre
 * dans la cale. L'écart entre colis et la couche affichée se règlent ici,
 * pour contrôler l'empilage avant de passer au plan final.
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
      return { distance: 4, target: [0, 0.5, 0] as [number, number, number] }
    }
    const { pallet } = current
    const maxDim = Math.max(
      pallet.length * SCALE,
      pallet.width * SCALE,
      pallet.height * SCALE,
      1,
    )
    return {
      distance: maxDim * 1.9,
      target: [0, (pallet.height * SCALE) / 2, 0] as [number, number, number],
    }
  }, [current])

  if (!current) return null

  const { pallet } = current
  const palletBottom = -(pallet.height * SCALE) / 2

  return (
    <div className="pallet-explorer-scene">
      <ColorLegend
        entries={legend}
        selectedKey={highlightedKey}
        onToggle={(key) =>
          setHighlightedKey((value) => (value === key ? null : key))
        }
      />

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
        <span className="pallet-explorer__position" aria-live="polite">
          {t('palletization.palletPosition', {
            index: clampedIndex + 1,
            total: pallets.length,
          })}
        </span>
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
      <p className="pallet-explorer__origin">
        {t('palletization.containerOrigin', {
          position: current.containerPosition,
          name: current.containerName,
        })}
      </p>

      <div className="pallet-explorer__settings">
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
          <div
            className="pallet-explorer__layers"
            role="group"
            aria-label={t('palletization.layersLabel')}
          >
            <Button
              variant={layerIndex === null ? 'primary' : 'ghost'}
              aria-pressed={layerIndex === null}
              onClick={() => setLayerIndex(null)}
            >
              {t('palletization.layerAll')}
            </Button>
            {layers.map((_, layerOffset) => {
              const number = layerOffset + 1
              return (
                <Button
                  key={number}
                  variant={layerIndex === number ? 'primary' : 'ghost'}
                  aria-pressed={layerIndex === number}
                  onClick={() => setLayerIndex(number)}
                >
                  {t('palletization.layerOption', {
                    index: number,
                    total: layers.length,
                  })}
                </Button>
              )
            })}
          </div>
        ) : null}
      </div>

      <p className="palletization-scene__hint">
        {t('scene.palletExplorerHint')}
      </p>

      <Canvas
        aria-label={t('scene.palletExplorerAriaLabel')}
        camera={{
          position: [layout.distance, layout.distance, layout.distance],
          fov: 45,
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
            layerIndex !== null && layerOf(packagePlacement.z) !== layerIndex

          return (
            <PackageMesh
              key={packagePlacement.package_id}
              position={[
                -(pallet.length * SCALE) / 2 +
                  (packagePlacement.x + packagePlacement.length / 2) * SCALE,
                palletBottom +
                  pallet.base_height * SCALE +
                  (packagePlacement.z + packagePlacement.height / 2) * SCALE,
                -(pallet.width * SCALE) / 2 +
                  (packagePlacement.y + packagePlacement.width / 2) * SCALE,
              ]}
              size={[
                Math.max(packagePlacement.length - gapCm, 5) * SCALE,
                packagePlacement.height * SCALE,
                Math.max(packagePlacement.width - gapCm, 5) * SCALE,
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
  )
}
