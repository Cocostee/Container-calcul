export interface SelectOption {
  value: string
  label: string
  /** Choix impossible : affiche, mais hors d'atteinte. */
  disabled?: boolean
}

export interface SelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}
