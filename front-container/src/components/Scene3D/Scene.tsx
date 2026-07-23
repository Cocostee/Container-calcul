import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'

import type { OptimizeContainer, Placement } from '../../types/placement.types'
import { colorByPaletteType } from '../../utils/colorByPaletteType'
import { Button } from '../ui/Button/Button'
import { ContainerMesh } from './ContainerMesh'
import { PaletteMesh } from './PaletteMesh'

// cm -> scene units (metres).
const SCALE = 0.01
// Visual gap (cm) shaved off each pallet so neighbours don't look fused.
const PALETTE_GAP_CM = 3

type ViewPreset = 'iso' | 'top' | 'face'

interface PaletteInfo {
  label: string
  weight: number
}

interface SceneProps {
  container: OptimizeContainer
  placements: Placement[]
  paletteLookup: Record<string, PaletteInfo>
}

interface CameraRigProps {
  view: ViewPreset
  distance: number
  target: [number, number, number]
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

export function Scene({ container, placements, paletteLookup }: SceneProps) {
  const [view, setView] = useState<ViewPreset>('iso')

  const length = container.length_cm * SCALE
  const width = container.width_cm * SCALE
  const height = container.height_cm * SCALE
  const distance = Math.max(length, width, height) * 1.8
  const target: [number, number, number] = [0, height / 2, 0]

  return (
    <div className="scene3d">
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
      <p className="scene3d__hint">
        Faites glisser pour tourner la vue. Survolez une palette pour afficher
        ses détails.
      </p>
      <Canvas
        aria-label="Vue 3D du conteneur et de ses palettes placées"
        camera={{ position: [distance, distance, distance], fov: 45 }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[10, 20, 10]} intensity={0.6} />
        <CameraRig view={view} distance={distance} target={target} />
        <OrbitControls target={target} makeDefault />
        <ContainerMesh length={length} width={width} height={height} />
        {placements.map((placement) => {
          const base = placement.palette_instance_id.replace(/-\d+$/, '')
          const info = paletteLookup[base]
          return (
            <PaletteMesh
              key={placement.palette_instance_id}
              position={[
                (placement.x + placement.length / 2 - container.length_cm / 2) *
                  SCALE,
                (placement.z + placement.height / 2) * SCALE,
                (placement.y + placement.width / 2 - container.width_cm / 2) *
                  SCALE,
              ]}
              size={[
                Math.max(placement.length - PALETTE_GAP_CM, 1) * SCALE,
                Math.max(placement.height - PALETTE_GAP_CM, 1) * SCALE,
                Math.max(placement.width - PALETTE_GAP_CM, 1) * SCALE,
              ]}
              color={colorByPaletteType(placement.palette_instance_id)}
              label={info?.label ?? base}
              weightKg={info?.weight ?? 0}
              dimsLabel={`${placement.length}×${placement.width}×${placement.height} cm`}
            />
          )
        })}
      </Canvas>
    </div>
  )
}
