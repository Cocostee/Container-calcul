import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'

import { useTranslation } from '../../i18n'
import type { GeneratedPallet } from '../../types/placement.types'
import {
  assignPackageColors,
  colorByPaletteType,
  packageColorKey,
} from '../../utils/colorByPaletteType'
import { buildPackageLegend } from '../../utils/packageLegend'
import { ColorLegend } from './ColorLegend'
import { PackageMesh } from './PackageMesh'
import { PaletteMesh } from './PaletteMesh'

// Centimetres to scene units (metres).
const SCALE = 0.01
// Shave a little off every package so neighbours (and the pallet deck around a
// single package) stay visible instead of fusing into one solid block.
const PACKAGE_GAP_CM = 4

interface PalletizationSceneProps {
  pallets: GeneratedPallet[]
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
 * Les palettes montées, écartées les unes des autres à dessein : chaque colis
 * doit rester visible, ce que le plan de chargement ne permet pas puisqu'il
 * les serre dans la cale.
 */
export function PalletizationScene({ pallets }: PalletizationSceneProps) {
  const { t } = useTranslation()
  // Le groupe isolé par un clic sur la légende ; `null` montre tout normalement.
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)
  const layout = useMemo(() => {
    const maxLength = Math.max(
      ...pallets.map((pallet) => pallet.length * SCALE),
      1,
    )
    const maxWidth = Math.max(
      ...pallets.map((pallet) => pallet.width * SCALE), 1)
    const maxHeight = Math.max(
      ...pallets.map((pallet) => pallet.height * SCALE), 1)
    const columns = Math.max(1, Math.ceil(Math.sqrt(pallets.length)))
    const rows = Math.max(1, Math.ceil(pallets.length / columns))
    const horizontalGap = maxLength + 0.62
    const depthGap = maxWidth + 0.62
    const target: [number, number, number] = [0, maxHeight / 2, 0]
    const distance =
      Math.max(columns * horizontalGap, rows * depthGap, maxHeight) * 1.28

    const positionFor = (
      pallet: GeneratedPallet,
      index: number,
    ): [number, number, number] => {
      const column = index % columns
      const row = Math.floor(index / columns)
      return [
        (column - (columns - 1) / 2) * horizontalGap,
        (pallet.height * SCALE) / 2,
        (row - (rows - 1) / 2) * depthGap,
      ]
    }

    return { distance, positionFor, target }
  }, [pallets])

  const allPackages = useMemo(
    () => pallets.flatMap((pallet) => pallet.packages),
    [pallets],
  )
  // Une seule attribution pour tout le lot visible : la scène et la légende
  // doivent peindre chaque groupe de la même couleur, jamais deux groupes
  // sous la même.
  const packageColors = useMemo(
    () => assignPackageColors(allPackages),
    [allPackages],
  )
  const legend = useMemo(
    () => buildPackageLegend(allPackages, packageColors),
    [allPackages, packageColors],
  )

  return (
    <div className="palletization-scene">
      <ColorLegend
        entries={legend}
        selectedKey={highlightedKey}
        onToggle={(key) =>
          setHighlightedKey((current) => (current === key ? null : key))
        }
      />
      <p className="palletization-scene__hint">
        {t('scene.palletizationHint')}
      </p>
      <Canvas
        aria-label={t('scene.palletizationAriaLabel')}
        camera={{
          position: [layout.distance, layout.distance, layout.distance],
          fov: 45,
        }}
      >
        <ambientLight intensity={0.82} />
        <directionalLight position={[10, 20, 10]} intensity={0.76} />
        <CameraRig distance={layout.distance} target={layout.target} />
        <OrbitControls target={layout.target} makeDefault />
        {pallets.map((pallet, palletIndex) => {
          const palletPosition = layout.positionFor(pallet, palletIndex)
          const palletBottom = palletPosition[1] - (pallet.height * SCALE) / 2

          return (
            <group key={pallet.id}>
              <PaletteMesh
                position={palletPosition}
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
              {pallet.packages.map((packagePlacement) => (
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
                    Math.max(packagePlacement.length - PACKAGE_GAP_CM, 5) *
                      SCALE,
                    packagePlacement.height * SCALE,
                    Math.max(packagePlacement.width - PACKAGE_GAP_CM, 5) * SCALE,
                  ]}
                  color={
                    packageColors.get(packageColorKey(packagePlacement)) ??
                    colorByPaletteType(packagePlacement.package_id)
                  }
                  label={packagePlacement.label ?? packagePlacement.package_id}
                  dimmed={
                    highlightedKey !== null &&
                    packageColorKey(packagePlacement) !== highlightedKey
                  }
                />
              ))}
            </group>
          )
        })}
      </Canvas>
    </div>
  )
}
