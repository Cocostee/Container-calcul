// Caisse en fil de fer semi-transparente : le conteneur, en unités de scène.
interface ContainerMeshProps {
  length: number
  width: number
  height: number
  opacity?: number
}

export function ContainerMesh({
  length,
  width,
  height,
  opacity = 0.4,
}: ContainerMeshProps) {
  return (
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[length, height, width]} />
      <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={opacity} />
    </mesh>
  )
}
