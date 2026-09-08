import type {
  PaletteFormErrors,
  PaletteFormValues,
} from '../../hooks/usePaletteForm'
import { useTranslation } from '../../i18n'
import { Button } from '../ui/Button/Button'
import { Checkbox } from '../ui/Checkbox/Checkbox'
import { Input } from '../ui/Input/Input'
import { NumberInput } from '../ui/NumberInput/NumberInput'

interface PaletteFormProps {
  values: PaletteFormValues
  errors: PaletteFormErrors
  /** Ligne du tableau en cours de modification, ou `null` pour un ajout. */
  editingId: string | null
  setField: <K extends keyof PaletteFormValues>(
    name: K,
    value: PaletteFormValues[K],
  ) => void
  submit: () => void
  cancelEdit: () => void
  onDelete: (clientId: string) => void
}

/**
 * Le même formulaire sert à ajouter un colis et à modifier celui choisi dans
 * le tableau : ce sont les mêmes champs, et deux formulaires auraient dérivé
 * l'un de l'autre. Le mode se lit à son titre et à son bouton.
 *
 * La clé du `<form>` change avec le mode : le formulaire est remonté, ce qui
 * déclenche la mise au foyer du premier champ. Sans elle, on cliquerait
 * « Modifier » dans le tableau sans rien voir bouger dans le rail.
 */
export function PaletteForm({
  values,
  errors,
  editingId,
  setField,
  submit,
  cancelEdit,
  onDelete,
}: PaletteFormProps) {
  const { t } = useTranslation()
  const isEditing = editingId !== null

  return (
    <section className="sidebar-section" aria-labelledby="package-form-title">
      <div>
        <p className="sidebar-section__eyebrow">
          {isEditing ? t('packages.editEyebrow') : t('packages.formEyebrow')}
        </p>
        <h2 id="package-form-title">
          {isEditing ? t('packages.editTitle') : t('packages.formTitle')}
        </h2>
        {isEditing ? (
          <p className="muted">{t('packages.editHint')}</p>
        ) : null}
      </div>
      <form
        key={editingId ?? 'new'}
        className="palette-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Input
          label={t('packages.reference')}
          value={values.label}
          autoFocus={isEditing}
          onChange={(v) => setField('label', v)}
        />
        {errors.label ? (
          <p className="field-error" role="alert">
            {errors.label}
          </p>
        ) : null}
        <div className="field-grid">
          <NumberInput
            label={t('packages.length')}
            unit="cm"
            value={values.length_cm}
            onChange={(v) => setField('length_cm', v)}
          />
          <NumberInput
            label={t('packages.width')}
            unit="cm"
            value={values.width_cm}
            onChange={(v) => setField('width_cm', v)}
          />
          <NumberInput
            label={t('packages.height')}
            unit="cm"
            value={values.height_cm}
            onChange={(v) => setField('height_cm', v)}
          />
          <NumberInput
            label={t('packages.weight')}
            unit="kg"
            value={values.weight_kg}
            onChange={(v) => setField('weight_kg', v)}
          />
          <NumberInput
            label={t('packages.quantity')}
            value={values.quantity}
            onChange={(v) => setField('quantity', v)}
          />
        </div>
        <div className="checkbox-row">
          <Checkbox
            label={t('packages.stackable')}
            checked={values.stackable}
            onChange={(v) => setField('stackable', v)}
          />
          <Checkbox
            label={t('packages.rotatable')}
            checked={values.rotatable}
            onChange={(v) => setField('rotatable', v)}
          />
        </div>
        <div className="palette-form__actions">
          <Button variant={isEditing ? 'primary' : 'secondary'} type="submit">
            {isEditing ? t('packages.saveEdit') : t('packages.submit')}
          </Button>
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={cancelEdit}>
                {t('common.cancel')}
              </Button>
              {/* La suppression vit ici, où l'on a le colis sous les yeux :
                  dans une ligne de tableau, elle est trop près du geste
                  d'à côté. */}
              <Button
                variant="ghost"
                className="palette-form__delete"
                icon="trash-outline"
                onClick={() => onDelete(editingId)}
              >
                {t('common.delete')}
              </Button>
            </>
          ) : null}
        </div>
      </form>
    </section>
  )
}
