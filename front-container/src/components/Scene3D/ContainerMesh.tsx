// Semi-transparent wireframe box representing the container (scene units).
interface ContainerMeshProps {
  length: number
  width: number
  height: number
}

export function ContainerMesh({ length, width, height }: ContainerMeshProps) {
  return (
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[length, height, width]} />
      <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.4} />
    </mesh>
  )
}
