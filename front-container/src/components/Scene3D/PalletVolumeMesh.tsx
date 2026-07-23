import { Edges } from '@react-three/drei'

interface PalletVolumeMeshProps {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  onSelect?: () => void
}

/**
 * Transparent envelope of a loaded pallet. It deliberately uses the complete
 * loaded height so planners can compare occupied volumes at a glance.
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
