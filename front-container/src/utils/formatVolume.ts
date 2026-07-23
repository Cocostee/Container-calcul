// Pure formatting helpers.
import { CM3_PER_M3 } from './constants'

// Convert a volume in cm³ to a human-readable m³ string.
export function formatVolume(volumeCm3: number): string {
  const cubicMeters = volumeCm3 / CM3_PER_M3
  return `${cubicMeters.toFixed(2)} m³`
}

// Convert a 0..1 rate to a rounded percentage string.
export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)} %`
}
