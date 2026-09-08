import type { Messages } from './fr'
import type { TranslateParams } from './I18nContext'

/** Descend dans le dictionnaire par un chemin pointé : `editor.step1.title`. */
function lookup(messages: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[key]
          : undefined,
      messages,
    )
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/**
 * Les quatre langues gérées distinguent seulement le singulier du pluriel,
 * ce qui rend une règle unique suffisante : 0 et 1 au singulier en anglais,
 * espagnol et allemand ; 0 au singulier également en français.
 */
function plural(count: number): 'one' | 'other' {
  return Math.abs(count) <= 1 ? 'one' : 'other'
}

export function translate(
  messages: Messages,
  fallback: Messages,
  key: string,
  params?: TranslateParams,
): string {
  const count = typeof params?.count === 'number' ? params.count : undefined

  const candidates =
    count === undefined ? [key] : [`${key}_${plural(count)}`, key]

  for (const candidate of candidates) {
    const found = lookup(messages, candidate) ?? lookup(fallback, candidate)
    if (typeof found === 'string') return interpolate(found, params)
  }

  // Une clé absente doit se voir en développement plutôt que disparaître.
  return key
}
