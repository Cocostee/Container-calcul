export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}
