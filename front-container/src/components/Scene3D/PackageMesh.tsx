import { Edges, Html } from '@react-three/drei'
import { useState } from 'react'
import { useTranslation } from '../../i18n'

interface PackageMeshProps {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  label: string
  /** Un autre groupe est isolé par la légende : celui-ci s'efface sans disparaître. */
  dimmed?: boolean
}

/** Un colis, dévoilé dans la palette montée que l'on inspecte. */
export function PackageMesh({
  position,
  size,
  color,
  label,
  dimmed = false,
}: PackageMeshProps) {
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
      <meshStandardMaterial
        color={color}
        roughness={0.62}
        transparent={dimmed}
        opacity={dimmed ? 0.06 : 1}
        // Un colis estompé n'écrit plus dans le tampon de profondeur : sinon
        // il continue de cacher ce qu'il y a derrière malgré sa transparence,
        // et l'effet se voit à peine.
        depthWrite={!dimmed}
      />
      <Edges
        color={hovered ? '#ffffff' : '#172f30'}
        lineWidth={1}
        transparent={dimmed}
        opacity={dimmed ? 0.1 : 1}
      />
      {hovered ? (
        <Html center distanceFactor={8} className="mesh-tooltip">
          <strong>{label}</strong>
          <div>{t('scene.packageInSelected')}</div>
        </Html>
      ) : null}
    </mesh>
  )
}
