import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'

import type {
  GeneratedPallet,
  OptimizeContainer,
  Placement,
} from '../../types/placement.types'
import { colorByPaletteType } from '../../utils/colorByPaletteType'
import { Button } from '../ui/Button/Button'
import { ContainerMesh } from './ContainerMesh'
import { PackageMesh } from './PackageMesh'
import { PaletteMesh } from './PaletteMesh'
import { PalletVolumeMesh } from './PalletVolumeMesh'

// cm -> scene units (metres).
const SCALE = 0.01
const ALL_PALLETS_VALUE = '__all-pallets__'
const VOLUME_COLOR = '#f5c451'

type ViewPreset = 'iso' | 'top' | 'face'
type DisplayMode = 'container' | 'exploded'

interface SceneProps {
  container: OptimizeContainer
  placements: Placement[]
  pallets: GeneratedPallet[]
}

interface CameraRigProps {
  view: ViewPreset
  distance: number
  target: [number, number, number]
}

interface DisplayedPallet {
  pallet: GeneratedPallet
  placement: Placement
  index: number
}

// Reposition the camera when a preset view button is pressed.
function CameraRig({ view, distance, target }: CameraRigProps) {
  const { camera } = useThree()

  useEffect(() => {
    const positions: Record<ViewPreset, [number, number, number]> = {
      iso: [distance, distance, distance],
      top: [0.001, distance * 1.8, 0.001],
      face: [0, target[1], distance * 1.6],
    }
    const [x, y, z] = positions[view]
    camera.position.set(x, y, z)
    camera.lookAt(target[0], target[1], target[2])
  }, [view, distance, target, camera])

  return null
}

const VIEW_LABELS: Record<ViewPreset, string> = {
  iso: 'Isométrique',
  top: 'Dessus',
  face: 'Face',
}

const DISPLAY_LABELS: Record<DisplayMode, string> = {
  container: 'Conteneur',
  exploded: 'Vue éclatée',
}

function legacyPallets(placements: Placement[]): GeneratedPallet[] {
  return placements.map((placement) => ({
    id: placement.palette_instance_id,
    label: placement.palette_instance_id,
    length: placement.length,
    width: placement.width,
    height: placement.height,
    base_height: 0,
    weight_kg: 0,
    package_count: 0,
    fill_rate_volume: 0,
    fill_rate_weight: 0,
    packages: [],
  }))
}

