import { defineStore } from 'pinia'

export type Tema = 'claro' | 'oscuro'
export type ColorSnackbar = 'success' | 'error' | 'warning' | 'info'
export type DisenoNav = 'sidebar' | 'header'

interface EstadoSnackbar {
  visible: boolean
  texto: string
  color: ColorSnackbar
}

const CLAVE_TEMA = 'compras-la-perla:tema'
const CLAVE_DISENO_NAV = 'compras-la-perla:diseno-nav'

/** Preferencia de tema: localStorage (es UI, no sesión); si nunca se eligió
 * ninguna, el modo claro es el default (05C hardening, pedido explícitamente
 * por el usuario) — antes se usaba `prefers-color-scheme` del sistema, que
 * arrancaba en oscuro para cualquiera con ese ajuste en el SO/navegador. */
function temaInicial(): Tema {
  const guardado = localStorage.getItem(CLAVE_TEMA)
  return guardado === 'oscuro' ? 'oscuro' : 'claro'
}

/** Diseño de navegación (05C hardening: botón para comparar barra lateral vs
 * encabezado). Preferencia de UI, no de sesión — igual que el tema. */
function disenoNavInicial(): DisenoNav {
  const guardado = localStorage.getItem(CLAVE_DISENO_NAV)
  return guardado === 'header' ? 'header' : 'sidebar'
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    tema: temaInicial() as Tema,
    disenoNav: disenoNavInicial() as DisenoNav,
    drawerAbierto: true,
    snackbar: { visible: false, texto: '', color: 'info' } as EstadoSnackbar,
  }),
  actions: {
    alternarTema() {
      this.tema = this.tema === 'claro' ? 'oscuro' : 'claro'
      localStorage.setItem(CLAVE_TEMA, this.tema)
    },
    alternarDisenoNav() {
      this.disenoNav = this.disenoNav === 'sidebar' ? 'header' : 'sidebar'
      localStorage.setItem(CLAVE_DISENO_NAV, this.disenoNav)
    },
    alternarDrawer() {
      this.drawerAbierto = !this.drawerAbierto
    },
    mostrarSnackbar(texto: string, color: ColorSnackbar = 'info') {
      this.snackbar = { visible: true, texto, color }
    },
    cerrarSnackbar() {
      this.snackbar.visible = false
    },
  },
})
