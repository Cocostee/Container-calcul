import Chip from '@mui/material/Chip'

import { Icon } from '../Icon'
import type { BadgeVariant, BadgeProps } from './Badge.types'
import type { IconName } from '../Icon'

/** Chaque état porte son signe, pour ne pas reposer sur la seule couleur. */
const glyph: Record<BadgeVariant, IconName | undefined> = {
  neutral: undefined,
  success: 'check-outline',
  warning: 'info-triangle-outline',
  danger: 'info-triangle-solid',
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  const name = glyph[variant]

  return (
    <Chip
      className={`ui-badge ui-badge--${variant}`}
      icon={name ? <Icon name={name} size="xs" /> : undefined}
      label={children}
      size="small"
    />
  )
}
