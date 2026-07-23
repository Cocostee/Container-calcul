import type { BadgeProps } from './Badge.types'

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${variant}`}>{children}</span>
}