export function Scene({ container, placements, pallets }: SceneProps) {
  const [view, setView] = useState<ViewPreset>('iso')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('container')
  const [selectedPalletId, setSelectedPalletId] = useState<string>('')

  const allPallets = useMemo(
    () => (pallets.length > 0 ? pallets : legacyPallets(placements)),
    [pallets, placements],
  )
  const displayedPallets = useMemo<DisplayedPallet[]>(
    () =>
      placements.flatMap((placement, index) => {
        const pallet = allPallets.find(
          (candidate) => candidate.id === placement.palette_instance_id,
        )
        return pallet ? [{ pallet, placement, index }] : []
      }),
    [allPallets, placements],
  )
  const selected = displayedPallets.find(
    ({ pallet }) => pallet.id === selectedPalletId,
  )
  const isAllPalletsView = selectedPalletId === ALL_PALLETS_VALUE
  const palletsToInspect = isAllPalletsView
    ? displayedPallets
    : selected
      ? [selected]
      : []
  const totalPackageCount = displayedPallets.reduce(
    (total, { pallet }) => total + pallet.package_count,
    0,
  )

  const length = container.length_cm * SCALE
  const width = container.width_cm * SCALE
  const height = container.height_cm * SCALE
  const maxPalletLength = Math.max(
    ...allPallets.map((pallet) => pallet.length * SCALE),
    1,
  )
  const maxPalletWidth = Math.max(
    ...allPallets.map((pallet) => pallet.width * SCALE),
    1,
  )
  const explodedColumns = Math.max(1, Math.ceil(Math.sqrt(displayedPallets.length)))
  const explodedRows = Math.max(
    1,
    Math.ceil(displayedPallets.length / explodedColumns),
  )
  const explodedWidth = explodedColumns * (maxPalletLength + 0.5)
  const explodedDepth = explodedRows * (maxPalletWidth + 0.5)
  const target: [number, number, number] =
    displayMode === 'exploded' ? [0, 0.65, 0] : [0, height / 2, 0]
  const distance =
    Math.max(
      displayMode === 'exploded' ? explodedWidth : length,
      displayMode === 'exploded' ? explodedDepth : width,
      height,
    ) * 1.9

  const displayPosition = ({
    pallet,
    placement,
    index,
  }: DisplayedPallet): [number, number, number] => {
    if (displayMode === 'container') {
      return [
        (placement.x + placement.length / 2 - container.length_cm / 2) * SCALE,
        (placement.z + placement.height / 2) * SCALE,
        (placement.y + placement.width / 2 - container.width_cm / 2) * SCALE,
      ]
    }

    const column = index % explodedColumns
    const row = Math.floor(index / explodedColumns)
    return [
      (column - (explodedColumns - 1) / 2) * (maxPalletLength + 0.5),
      (pallet.height / 2) * SCALE,
      (row - (explodedRows - 1) / 2) * (maxPalletWidth + 0.5),
    ]
  }

  return (
    <div className="scene3d">
      <div className="scene3d__toolbar">
        <div className="scene3d__views" role="group" aria-label="Angle de vue">
          {(Object.keys(VIEW_LABELS) as ViewPreset[]).map((preset) => (
            <Button
              key={preset}
              variant={view === preset ? 'primary' : 'ghost'}
              aria-pressed={view === preset}
              onClick={() => setView(preset)}
            >
              {VIEW_LABELS[preset]}
            </Button>
          ))}
        </div>
        <div className="scene3d__modes" role="group" aria-label="Mode d'affichage">
          {(Object.keys(DISPLAY_LABELS) as DisplayMode[]).map((mode) => (
            <Button
              key={mode}
              variant={displayMode === mode ? 'primary' : 'ghost'}
              aria-pressed={displayMode === mode}
              onClick={() => setDisplayMode(mode)}
            >
              {DISPLAY_LABELS[mode]}
            </Button>
          ))}
        </div>
      </div>
      {displayedPallets.length > 0 ? (
        <label className="scene3d__explore">
          <span>Explorer une palette</span>
          <select
            value={selectedPalletId}
            onChange={(event) => {
              const nextPalletId = event.target.value
              setSelectedPalletId(nextPalletId)
              if (nextPalletId === ALL_PALLETS_VALUE) {
                setDisplayMode('exploded')
              }
            }}
          >
            <option value="">Choisir une palette</option>
            <option value={ALL_PALLETS_VALUE}>
              Toutes les palettes remplies · {totalPackageCount} colis
            </option>
            {displayedPallets.map(({ pallet }) => (
              <option key={pallet.id} value={pallet.id}>
                {pallet.label} · {pallet.package_count} colis
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selected || isAllPalletsView ? (
        <div className="scene3d__selection" role="status">
          <strong>
            {isAllPalletsView ? 'Toutes les palettes remplies' : selected?.pallet.label}
          </strong>
          {isAllPalletsView ? (
            <span>
              {displayedPallets.length} palettes · {totalPackageCount} colis ·
              volumes visibles
            </span>
          ) : (
            <span>
              {selected?.pallet.package_count} colis ·{' '}
              {Math.round((selected?.pallet.fill_rate_volume ?? 0) * 100)} % rempli
            </span>
          )}
          <Button variant="ghost" onClick={() => setSelectedPalletId('')}>
            Fermer la vue
          </Button>
        </div>
      ) : null}
      <p className="scene3d__hint">
        Sélectionnez « Toutes les palettes remplies » pour comparer tous les
        colis et leurs volumes transparents : la vue éclatée s&apos;active pour
        faciliter l&apos;inspection. Les flèches et la traverse colorée indiquent
        le sens de la palette.
      </p>
      <Canvas
        aria-label="Vue 3D du conteneur, des palettes générées et des colis"
        camera={{ position: [distance, distance, distance], fov: 45 }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 20, 10]} intensity={0.72} />
        <CameraRig view={view} distance={distance} target={target} />
        <OrbitControls target={target} makeDefault />
        <ContainerMesh
          length={length}
          width={width}
          height={height}
          opacity={displayMode === 'exploded' ? 0.12 : 0.4}
        />
        {displayedPallets.map((displayed) => {
          const { pallet, placement } = displayed
          return (
            <PaletteMesh
              key={pallet.id}
              position={displayPosition(displayed)}
              size={[
                placement.length * SCALE,
                placement.height * SCALE,
                placement.width * SCALE,
              ]}
              baseHeight={pallet.base_height * SCALE}
              color={colorByPaletteType(pallet.id)}
              label={pallet.label}
              weightKg={pallet.weight_kg}
              dimsLabel={`${Math.round(pallet.length)}×${Math.round(
                pallet.width,
              )}×${Math.round(pallet.height)} cm`}
              packageCount={pallet.package_count}
              selected={selectedPalletId === pallet.id}
              onSelect={() => setSelectedPalletId(pallet.id)}
            />
          )
        })}
        {palletsToInspect.map((displayed) => {
          const { pallet, placement } = displayed
          const palletPosition = displayPosition(displayed)
          return (
            <PalletVolumeMesh
              key={`volume-${pallet.id}`}
              position={palletPosition}
              size={[
                placement.length * SCALE,
                placement.height * SCALE,
                placement.width * SCALE,
              ]}
              color={VOLUME_COLOR}
              onSelect={() => setSelectedPalletId(pallet.id)}
            />
          )
        })}
        {palletsToInspect.flatMap((displayed) => {
          const { pallet } = displayed
          const palletPosition = displayPosition(displayed)
          const palletBottom =
            palletPosition[1] - (pallet.height * SCALE) / 2
          return pallet.packages.map((packagePlacement) => {
            return (
              <PackageMesh
                key={`${pallet.id}-${packagePlacement.package_id}`}
                position={[
                  palletPosition[0] - (pallet.length * SCALE) / 2 +
                    (packagePlacement.x + packagePlacement.length / 2) * SCALE,
                  palletBottom +
                    pallet.base_height * SCALE +
                    (packagePlacement.z + packagePlacement.height / 2) * SCALE,
                  palletPosition[2] - (pallet.width * SCALE) / 2 +
                    (packagePlacement.y + packagePlacement.width / 2) * SCALE,
                ]}
                size={[
                  packagePlacement.length * SCALE,
                  packagePlacement.height * SCALE,
                  packagePlacement.width * SCALE,
                ]}
                color={colorByPaletteType(packagePlacement.package_id)}
                label={packagePlacement.package_id}
              />
            )
          })
        })}
      </Canvas>
    </div>
  )
}
