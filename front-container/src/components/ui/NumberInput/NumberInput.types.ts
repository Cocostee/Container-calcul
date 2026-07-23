export interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  unit?: string
  min?: number
  step?: number
  disabled?: boolean
  id?: string
}
