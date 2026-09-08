import type { ReactNode } from 'react'

import { Icon, type IconName } from './ui/Icon'

interface PanelHeadingProps {
  icon: IconName
  eyebrow: string
  title: string
  titleId?: string
  /** Chiffre ou pastille alignée à droite du titre. */
  meta?: ReactNode
}

/**
 * En-tête d'un panneau : son signe, son marquage, son titre, et son compte.
 * Regroupé ici pour que tous les panneaux s'annoncent de la même façon.
 */
export function PanelHeading({
  icon,
  eyebrow,
  title,
  titleId,
  meta,
}: PanelHeadingProps) {
  return (
    <div className="panel-heading">
      <Icon name={icon} size="md" tone="accent" className="panel-heading__glyph" />
      <div className="panel-heading__text">
        <p className="panel-heading__eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
      </div>
      {meta !== undefined ? (
        <span className="panel-heading__meta">{meta}</span>
      ) : null}
    </div>
  )
}
