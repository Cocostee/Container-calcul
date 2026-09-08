/**
 * Registre des icônes.
 *
 * Les SVG sont lus à la compilation par Vite (`?raw`) : pas de requête réseau,
 * pas de sprite à maintenir, et un simple ajout de fichier dans
 * `src/assets/icons` suffit à rendre une icône disponible.
 *
 * Le pack vient du design system CanopUI (QVL-Studio) ; `container` et
 * `pallet` ont été dessinés pour cette application.
 */

const modules = import.meta.glob('../../../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function iconName(path: string): string {
  return path.split('/').pop()!.replace(/\.svg$/, '')
}

/**
 * On retire les dimensions fixes du SVG pour que la taille vienne du CSS,
 * et on neutralise l'attribut de couleur au profit de `currentColor`.
 */
function normalise(markup: string): string {
  return markup
    .replace(/<svg[^>]*>/, (tag) =>
      tag
        .replace(/\s(width|height)="[^"]*"/g, '')
        .replace(/<svg/, '<svg width="100%" height="100%" focusable="false"'),
    )
    .replace(/fill="(?!none|currentColor)[^"]*"/g, 'fill="currentColor"')
}

export const icons: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, markup]) => [
    iconName(path),
    normalise(markup),
  ]),
)

export const iconNames = Object.keys(icons).sort()
