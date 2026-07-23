import { Edges, Html } from '@react-three/drei'
import { useState } from 'react'

interface PackageMeshProps {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  label: string
}

/** One package revealed inside the currently selected generated pallet. */
export function PackageMesh({ position, size, color, label }: PackageMeshProps) {
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
      <meshStandardMaterial color={color} roughness={0.62} />
      <Edges color={hovered ? '#ffffff' : '#172f30'} lineWidth={1} />
      {hovered ? (
        <Html center distanceFactor={8} className="mesh-tooltip">
          <strong>{label}</strong>
          <div>Colis dans la palette sélectionnée</div>
        </Html>
      ) : null}
    </mesh>
  )
}
