import { useTheme } from 'vuetify'

// Usada tanto por AppBar.vue (header) como por AppSidebar.vue (sidebar) —
// ambos son "secondary" (navy) en modo claro, así que comparten la misma
// variable para quedar siempre del mismo color.
const VAR_SUPERFICIE_OSCURA = '--color-marca-oscura'

/** Texto legible (blanco o casi-negro) sobre `hex`, por luminancia relativa
 * — Vuetify no recalcula `on-primary` si ya hay uno explícito en el tema
 * (como `claro` en `vuetify.ts`), así que se calcula a mano para que el
 * color configurable nunca deje texto/iconos ilegibles sobre los botones. */
function colorTextoLegible(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminancia > 0.6 ? '#0F2438' : '#FFFFFF'
}

const PATRON_HEX = /^#[0-9A-Fa-f]{6}$/

/**
 * Color de marca configurable (05C hardening, pedido explícitamente por el
 * usuario): un solo hex en `Configuración` (`COLOR_PRIMARIO`) que actualiza
 * en caliente, sin recompilar, el `primary` de ambos temas de Vuetify
 * (botones/chips en toda la plataforma, pública y autenticada) y el
 * encabezado + sidebar (`AppBar.vue`/`AppSidebar.vue` leen
 * `--color-marca-oscura`). Sin valor configurado (vacío/null) no se toca
 * nada: se mantiene el azul estático definido en `vuetify.ts`.
 */
export function useColorMarca() {
  const theme = useTheme()

  function aplicar(hex: string | null) {
    if (!hex || !PATRON_HEX.test(hex)) {
      document.documentElement.style.removeProperty(VAR_SUPERFICIE_OSCURA)
      return
    }

    for (const nombre of ['claro', 'oscuro'] as const) {
      const colores = theme.themes.value[nombre].colors
      colores.primary = hex
      colores['on-primary'] = colorTextoLegible(hex)
    }
    document.documentElement.style.setProperty(VAR_SUPERFICIE_OSCURA, hex)
  }

  return { aplicar }
}
