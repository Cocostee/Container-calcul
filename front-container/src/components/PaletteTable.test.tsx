import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../i18n'
import type { PackageDraft } from '../types/palette.types'
import { PaletteTable } from './PaletteTable'

/**
 * La liste des colis a demandé plusieurs passes avant de dire juste. Ces
 * tests figent ce qu'elle doit montrer : les contraintes dans les deux sens,
 * un total qui somme l'expédition, et des chiffres dans la langue du lecteur.
 */

function colis(patch: Partial<PackageDraft> = {}): PackageDraft {
  return {
    clientId: 'c1',
    label: 'A2000123',
    palette_type_id: null,
    length_cm: 120,
    width_cm: 80,
    height_cm: 93,
    weight_kg: 897.6,
    quantity: 2,
    stackable: true,
    rotatable: true,
    ...patch,
  }
}

/*
 * La langue est fixée : le fournisseur suit sinon celle du navigateur, et
 * jsdom annonce l'anglais. Un test ne doit pas dépendre de cet environnement.
 */
beforeEach(() => {
  localStorage.setItem('container-calcul.locale', 'fr')
})

function afficher(packages: PackageDraft[], editingId: string | null = null) {
  return render(
    <I18nProvider>
      <PaletteTable
        packages={packages}
        editingId={editingId}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
      />
    </I18nProvider>,
  )
}

describe('PaletteTable', () => {
  it('reste un tableau pour les technologies d’assistance', () => {
    // La structure est une grille CSS — une ligne doit être une seule boîte —
    // mais elle doit se lire comme un tableau.
    afficher([colis()])

    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(3) // en-tête, ligne, total
    expect(screen.getAllByRole('columnheader')).toHaveLength(6)
  })

  it('invite à ajouter quand le lot est vide', () => {
    afficher([])

    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText(/Aucun colis/)).toBeTruthy()
  })

  it('nomme le colis par son libellé', () => {
    afficher([colis({ label: 'A2000123' })])

    expect(screen.getByText('A2000123')).toBeTruthy()
  })

  describe('les contraintes', () => {
    it('dit qu’un colis est empilable et rotatif', () => {
      afficher([colis({ stackable: true, rotatable: true })])

      expect(screen.getByText('Empilable')).toBeTruthy()
      expect(screen.getByText('Rotatif')).toBeTruthy()
    })

    it('dit l’interdiction quand elle existe', () => {
      afficher([colis({ stackable: false, rotatable: false })])

      expect(screen.getByText('Non empilable')).toBeTruthy()
      expect(screen.getByText('Sens imposé')).toBeTruthy()
    })
  })

  describe('le total', () => {
    it('somme les quantités du lot', () => {
      afficher([
        colis({ clientId: 'a', quantity: 2 }),
        colis({ clientId: 'b', quantity: 3 }),
      ])

      const total = screen.getAllByRole('row').at(-1)!
      expect(total.textContent).toContain('5')
    })

    it('somme le poids de l’expédition, quantités comprises', () => {
      // 2 × 100 + 1 × 50 = 250 : c'est le poids embarqué, pas la somme des
      // poids unitaires.
      afficher([
        colis({ clientId: 'a', quantity: 2, weight_kg: 100 }),
        colis({ clientId: 'b', quantity: 1, weight_kg: 50 }),
      ])

      const total = screen.getAllByRole('row').at(-1)!
      expect(total.textContent).toContain('250')
    })
  })

  it('écrit les nombres à la française', () => {
    // 897.6 doit se lire « 897,6 » : le point décimal est un tic anglophone.
    afficher([colis({ weight_kg: 897.6 })])

    expect(screen.getByText(/897,6/)).toBeTruthy()
  })

  it('offre modifier et dupliquer sur chaque ligne', () => {
    afficher([colis({ label: 'A1' })])

    expect(screen.getByLabelText('Modifier le colis A1')).toBeTruthy()
    expect(screen.getByLabelText('Dupliquer le colis A1')).toBeTruthy()
  })

  it('n’offre pas la suppression dans la ligne', () => {
    // Elle vit dans le formulaire du rail : dans une ligne, elle est trop
    // près du geste d'à côté.
    afficher([colis({ label: 'A1' })])

    expect(screen.queryByLabelText(/Supprimer le colis/)).toBeNull()
  })

  it('marque la ligne en cours de modification', () => {
    const { container } = afficher([colis({ clientId: 'c1' })], 'c1')

    expect(container.querySelector('.package-row--editing')).toBeTruthy()
  })

  it('ne marque rien quand aucune ligne n’est en modification', () => {
    const { container } = afficher([colis({ clientId: 'c1' })], null)

    expect(container.querySelector('.package-row--editing')).toBeNull()
  })
})
