import { Edges, Html } from '@react-three/drei'
import { useState } from 'react'

interface PaletteMeshProps {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  label: string
  weightKg: number
  dimsLabel: string
  packageCount?: number
  selected?: boolean
  onSelect?: () => void
}

// One placed pallet as a coloured box, with a hover tooltip.
export function PaletteMesh({
  position,
  size,
  color,
  label,
  weightKg,
  dimsLabel,
  packageCount,
  selected = false,
  onSelect,
}: PaletteMeshProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <mesh
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
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={selected ? 0.16 : hovered ? 1 : 0.88}
      />
      {/* Dark outline on every pallet so adjacent boxes stay visually distinct. */}
      <Edges color={selected || hovered ? '#ffffff' : '#0f172a'} lineWidth={1.5} />
      {hovered ? (
        <Html center distanceFactor={8} className="mesh-tooltip">
          <strong>{label}</strong>
          <div>{dimsLabel}</div>
          <div>{weightKg} kg</div>
          {packageCount !== undefined ? <div>{packageCount} colis</div> : null}
          {onSelect ? <div>Cliquez pour voir le chargement</div> : null}
        </Html>
      ) : null}
    </mesh>
  )
}
