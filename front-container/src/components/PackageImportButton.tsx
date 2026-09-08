import { useRef, useState } from 'react'

import { useTranslation } from '../i18n'
import type { PackageLineInput } from '../types/palette.types'
import { parseCesiImport } from '../utils/cesiImport'
import { Button } from './ui/Button/Button'
import { Icon } from './ui/Icon'

interface PackageImportButtonProps {
  onImported: (lines: PackageLineInput[]) => void
  disabled?: boolean
}

/**
 * Verse un fichier de commande dans le lot en cours.
 *
 * L'assistant d'import crée un projet ; ici, le projet existe déjà et on lui
 * ajoute une commande de plus. C'est le même lecteur de fichier, mais le
 * résultat rejoint la liste au lieu de la remplacer — un lot se constitue
 * souvent en plusieurs fois.
 */
export function PackageImportButton({
  onImported,
  disabled = false,
}: PackageImportButtonProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<{ count: number; file: string } | null>(
    null,
  )

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setAdded(null)
    setIsParsing(true)
    try {
      const parsed = await parseCesiImport(file)
      const lines = parsed.shipments.flatMap((shipment) =>
        shipment.pallets.map((pallet) => ({
          ...pallet,
          // Le code de commande nomme la charge, comme dans l'assistant.
          label: shipment.orderCode,
        })),
      )
      const count = lines.reduce((total, line) => total + line.quantity, 0)
      onImported(lines)
      setAdded({ count, file: file.name })
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setIsParsing(false)
      // Le même fichier doit pouvoir être rechargé : sans cette remise à
      // zéro, le champ ne signalerait pas un second choix identique.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <section className="sidebar-section package-import" aria-labelledby="package-import-title">
      <div>
        <p className="sidebar-section__eyebrow">
          {t('packages.importEyebrow')}
        </p>
        <h2 id="package-import-title">{t('packages.importTitle')}</h2>
        <p className="muted">{t('packages.importHint')}</p>
      </div>
      <input
        ref={inputRef}
        className="package-import__input"
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label={t('packages.importFile')}
        disabled={disabled || isParsing}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <Button
        variant="secondary"
        icon="file-upload-outline"
        disabled={disabled || isParsing}
        onClick={() => inputRef.current?.click()}
      >
        {isParsing ? t('import.readingFile') : t('import.chooseFile')}
      </Button>
      <span className="package-import__hint">{t('import.fileFormats')}</span>

      {added ? (
        <p className="package-import__done" role="status">
          <Icon name="check-solid" size="sm" tone="primary" />
          {t('packages.importAdded', { count: added.count, file: added.file })}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
