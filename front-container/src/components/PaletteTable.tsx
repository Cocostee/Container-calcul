import type {
  PaletteDraft,
  PaletteInstanceInput,
} from '../types/palette.types'
import { Button } from './ui/Button/Button'
import { Checkbox } from './ui/Checkbox/Checkbox'
import { Input } from './ui/Input/Input'
import { NumberInput } from './ui/NumberInput/NumberInput'
import { Table } from './ui/Table/Table'

interface PaletteTableProps {
  palettes: PaletteDraft[]
  onUpdate: (clientId: string, patch: Partial<PaletteInstanceInput>) => void
  onDuplicate: (clientId: string) => void
  onRemove: (clientId: string) => void
}

const HEADERS = [
  'Label',
  'Long.',
  'Larg.',
  'Haut.',
  'Poids',
  'Qté',
  'Empil.',
  'Rot.',
  'Actions',
]

export function PaletteTable({
  palettes,
  onUpdate,
  onDuplicate,
  onRemove,
}: PaletteTableProps) {
  if (palettes.length === 0) {
    return <p className="muted">Aucune palette ajoutée pour l'instant.</p>
  }

  return (
    <div className="palette-table">
      <Table headers={HEADERS}>
        {palettes.map((palette) => (
          <tr key={palette.clientId}>
            <td>
              <Input
                label="Label"
                value={palette.label}
                onChange={(v) => onUpdate(palette.clientId, { label: v })}
              />
            </td>
            <td>
              <NumberInput
                label="Longueur"
                value={palette.length_cm}
                onChange={(v) => onUpdate(palette.clientId, { length_cm: v })}
              />
            </td>
            <td>
              <NumberInput
                label="Largeur"
                value={palette.width_cm}
                onChange={(v) => onUpdate(palette.clientId, { width_cm: v })}
              />
            </td>
            <td>
              <NumberInput
                label="Hauteur"
                value={palette.height_cm}
                onChange={(v) => onUpdate(palette.clientId, { height_cm: v })}
              />
            </td>
            <td>
              <NumberInput
                label="Poids"
                value={palette.weight_kg}
                onChange={(v) => onUpdate(palette.clientId, { weight_kg: v })}
              />
            </td>
            <td>
              <NumberInput
                label="Quantité"
                value={palette.quantity}
                onChange={(v) => onUpdate(palette.clientId, { quantity: v })}
              />
            </td>
            <td>
              <Checkbox
                label=""
                checked={palette.stackable}
                onChange={(v) => onUpdate(palette.clientId, { stackable: v })}
              />
            </td>
            <td>
              <Checkbox
                label=""
                checked={palette.rotatable}
                onChange={(v) => onUpdate(palette.clientId, { rotatable: v })}
              />
            </td>
            <td>
              <div className="row-actions">
                <Button
                  variant="ghost"
                  onClick={() => onDuplicate(palette.clientId)}
                >
                  Dupliquer
                </Button>
                <Button
                  variant="danger"
                  onClick={() => onRemove(palette.clientId)}
                >
                  Suppr.
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
