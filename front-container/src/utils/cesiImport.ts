import type { PaletteInstanceInput } from '../types/palette.types'

const REQUIRED_HEADERS = [
  'CDEXENT',
  'PALXENT',
  'PALETTE_DETAIL_2',
  'PALETTE_DETAIL_3',
  'PALETTE_DETAIL_4',
]

interface SourceRecord {
  [header: string]: string
}

interface PalletProfile {
  length_cm: number
  width_cm: number
  height_cm: number
  weight_kg: number
  occurrences: number
}

export interface ImportedShipment {
  orderCode: string
  palletType: string
  palletCount: number
  pallets: PaletteInstanceInput[]
  ignoredRows: number
}

export interface CesiImportPreview {
  shipments: ImportedShipment[]
  ignoredOrders: number
  ignoredRows: number
}

function normalizeHeader(value: string): string {
  return value.trim().toUpperCase()
}

function parseNumber(value: string): number | null {
  const normalized = value
    .replace(/\u00a0/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function detectCsvDelimiter(text: string): ';' | ',' | '\t' {
  const header = text.split(/\r?\n/, 1)[0] ?? ''
  const candidates: Array<';' | ',' | '\t'> = [';', ',', '\t']
  return candidates.reduce(
    (best, candidate) =>
      header.split(candidate).length > header.split(best).length
        ? candidate
        : best,
    ';' as ';' | ',' | '\t',
  )
}

function parseCsv(text: string): string[][] {
  const delimiter = detectCsvDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]

    if (character === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (!quoted && character === delimiter) {
      row.push(cell.trim())
      cell = ''
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && next === '\n') index += 1
      row.push(cell.trim())
      if (row.some((value) => value)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  row.push(cell.trim())
  if (row.some((value) => value)) rows.push(row)
  return rows
}

async function readXlsx(file: File): Promise<string[][]> {
  // Keep the spreadsheet parser outside the initial 3D application bundle.
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const worksheet = workbook.worksheets.find((sheet) => {
    for (let column = 1; column <= sheet.columnCount; column += 1) {
      if (normalizeHeader(sheet.getRow(1).getCell(column).text) === 'CDEXENT') {
        return true
      }
    }
    return false
  })

  if (!worksheet) {
    throw new Error('Aucun onglet contenant la colonne CDEXENT n’a été trouvé.')
  }

  return Array.from({ length: worksheet.rowCount }, (_, index) => {
    const row = worksheet.getRow(index + 1)
    return Array.from({ length: worksheet.columnCount }, (_, columnIndex) =>
      row.getCell(columnIndex + 1).text.trim(),
    )
  })
}

function recordsFromRows(rows: string[][]): SourceRecord[] {
  const [rawHeaders, ...dataRows] = rows
  if (!rawHeaders) throw new Error('Le fichier ne contient pas de ligne d’en-tête.')

  const headers = rawHeaders.map(normalizeHeader)
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header))
  if (missing.length > 0) {
    throw new Error(`Colonnes manquantes : ${missing.join(', ')}.`)
  }

  return dataRows.map((row) =>
    headers.reduce<SourceRecord>((record, header, index) => {
      record[header] = row[index] ?? ''
      return record
    }, {}),
  )
}

function validDimension(value: number | null): value is number {
  return value !== null && value > 0 && value <= 300
}

function normalizeWeightKg(value: string): number {
  const parsed = parseNumber(value)
  if (parsed === null || parsed <= 0) return 0
  // Source files mix grams and already-normalised kilograms. Values above
  // 2.5 tonnes are safely interpreted as grams; lower values stay in kg.
  return parsed > 2500 ? Math.round((parsed / 1000) * 100) / 100 : parsed
}

function allocateProfiles(
  profiles: PalletProfile[],
  palletCount: number,
): PaletteInstanceInput[] {
  const totalOccurrences = profiles.reduce(
    (total, profile) => total + profile.occurrences,
    0,
  )
  const allocations = profiles.map((profile) => {
    const exact = (palletCount * profile.occurrences) / totalOccurrences
    return { profile, count: Math.floor(exact), remainder: exact % 1 }
  })
  let remaining = palletCount - allocations.reduce((total, item) => total + item.count, 0)

  allocations
    .slice()
    .sort((left, right) => right.remainder - left.remainder)
    .forEach((item) => {
      if (remaining <= 0) return
      item.count += 1
      remaining -= 1
    })

  return allocations.flatMap(({ profile, count }) =>
    count > 0
      ? [
          {
            palette_type_id: null,
            label: `Palette importée · ${profile.length_cm} × ${profile.width_cm} × ${profile.height_cm} cm`,
            length_cm: profile.length_cm,
            width_cm: profile.width_cm,
            height_cm: profile.height_cm,
            weight_kg: profile.weight_kg,
            quantity: count,
            stackable: true,
            rotatable: true,
          },
        ]
      : [],
  )
}

export async function parseCesiImport(file: File): Promise<CesiImportPreview> {
  const fileName = file.name.toLowerCase()
  const rows = fileName.endsWith('.csv')
    ? parseCsv(await file.text())
    : fileName.endsWith('.xlsx')
      ? await readXlsx(file)
      : (() => {
          throw new Error('Format non pris en charge. Importez un fichier CSV ou XLSX.')
        })()
  const records = recordsFromRows(rows)
  const grouped = new Map<
    string,
    {
      palletType: string
      palletCount: number
      profiles: Map<string, PalletProfile>
      ignoredRows: number
    }
  >()

  for (const record of records) {
    const orderCode = record.CDEXENT?.trim()
    if (!orderCode) continue
    const current = grouped.get(orderCode) ?? {
      palletType: record.TYPEPALETTE?.trim() || 'Palette importée',
      palletCount: 0,
      profiles: new Map<string, PalletProfile>(),
      ignoredRows: 0,
    }
    const count = parseNumber(record.PALXENT)
    if (count !== null) current.palletCount = Math.max(current.palletCount, Math.round(count))

    const length = parseNumber(record.PALETTE_DETAIL_2)
    const width = parseNumber(record.PALETTE_DETAIL_3)
    const height = parseNumber(record.PALETTE_DETAIL_4)
    if (!validDimension(length) || !validDimension(width) || !validDimension(height)) {
      current.ignoredRows += 1
      grouped.set(orderCode, current)
      continue
    }

    const key = `${length}x${width}x${height}`
    const profile = current.profiles.get(key) ?? {
      length_cm: length,
      width_cm: width,
      height_cm: height,
      weight_kg: normalizeWeightKg(record.PALETTE_DETAIL_6),
      occurrences: 0,
    }
    profile.occurrences += 1
    current.profiles.set(key, profile)
    grouped.set(orderCode, current)
  }

  const shipments: ImportedShipment[] = []
  let ignoredOrders = 0
  let ignoredRows = 0

  grouped.forEach((group, orderCode) => {
    const profiles = [...group.profiles.values()]
    ignoredRows += group.ignoredRows
    if (group.palletCount < 1 || profiles.length === 0) {
      ignoredOrders += 1
      return
    }
    shipments.push({
      orderCode,
      palletType: group.palletType,
      palletCount: group.palletCount,
      pallets: allocateProfiles(profiles, group.palletCount),
      ignoredRows: group.ignoredRows,
    })
  })

  if (shipments.length === 0) {
    throw new Error('Aucune palette fiable n’a été trouvée dans le fichier.')
  }

  return { shipments, ignoredOrders, ignoredRows }
}
