/**
 * Thème MUI de l'application.
 *
 * MUI fournit le comportement et l'accessibilité des composants ; l'apparence
 * est entièrement redéfinie ici, à partir des tokens et de la palette dérivée.
 * Deux partis pris pour tenir l'identité :
 *
 *  - le ripple est désactivé : il appartient au langage Material, pas au nôtre.
 *    Les réponses au clic passent par nos propres transitions ;
 *  - les surfaces déclarent leur fond, leur trait et leur arrondi en une
 *    fois (voir surface.ts), pour que tous les contrôles partagent la même
 *    silhouette sans la redéclarer.
 */

import { alpha, createTheme, type Theme } from '@mui/material/styles'

import type { Palette } from './palette'
import { surface } from './surface'
import { brand, breakpoints, layout, motion, radius, space, text } from './tokens'

const px = (value: number) => `${value}px`

/** Rayons mis à l'échelle par brand.radiusScale, en pixels CSS. */
export const radii = {
  mark: px(Math.round(radius.mark * brand.radiusScale)),
  chip: px(Math.round(radius.chip * brand.radiusScale)),
  control: px(Math.round(radius.control * brand.radiusScale)),
  panel: px(Math.round(radius.panel * brand.radiusScale)),
  shell: px(Math.round(radius.shell * brand.radiusScale)),
} as const

/** Ombres portées, teintées du bleu du thème plutôt que noires. */
export function buildShadows(p: Palette) {
  const c = (opacity: number) => `rgba(${p.shadowRgb}, ${opacity})`
  return {
    sm: `0 1px 2px ${c(0.06)}, 0 2px 8px ${c(0.05)}`,
    md: `0 2px 6px ${c(0.07)}, 0 12px 28px ${c(0.08)}`,
    lg: `0 3px 10px ${c(0.08)}, 0 26px 56px ${c(0.12)}`,
  }
}

export type AppShadows = ReturnType<typeof buildShadows>

