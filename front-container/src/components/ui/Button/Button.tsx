import type { ButtonProps } from './Button.types'

export function Button({
  variant = 'primary',
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`ui-button ui-button--${variant} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}
