import { describe, expect, it } from 'vitest'

import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import { translate } from './translate'

/**
 * Le dictionnaire français fait référence : le type `Messages` garantit que
 * les trois autres portent les mêmes clés. Ce qu'il ne garantit pas, et que
 * ces tests couvrent : les paires singulier/pluriel cohérentes, l'absence de
 * clé en trop, et les marqueurs `{nom}` présents partout où le français en a.
 */

const LOCALES = { fr, en, es, de }

/** Tous les chemins pointés d'un dictionnaire. */
function paths(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix]
  return Object.entries(node).flatMap(([key, value]) =>
    paths(value, prefix ? `${prefix}.${key}` : key),
  )
}

function read(node: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (current, key) =>
        current && typeof current === 'object'
          ? (current as Record<string, unknown>)[key]
          : undefined,
      node,
    )
}

/** Les marqueurs d'interpolation d'un gabarit, triés. */
function markers(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
}

describe('translate', () => {
  it('rend le texte de la clé demandée', () => {
    expect(translate(fr, fr, 'common.save')).toBe('Enregistrer')
  })

  it('remplace les marqueurs par les valeurs fournies', () => {
    const rendu = translate(fr, fr, 'placement.metaPosition', {
      position: 2,
      total: 4,
    })

    expect(rendu).toBe('Conteneur 2 sur 4')
  })

  it('laisse un marqueur sans valeur en place plutôt que de le vider', () => {
    const rendu = translate(fr, fr, 'placement.metaPosition', { position: 2 })

    expect(rendu).toContain('{total}')
  })

  it('choisit le singulier pour 0 et 1', () => {
    expect(translate(fr, fr, 'plan.containerCount', { count: 0 })).toBe(
      '0 conteneur',
    )
    expect(translate(fr, fr, 'plan.containerCount', { count: 1 })).toBe(
      '1 conteneur',
    )
  })

  it('choisit le pluriel au-delà de 1', () => {
    expect(translate(fr, fr, 'plan.containerCount', { count: 3 })).toBe(
      '3 conteneurs',
    )
  })

  it('retombe sur le français quand la langue ne connaît pas la clé', () => {
    const incomplet = { ...en, common: {} } as unknown as typeof fr

    expect(translate(incomplet, fr, 'common.save')).toBe('Enregistrer')
  })

  it('rend la clé elle-même quand elle n’existe nulle part', () => {
    // Une clé absente doit se voir en développement, pas disparaître.
    expect(translate(fr, fr, 'section.inexistante')).toBe(
      'section.inexistante',
    )
  })
})

describe('les quatre dictionnaires', () => {
  const reference = paths(fr).sort()

  it.each(Object.keys(LOCALES))('%s porte exactement les mêmes clés', (lang) => {
    const actual = paths(LOCALES[lang as keyof typeof LOCALES]).sort()

    expect(actual).toEqual(reference)
  })

  it.each(Object.keys(LOCALES))(
    '%s emploie les mêmes marqueurs que le français',
    (lang) => {
      const dictionary = LOCALES[lang as keyof typeof LOCALES]

      for (const path of reference) {
        const attendu = read(fr, path)
        const obtenu = read(dictionary, path)
        if (typeof attendu !== 'string' || typeof obtenu !== 'string') continue
        expect(markers(obtenu), `clé ${path}`).toEqual(markers(attendu))
      }
    },
  )

  it('déclare les deux formes de chaque clé au pluriel', () => {
    const suffixed = reference.filter((path) => /_(one|other)$/.test(path))

    for (const path of suffixed) {
      const jumeau = path.endsWith('_one')
        ? path.replace(/_one$/, '_other')
        : path.replace(/_other$/, '_one')
      expect(reference, `clé ${path}`).toContain(jumeau)
    }
  })

  it('ne laisse aucun texte vide', () => {
    for (const path of reference) {
      const value = read(fr, path)
      expect(typeof value === 'string' && value.length > 0, `clé ${path}`).toBe(
        true,
      )
    }
  })
})
