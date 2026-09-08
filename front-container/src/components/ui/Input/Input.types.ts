export interface InputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Prend le foyer à l'affichage : sert au passage en modification. */
  autoFocus?: boolean
  id?: string
}
