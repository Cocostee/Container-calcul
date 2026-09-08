import Box from '@mui/material/Box'

import { icons } from './iconRegistry'
import type { IconProps, IconSize, IconTone } from './Icon.types'

const tones: Record<IconTone, string> = {
  inherit: 'inherit',
  primary: 'var(--primary)',
  accent: 'var(--accent)',
  muted: 'var(--color-muted)',
  faint: 'var(--color-faint)',
}

const sizes: Record<IconSize, string> = {
  xs: '1rem',
  sm: '1.25rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '2.75rem',
}

/**
 * Icône monochrome. Elle prend la couleur du texte environnant, ce qui lui
 * permet de suivre l'état du composant qui la porte sans réglage.
 */
export function Icon({
  name,
  size = 'sm',
  tone = 'inherit',
  label,
  className,
}: IconProps) {
  const markup = icons[name]
  if (!markup) return null

  return (
    <Box
      component="span"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      sx={{
        display: 'inline-flex',
        flex: '0 0 auto',
        width: sizes[size],
        height: sizes[size],
        color: tones[tone],
        '& svg': { display: 'block', width: '100%', height: '100%' },
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
