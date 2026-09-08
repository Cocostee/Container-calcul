import { Edges } from '@react-three/drei'

interface PalletVolumeMeshProps {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  onSelect?: () => void
}

/**
 * Enveloppe transparente d'une palette chargée. Elle prend délibérément la
 * hauteur de charge complète : c'est ainsi qu'on compare des volumes occupés
 * d'un coup d'œil.
 */
export function PalletVolumeMesh({
  position,
  size,
  color,
  onSelect,
}: PalletVolumeMeshProps) {
  return (
    <mesh
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.()
      }}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.065}
        depthWrite={false}
      />
      <Edges color={color} lineWidth={1.35} />
    </mesh>
  )
}
