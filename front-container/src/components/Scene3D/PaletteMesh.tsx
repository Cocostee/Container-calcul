import { Edges, Html } from '@react-three/drei'
import { useState } from 'react'

interface PaletteMeshProps {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  label: string
  weightKg: number
  dimsLabel: string
}

// One placed pallet as a coloured box, with a hover tooltip.
export function PaletteMesh({
  position,
  size,
  color,
  label,
  weightKg,
  dimsLabel,
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
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={hovered ? 1 : 0.92}
      />
      {/* Dark outline on every pallet so adjacent boxes stay visually distinct. */}
      <Edges color={hovered ? '#ffffff' : '#0f172a'} lineWidth={1.5} />
      {hovered ? (
        <Html center distanceFactor={8} className="mesh-tooltip">
          <strong>{label}</strong>
          <div>{dimsLabel}</div>
          <div>{weightKg} kg</div>
        </Html>
      ) : null}
    </mesh>
  )
}