export function createAppTheme(p: Palette): Theme {
  const shadows = buildShadows(p)
  const ease = motion.easeOut
  const focusRing = `0 0 0 3px ${alpha(p.primary, 0.28)}`

  return createTheme({
    breakpoints: {
      values: {
        xs: breakpoints.xs,
        sm: breakpoints.sm,
        md: breakpoints.md,
        lg: breakpoints.lg,
        xl: breakpoints.xl,
      },
    },

    palette: {
      mode: p.mode,
      primary: { main: p.primary, dark: p.primaryHover, contrastText: p.onPrimary },
      secondary: { main: p.accent, dark: p.accentHover, contrastText: p.onAccent },
      error: { main: p.danger, contrastText: '#ffffff' },
      success: { main: p.success, contrastText: '#ffffff' },
      warning: { main: p.warning, contrastText: '#ffffff' },
      background: { default: p.bg, paper: p.surface },
      text: { primary: p.text, secondary: p.textMuted, disabled: p.textFaint },
      divider: p.border,
    },

    typography: {
      fontFamily: brand.fontText,
      fontSize: 15,
      htmlFontSize: 16,
      h1: {
        fontFamily: brand.fontDisplay,
        fontStretch: `${brand.displayWidth}%`,
        fontWeight: brand.displayWeight,
        fontSize: text.xl,
        lineHeight: 1.08,
        letterSpacing: '-0.012em',
      },
      h2: {
        fontFamily: brand.fontDisplay,
        fontStretch: `${brand.displayWidth}%`,
        fontWeight: brand.displayWeight,
        fontSize: text.md,
        lineHeight: 1.28,
      },
      h3: {
        fontFamily: brand.fontDisplay,
        fontStretch: `${brand.displayWidth}%`,
        fontWeight: 650,
        fontSize: text.base,
        lineHeight: 1.28,
      },
      body1: { fontSize: text.base, lineHeight: 1.58 },
      body2: { fontSize: text.sm, lineHeight: 1.5 },
      button: { fontSize: text.sm, fontWeight: 650, textTransform: 'none' },
      caption: { fontSize: text.xs, lineHeight: 1.4 },
    },

    shape: { borderRadius: Math.round(radius.control * brand.radiusScale) },

    transitions: {
      duration: {
        shortest: motion.instant,
        shorter: motion.fast,
        short: motion.base,
        standard: motion.base,
        complex: motion.slow,
        enteringScreen: motion.base,
        leavingScreen: motion.fast,
      },
      easing: { easeOut: ease, easeIn: ease, easeInOut: ease, sharp: ease },
    },

    components: {
      /* ---------------------------------------------------------- Boutons - */
      MuiButtonBase: {
        defaultProps: { disableRipple: true },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: layout.tap,
            padding: `10px ${px(space[4] + 2)}`,
            gap: px(space[2]),
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            transition: `background-color ${motion.fast}ms ${ease}, border-color ${motion.fast}ms ${ease}, color ${motion.fast}ms ${ease}, box-shadow ${motion.fast}ms ${ease}, transform ${motion.instant}ms ${ease}`,
            '&:active:not(:disabled)': { transform: 'translateY(1px)' },
            '&.Mui-disabled': { opacity: 0.45 },
            '&:focus-visible': { boxShadow: focusRing },
          },
        },
        /* MUI v9 n'expose plus de slots combinés (containedPrimary…) :
           les apparences se déclarent en variantes. */
        variants: [
          {
            /* Action principale : aplat de couleur. */
            props: { variant: 'contained', color: 'primary' },
            style: {
              ...surface({
                radius: radii.control,
                background: p.primary,
                shadow: shadows.sm,
              }),
              color: p.onPrimary,
              fontWeight: 700,
              '&:hover': {
                backgroundColor: p.primaryHover,
                boxShadow: shadows.md,
                transform: 'translateY(-1px)',
              },
              '&:active:not(:disabled)': { boxShadow: 'none' },
            },
          },
          {
            props: { variant: 'contained', color: 'error' },
            style: {
              ...surface({
                radius: radii.control,
                background: p.danger,
                shadow: shadows.sm,
              }),
              color: '#ffffff',
              fontWeight: 700,
              '&:hover': { backgroundColor: p.dangerHover },
            },
          },
          {
            /* Action secondaire : verre bordé. */
            props: { variant: 'outlined' },
            style: {
              ...surface({
                radius: radii.control,
                background: p.glass,
                borderColor: p.borderControl,
              }),
              color: p.text,
              '&:hover': {
                color: p.primaryText,
                backgroundColor: p.primarySoft,
                borderColor: p.primaryLine,
              },
            },
          },
          {
            /* Action tertiaire : rien, jusqu'au survol. */
            props: { variant: 'text' },
            style: {
              color: p.textMuted,
              '&:hover': { color: p.text, backgroundColor: p.glassFaint },
            },
          },
        ],
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            color: p.textMuted,
            borderRadius: radii.chip,
            transition: `background-color ${motion.fast}ms ${ease}, color ${motion.fast}ms ${ease}`,
            '&:hover': { color: p.text, backgroundColor: p.glassFaint },
            '&:focus-visible': { boxShadow: focusRing },
          },
        },
      },

      /* ----------------------------------------------------------- Champs - */
      MuiFormLabel: {
        styleOverrides: {
          root: {
            color: p.textMuted,
            fontSize: text.xs,
            fontWeight: 600,
            '&.Mui-focused': { color: p.primaryText },
            '&.Mui-error': { color: p.dangerText },
          },
        },
      },

      MuiInputLabel: {
        // `shrink` évite que MUI n'anime un label qui ne bouge plus.
        defaultProps: { shrink: true },
        styleOverrides: {
          root: {
            position: 'static',
            maxWidth: '100%',
            marginBottom: 6,
            transform: 'none',
            fontSize: text.xs,
            lineHeight: 1.3,
            pointerEvents: 'auto',
            '&.MuiInputLabel-shrink': { transform: 'none' },
          },
        },
      },

      MuiInputBase: {
        styleOverrides: {
          input: {
            fontVariantNumeric: 'tabular-nums',
            '&::placeholder': { color: p.textFaint, opacity: 1 },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            ...surface({
              radius: radii.control,
              background: p.surfaceSunken,
              borderColor: p.borderControl,
            }),
            minHeight: layout.tap,
            fontSize: text.base,
            transition: `border-color ${motion.fast}ms ${ease}, box-shadow ${motion.fast}ms ${ease}`,
            '&:hover': { borderColor: p.borderControlHover },
            '&.Mui-focused': { borderColor: p.primary, boxShadow: focusRing },
            '&.Mui-error': { borderColor: p.danger },
            '&.Mui-disabled': { opacity: 0.6 },
          },
          input: { padding: `10px ${px(space[3])}` },
          /* La bordure vient de la surface ci-dessus, pas du fieldset de
             MUI. Sa légende réservait la place de l'encoche du label
             flottant, qui n'existe plus. */
          notchedOutline: { border: 0, top: 0, '& legend': { display: 'none' } },
        },
      },

      MuiSelect: {
        styleOverrides: {
          icon: { color: p.textMuted, right: px(space[2]) },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: px(space[1]),
            backgroundColor: p.surface,
            border: `1px solid ${p.border}`,
            borderRadius: radii.chip,
            boxShadow: shadows.md,
            backgroundImage: 'none',
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: text.sm,
            minHeight: 38,
            '&:hover': { backgroundColor: p.glassFaint },
            '&.Mui-selected': {
              color: p.primaryText,
              backgroundColor: p.primarySoft,
              fontWeight: 650,
              '&:hover': { backgroundColor: p.primarySoft },
            },
          },
        },
      },

      MuiCheckbox: {
        styleOverrides: {
          root: {
            padding: px(space[1]),
            color: p.borderControl,
            '&.Mui-checked': { color: p.primary },
            '&:hover': { backgroundColor: p.primarySoft },
            '&:focus-visible': { boxShadow: focusRing },
          },
        },
      },

      MuiFormControlLabel: {
        styleOverrides: {
          root: { marginLeft: 0, marginRight: 0, gap: px(space[1]) },
          label: { fontSize: text.sm, color: p.text },
        },
      },

      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginLeft: 0,
            fontSize: text.xs,
            '&.Mui-error': { color: p.dangerText, fontWeight: 600 },
          },
        },
      },

      /* -------------------------------------------------------- Pastilles - */
      MuiChip: {
        styleOverrides: {
          root: {
            height: 'auto',
            padding: `4px ${px(space[3])}`,
            fontSize: text.xs,
            fontWeight: 650,
            border: `1px solid ${p.border}`,
            borderRadius: 999,
            backgroundColor: p.glassFaint,
            color: p.textMuted,
          },
          label: { padding: 0 },
          icon: { marginLeft: 0, marginRight: px(space[1]), fontSize: '1rem' },
        },
      },

      /* ---------------------------------------------------------- Attente - */
      MuiCircularProgress: {
        styleOverrides: {
          root: { color: p.primary },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 9,
            borderRadius: 999,
            backgroundColor: p.surfaceSunken,
            border: `1px solid ${p.border}`,
          },
          bar: { borderRadius: 999, backgroundColor: p.accent },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            padding: `6px ${px(space[3])}`,
            fontSize: text.xs,
            fontWeight: 600,
            color: p.mode === 'light' ? '#ffffff' : p.text,
            backgroundColor: p.mode === 'light' ? '#14313f' : p.surfaceMuted,
            border: p.mode === 'light' ? 'none' : `1px solid ${p.border}`,
            borderRadius: radii.chip,
            boxShadow: shadows.md,
          },
          arrow: { color: p.mode === 'light' ? '#14313f' : p.surfaceMuted },
        },
      },

      /* ------------------------------------------------- Piste des étapes - */
      MuiStepper: {
        styleOverrides: {
          root: { padding: 0 },
        },
      },

      MuiStepConnector: {
        styleOverrides: {
          root: {
            // Aligné sur le centre de la pastille (44 px) et dégagé de part
            // et d'autre pour ne pas la toucher.
            top: 22,
            left: 'calc(-50% + 36px)',
            right: 'calc(50% + 36px)',
          },
          line: {
            borderTopWidth: 2,
            borderColor: p.border,
            transition: `border-color ${motion.slow}ms ${ease}`,
          },
          active: { '& .MuiStepConnector-line': { borderColor: p.accent } },
          completed: { '& .MuiStepConnector-line': { borderColor: p.accent } },
        },
      },

      MuiStepLabel: {
        styleOverrides: {
          root: { gap: px(space[2]) },
          label: {
            marginTop: px(space[3]),
            color: p.textMuted,
            fontSize: text.sm,
            '&.Mui-active': { color: p.text, fontWeight: 700 },
            '&.Mui-completed': { color: p.text, fontWeight: 650 },
          },
          labelContainer: { minWidth: 0 },
          iconContainer: { paddingRight: 0 },
        },
      },
    },
  })
}
