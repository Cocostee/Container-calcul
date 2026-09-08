import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Tooltip from '@mui/material/Tooltip'

import { LOCALES, LOCALE_LABELS, useTranslation, type Locale } from '../../i18n'
import { useColorScheme } from '../../theme'
import { Icon } from '../ui/Icon'

/**
 * Choix de la langue et bascule clair/sombre.
 *
 * Le sélecteur n'affiche pas d'intitulé : dans une barre d'outils, un label
 * au-dessus décalerait tout le reste d'une ligne. Le globe et le nom de la
 * langue suffisent à l'œil, et `aria-label` porte le sens pour le reste.
 */
export function AppControls() {
  const { locale, setLocale, t } = useTranslation()
  const { scheme, toggle } = useColorScheme()
  const goingDark = scheme === 'light'
  const themeLabel = goingDark ? t('common.themeDark') : t('common.themeLight')

  return (
    <div className="app-controls">
      <Select
        className="app-controls__locale ui-select"
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        size="small"
        aria-label={t('common.language')}
        IconComponent={({ className }: { className?: string }) => (
          <Icon
            name="caret-down-solid"
            size="xs"
            tone="muted"
            className={className}
          />
        )}
        renderValue={(value) => (
          <span className="app-controls__locale-value">
            <Icon name="globe-outline" size="sm" tone="primary" />
            {LOCALE_LABELS[value as Locale]}
          </span>
        )}
      >
        {LOCALES.map((value) => (
          <MenuItem key={value} value={value}>
            {LOCALE_LABELS[value]}
          </MenuItem>
        ))}
      </Select>

      <Tooltip title={themeLabel}>
        <IconButton
          className="app-controls__theme"
          onClick={toggle}
          aria-label={themeLabel}
        >
          <Icon
            name={goingDark ? 'moon-outline' : 'sun-outline'}
            size="sm"
            tone="accent"
          />
        </IconButton>
      </Tooltip>
    </div>
  )
}
