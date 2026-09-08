import { Edges, Html } from '@react-three/drei'
import { useState } from 'react'
import { useTranslation } from '../../i18n'

interface PaletteMeshProps {
  position: [number, number, number]
  size: [number, number, number]
  baseHeight?: number
  color: string
  label: string
  weightKg: number
  dimsLabel: string
  packageCount?: number
  selected?: boolean
  onSelect?: () => void
}

const WOOD_LIGHT = '#d6a15e'
const WOOD_DARK = '#a86632'
const DIRECTION_COLOR = '#79d5e3'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Une palette de bois, réutilisable telle quelle. Les planches, les dés et
 * les semelles rendent son orientation physique évidente ; les flèches bleues
 * indiquent l'entrée des fourches, c'est-à-dire l'avant, dans toutes les vues
 * en 3D.
 */
export function PaletteMesh({
  position,
  size,
  baseHeight = 0,
  color,
  label,
  weightKg,
  dimsLabel,
  packageCount,
  selected = false,
  onSelect,
}: PaletteMeshProps) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)
  const [length, totalHeight, width] = size
  const palletHeight = clamp(
    baseHeight || Math.min(totalHeight, 0.15),
    Math.min(totalHeight, 0.055),
    totalHeight,
  )
  const boardThickness = clamp(palletHeight * 0.16, 0.012, 0.028)
  const blockHeight = Math.max(palletHeight - boardThickness * 2, 0.012)
  const bottom = -totalHeight / 2
  const topDeckY = bottom + palletHeight - boardThickness / 2
  const bottomDeckY = bottom + boardThickness / 2
  const blockY = bottom + boardThickness + blockHeight / 2
  const topBoardWidth = length / 6.8
  const runnerWidth = width / 4.8
  const isHighlighted = selected || hovered

  return (
    <group
      position={position}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.()
      }}
    >
      {/* Six top deck boards laid across the width define the long axis. */}
      {Array.from({ length: 6 }, (_, index) => {
        const x =
          -length / 2 +
          topBoardWidth / 2 +
          (index * (length - topBoardWidth)) / 5
        return (
          <mesh key={`deck-${index}`} position={[x, topDeckY, 0]}>
            <boxGeometry args={[topBoardWidth, boardThickness, width * 0.97]} />
            <meshStandardMaterial color={WOOD_LIGHT} roughness={0.86} />
          </mesh>
        )
      })}

      {/* Three lower runners leave visible fork openings between them. */}
      {[-1, 0, 1].map((offset) => (
        <mesh
          key={`runner-${offset}`}
          position={[0, bottomDeckY, offset * width * 0.31]}
        >
          <boxGeometry args={[length * 0.97, boardThickness, runnerWidth]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
        </mesh>
      ))}

      {/* Nine support blocks make the pallet silhouette legible from every angle. */}
      {[-1, 0, 1].flatMap((xOffset) =>
        [-1, 0, 1].map((zOffset) => (
          <mesh
            key={`block-${xOffset}-${zOffset}`}
            position={[
              xOffset * length * 0.34,
              blockY,
              zOffset * width * 0.31,
            ]}
          >
            <boxGeometry
              args={[length * 0.17, blockHeight, width * 0.2]}
            />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.9} />
          </mesh>
        )),
      )}

      {/* The coloured end bar and arrows establish the forward / fork-entry side. */}
      <mesh
        position={[length / 2 + 0.01, bottom + palletHeight * 0.52, 0]}
      >
        <boxGeometry args={[0.032, palletHeight * 0.9, width * 0.78]} />
        <meshBasicMaterial color={DIRECTION_COLOR} />
      </mesh>
      {[-1, 1].map((offset) => (
        <mesh
          key={`direction-${offset}`}
          position={[
            length / 2 + 0.045,
            bottom + palletHeight * 0.52,
            offset * width * 0.21,
          ]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          <coneGeometry args={[Math.min(width * 0.095, 0.055), length * 0.2, 3]} />
          <meshBasicMaterial color={DIRECTION_COLOR} />
        </mesh>
      ))}

      {isHighlighted ? (
        <mesh position={[0, bottom + palletHeight / 2, 0]}>
          <boxGeometry args={[length, palletHeight, width]} />
          <meshBasicMaterial transparent opacity={0.05} color={color} />
          <Edges color={selected ? '#ffffff' : color} lineWidth={1.7} />
        </mesh>
      ) : null}

      {hovered ? (
        <Html center distanceFactor={8} className="mesh-tooltip">
          <strong>{label}</strong>
          <div>{dimsLabel}</div>
          <div>{weightKg} kg</div>
          <div>{t('scene.orientation')}</div>
          {packageCount !== undefined ? (
            <div>{t('scene.palletPackages', { count: packageCount })}</div>
          ) : null}
          {onSelect ? <div>{t('scene.clickToInspect')}</div> : null}
        </Html>
      ) : null}
    </group>
  )
}
