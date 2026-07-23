import type { ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger'

export interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
}
