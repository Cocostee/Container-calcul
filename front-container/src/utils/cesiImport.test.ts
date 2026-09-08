import { describe, expect, it } from 'vitest'

import { parseCesiImport } from './cesiImport'

/**
 * Le fichier client est la seule entrée que l'application ne maîtrise pas :
 * colonnes en ordre libre, cotes parfois absurdes, poids tantôt en grammes
 * tantôt en kilos. Ces tests figent ce qu'on accepte et ce qu'on écarte —
 * une ligne douteuse doit être ignorée en le disant, jamais devinée.
 */

const HEADERS = [
  'CDEXENT',
  'TYPEPALETTE',
  'PALXENT',
  'PALETTE_DETAIL_2',
  'PALETTE_DETAIL_3',
  'PALETTE_DETAIL_4',
  'PALETTE_DETAIL_6',
]

/** Un fichier CSV, à partir de lignes de valeurs. */
function csv(rows: (string | number)[][]): File {
  const body = [HEADERS, ...rows]
    .map((row) => row.join(';'))
    .join('\n')
  return new File([body], 'commandes.csv', { type: 'text/csv' })
}

/** Une ligne de commande ordinaire. */
function row(
  order: string,
  pallets: number,
  length = 120,
  width = 80,
  height = 93,
  weight = 300,
) {
  return [order, 'EUR', pallets, length, width, height, weight]
}

describe('parseCesiImport', () => {
  it('regroupe les lignes par code de commande', async () => {
    const preview = await parseCesiImport(
      csv([row('A1', 2), row('A1', 2), row('B2', 1)]),
    )

    expect(preview.shipments.map((s) => s.orderCode).sort()).toEqual([
      'A1',
      'B2',
    ])
  })

  it('respecte le nombre de palettes annoncé par la commande', async () => {
    const preview = await parseCesiImport(csv([row('A1', 5)]))

    const total = preview.shipments[0].pallets.reduce(
      (sum, line) => sum + line.quantity,
      0,
    )
    expect(total).toBe(5)
  })

  it('répartit les palettes entre les gabarits rencontrés', async () => {
    // Deux gabarits, quatre palettes : deux chacun.
    const preview = await parseCesiImport(
      csv([
        row('A1', 4, 120, 80, 93),
        row('A1', 4, 100, 100, 110),
      ]),
    )

    const lines = preview.shipments[0].pallets
    expect(lines).toHaveLength(2)
    expect(lines.map((line) => line.quantity).sort()).toEqual([2, 2])
  })

  it('reporte les cotes du fichier sur chaque ligne', async () => {
    const preview = await parseCesiImport(csv([row('A1', 1, 115, 75, 88)]))

    expect(preview.shipments[0].pallets[0]).toMatchObject({
      length_cm: 115,
      width_cm: 75,
      height_cm: 88,
    })
  })

  it('ne met plus les cotes dans le libellé', async () => {
    // Elles ont leur colonne dans le tableau : les répéter le rendait
    // illisible.
    const preview = await parseCesiImport(csv([row('A1', 1)]))

    expect(preview.shipments[0].pallets[0].label).not.toMatch(/120/)
  })

  describe('les cotes hors bornes', () => {
    it('écarte une ligne dont une cote est nulle, en la comptant', async () => {
      const preview = await parseCesiImport(
        csv([row('A1', 2), row('A1', 2, 0, 80, 93)]),
      )

      expect(preview.ignoredRows).toBe(1)
      expect(preview.shipments[0].pallets).toHaveLength(1)
    })

    it('écarte une cote au-delà de 300 cm', async () => {
      const preview = await parseCesiImport(
        csv([row('A1', 2), row('A1', 2, 400, 80, 93)]),
      )

      expect(preview.ignoredRows).toBe(1)
    })

    it('écarte la commande entière si aucune ligne ne tient', async () => {
      const preview = await parseCesiImport(
        csv([row('A1', 1), row('B2', 1, 0, 0, 0)]),
      )

      expect(preview.ignoredOrders).toBe(1)
      expect(preview.shipments.map((s) => s.orderCode)).toEqual(['A1'])
    })
  })

  describe('le poids', () => {
    it('garde un poids déjà exprimé en kilos', async () => {
      const preview = await parseCesiImport(
        csv([row('A1', 1, 120, 80, 93, 850)]),
      )

      expect(preview.shipments[0].pallets[0].weight_kg).toBe(850)
    })

    it('ramène en kilos un poids donné en grammes', async () => {
      // Les fichiers mélangent les deux : au-delà de 2,5 t, c'est des grammes.
      const preview = await parseCesiImport(
        csv([row('A1', 1, 120, 80, 93, 897600)]),
      )

      expect(preview.shipments[0].pallets[0].weight_kg).toBe(897.6)
    })

    it('rend zéro pour un poids absent ou négatif', async () => {
      const preview = await parseCesiImport(
        csv([row('A1', 1, 120, 80, 93, -5)]),
      )

      expect(preview.shipments[0].pallets[0].weight_kg).toBe(0)
    })
  })

  describe('les refus', () => {
    it('refuse un fichier sans colonne obligatoire', async () => {
      const body = 'CDEXENT;PALXENT\nA1;2'
      const file = new File([body], 'incomplet.csv', { type: 'text/csv' })

      await expect(parseCesiImport(file)).rejects.toThrow(/Colonnes manquantes/)
    })

    it('refuse un fichier dont aucune palette n’est fiable', async () => {
      await expect(
        parseCesiImport(csv([row('A1', 0, 0, 0, 0)])),
      ).rejects.toThrow(/Aucune palette fiable/)
    })

    it('refuse une extension inconnue', async () => {
      const file = new File(['peu importe'], 'notes.txt', {
        type: 'text/plain',
      })

      await expect(parseCesiImport(file)).rejects.toThrow(/CSV ou XLSX/)
    })
  })

  it('accepte la virgule comme séparateur décimal', async () => {
    const body = [
      HEADERS.join(';'),
      ['A1', 'EUR', '1', '116,5', '116,5', '93', '300'].join(';'),
    ].join('\n')
    const file = new File([body], 'virgules.csv', { type: 'text/csv' })

    const preview = await parseCesiImport(file)

    expect(preview.shipments[0].pallets[0].length_cm).toBe(116.5)
  })

  it('accepte la virgule comme séparateur de colonnes', async () => {
    const body = [
      HEADERS.join(','),
      ['A1', 'EUR', '1', '120', '80', '93', '300'].join(','),
    ].join('\n')
    const file = new File([body], 'virgules.csv', { type: 'text/csv' })

    const preview = await parseCesiImport(file)

    expect(preview.shipments[0].palletCount).toBe(1)
  })
})
