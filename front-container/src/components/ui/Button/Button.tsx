import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button'

import { Icon } from '../Icon'
import type { ButtonProps, ButtonVariant } from './Button.types'

/** Chaque intention se traduit par une variante et une couleur MUI. */
const appearance: Record<
  ButtonVariant,
  { variant: MuiButtonProps['variant']; color: MuiButtonProps['color'] }
> = {
  primary: { variant: 'contained', color: 'primary' },
  secondary: { variant: 'outlined', color: 'primary' },
  danger: { variant: 'contained', color: 'error' },
  ghost: { variant: 'text', color: 'primary' },
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  type = 'button',
  icon,
  iconAfter,
  ...rest
}: ButtonProps) {
  const { variant: muiVariant, color } = appearance[variant]

  return (
    <MuiButton
      type={type}
      variant={muiVariant}
      color={color}
      // Les classes historiques sont conservées : le CSS des pages s'appuie
      // dessus pour ajuster les boutons selon leur emplacement.
      className={`ui-button ui-button--${variant} ${className}`.trim()}
      startIcon={icon ? <Icon name={icon} /> : undefined}
      endIcon={iconAfter ? <Icon name={iconAfter} /> : undefined}
      {...rest}
    >
      {children}
    </MuiButton>
  )
}
