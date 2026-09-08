import { Edges, Html } from '@react-three/drei'
import { useState } from 'react'
import { useTranslation } from '../../i18n'

interface PackageMeshProps {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  label: string
}

/** Un colis, dévoilé dans la palette montée que l'on inspecte. */
export function PackageMesh({ position, size, color, label }: PackageMeshProps) {
  const { t } = useTranslation()
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
          <div>{t('scene.packageInSelected')}</div>
        </Html>
      ) : null}
    </mesh>
  )
}
