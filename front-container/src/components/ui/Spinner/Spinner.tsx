import type { SpinnerProps } from './Spinner.types'

export function Spinner({ label }: SpinnerProps) {
  return (
    <span className="ui-spinner" role="status" aria-live="polite">
      <span className="ui-spinner__dot" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </span>
  )
}
