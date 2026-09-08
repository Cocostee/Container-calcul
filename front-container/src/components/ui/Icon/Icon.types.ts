export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * Icônes disponibles. La liste est explicite pour que TypeScript signale une
 * faute de frappe : ajouter un SVG dans `src/assets/icons` puis son nom ici.
 */
export type IconName =
  | 'arrow-down-outline'
  | 'arrow-left-outline'
  | 'arrow-right-outline'
  | 'arrow-up-outline'
  | 'box-outline'
  | 'box-solid'
  | 'cancel-outline'
  | 'cancel-solid'
  | 'caret-down-solid'
  | 'caret-left-solid'
  | 'caret-right-solid'
  | 'caret-up-solid'
  | 'chart-pie-outline'
  | 'chart-pie-solid'
  | 'check-outline'
  | 'check-solid'
  | 'clock-outline'
  | 'close'
  | 'columns-outline'
  | 'container-outline'
  | 'copy-outline'
  | 'copy-solid'
  | 'download-outline'
  | 'download-solid'
  | 'edit-outline'
  | 'edit-solid'
  | 'expand-outline'
  | 'expand-solid'
  | 'eye-outline'
  | 'eye-solid'
  | 'file-download-outline'
  | 'file-solid'
  | 'file-text'
  | 'file-upload-outline'
  | 'filter-outline'
  | 'filter-solid'
  | 'folder-open-outline'
  | 'folder-outline'
  | 'folder-solid'
  | 'globe-outline'
  | 'globe-solid'
  | 'home-outline'
  | 'home-solid'
  | 'info-circle-outline'
  | 'info-circle-solid'
  | 'info-triangle-outline'
  | 'info-triangle-solid'
  | 'layers-outline'
  | 'menu-outline'
  | 'moon-outline'
  | 'move-outline'
  | 'move-solid'
  | 'pallet-outline'
  | 'plus-circle'
  | 'plus-outline'
  | 'plus-solid'
  | 'refresh-outline'
  | 'refresh-solid'
  | 'rows-outline'
  | 'ruler-outline'
  | 'save-outline'
  | 'save-solid'
  | 'settings-outline'
  | 'settings-solid'
  | 'sort-outline'
  | 'stack-outline'
  | 'stack-solid'
  | 'sun-outline'
  | 'trash-outline'
  | 'trash-solid'
  | 'upload-outline'
  | 'upload-solid'
  | 'weight-outline'
  | 'zoom-in-outline'
  | 'zoom-in-solid'
  | 'zoom-out-outline'
  | 'zoom-out-solid'

/**
 * Teinte de l'icône. `inherit` suit la couleur du texte — c'est ce qu'il faut
 * dans un bouton, dont l'icône doit rester solidaire du libellé. Ailleurs, une
 * icône décorative prend une couleur du thème : l'encre du texte est presque
 * noire et jure avec le reste.
 */
export type IconTone = 'inherit' | 'primary' | 'accent' | 'muted' | 'faint'

export interface IconProps {
  name: IconName
  size?: IconSize
  tone?: IconTone
  /** Intitulé accessible. Sans lui, l'icône est décorative et masquée. */
  label?: string
  className?: string
}
