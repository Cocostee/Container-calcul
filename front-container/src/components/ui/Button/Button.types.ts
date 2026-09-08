import type { ButtonHTMLAttributes, ReactNode } from 'react'

import type { IconName } from '../Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

/** `color` est retiré : l'attribut HTML entrerait en conflit avec celui de MUI. */
export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: ButtonVariant
  children: ReactNode
  /** Icône posée avant le libellé. */
  icon?: IconName
  /** Icône posée après le libellé (une direction, un dépliement). */
  iconAfter?: IconName
}
