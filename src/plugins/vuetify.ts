import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createVuetify, type ThemeDefinition } from 'vuetify'

// Temas — literal de 05D_FRONTEND_DISENO.md §5. No modificar colores aquí:
// cualquier cambio visual va en este archivo o en styles/tokens.css (05D §10.4).
const claro: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#0090D8',
    'on-primary': '#FFFFFF',
    secondary: '#0A2947',
    accent: '#2233CE',
    background: '#F5F8FB',
    surface: '#FFFFFF',
    'surface-variant': '#FAFCFE',
    // 05C hardening (pedido explícitamente por el usuario): antes tenía el
    // mismo hex que `primary` — EN_EVALUACION y ADJUDICADA se veían
    // idénticos en cualquier vista que mezclara estados.
    info: '#7B3FA0',
    success: '#10916A',
    warning: '#C2790C',
    error: '#C43D3D',
    grey: '#757575', // OBLIGATORIO (chips BORRADOR / NO_ADJUDICADA)
    'on-surface': '#0F2438',
    'on-background': '#0F2438',
    'primary-soft': '#E6F4FC', // 05D §2.2 — fondo del ítem activo del sidebar
  },
  variables: {
    'border-color': '#E3EAF2',
    'border-opacity': 1,
    'medium-emphasis-opacity': 1, // el texto tenue se controla por color, no por opacidad
  },
}

const oscuro: ThemeDefinition = {
  dark: true,
  colors: {
    primary: '#38B0E8',
    secondary: '#1B3D5E',
    accent: '#5C6BE8',
    background: '#0B1622',
    surface: '#132436',
    'surface-variant': '#0F1D2C',
    info: '#B47FD9',
    success: '#3FBF95',
    warning: '#E8A33D',
    error: '#E96A6A',
    grey: '#93A6B8',
    'on-surface': '#E8EFF5',
    'on-background': '#E8EFF5',
    'primary-soft': '#0E3550', // 05D §2.2 — fondo del ítem activo del sidebar
  },
  variables: {
    'border-color': '#22384F',
    'border-opacity': 1,
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'claro',
    themes: { claro, oscuro },
  },
  defaults: {
    global: { ripple: true },
    VCard: { flat: true, border: true, rounded: 'lg' },
    VBtn: { rounded: 'md', variant: 'flat', height: 42 },
    VTextField: { variant: 'outlined', density: 'comfortable', rounded: 'md', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'comfortable', rounded: 'md', hideDetails: 'auto' },
    VAutocomplete: { variant: 'outlined', density: 'comfortable', rounded: 'md', hideDetails: 'auto' },
    VTextarea: { variant: 'outlined', density: 'comfortable', rounded: 'md', hideDetails: 'auto' },
    VFileInput: { variant: 'outlined', density: 'comfortable', rounded: 'md', hideDetails: 'auto' },
    VChip: { rounded: 'sm', size: 'small', label: true },
    VDataTableServer: { density: 'comfortable', hover: true },
    VDialog: { maxWidth: 720 },
    VNavigationDrawer: { border: false },
    VAlert: { variant: 'tonal', rounded: 'md', border: 'start' },
    VStepper: { flat: true },
  },
})
