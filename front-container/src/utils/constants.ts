// Shared constants (no magic numbers scattered across the app).

export const CUSTOM_CONTAINER_VALUE = 'custom'
export const CUSTOM_PALETTE_VALUE = 'custom'

export const CM3_PER_M3 = 1_000_000

// Default dimensions used when "custom" container is selected.
export const DEFAULT_CONTAINER_CUSTOM_DIMS = {
  length_cm: 600,
  width_cm: 235,
  height_cm: 239,
  max_weight_kg: 26000,
}

// Default values pre-filling the "add package" form.
export const DEFAULT_PACKAGE_FORM = {
  length_cm: 60,
  width_cm: 40,
  height_cm: 40,
  weight_kg: 20,
  quantity: 1,
  stackable: true,
  rotatable: true,
}

// Distinct, colour-blind-friendly palette used to colour pallets in 3D.
export const PALETTE_COLORS = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#db2777',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
  '#65a30d',
]
