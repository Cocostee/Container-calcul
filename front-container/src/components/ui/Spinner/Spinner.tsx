import CircularProgress from '@mui/material/CircularProgress'

import type { SpinnerProps } from './Spinner.types'

export function Spinner({ label }: SpinnerProps) {
  return (
    <span className="ui-spinner" role="status" aria-live="polite">
      <CircularProgress size={17} thickness={5} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </span>
  )
}
