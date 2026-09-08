// Les constantes partagées : aucun nombre magique dispersé dans le code.

export const CUSTOM_CONTAINER_VALUE = 'custom'
export const CUSTOM_PALETTE_VALUE = 'custom'

export const CM3_PER_M3 = 1_000_000

// Les cotes proposées quand on choisit un conteneur personnalisé.
export const DEFAULT_CONTAINER_CUSTOM_DIMS = {
  length_cm: 600,
  width_cm: 235,
  height_cm: 239,
  max_weight_kg: 26000,
}

// Les valeurs qui pré-remplissent le formulaire d'ajout de colis.
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
// Réglées pour se lire sur le hublot sombre : écartées en teinte et en clarté.
export const PALETTE_COLORS = [
  '#61a8f2',
  '#4ecf9b',
  '#f08a5d',
  '#e879c0',
  '#a78bfa',
  '#79d5e3',
  '#f2685c',
  '#b8d94f',
]
