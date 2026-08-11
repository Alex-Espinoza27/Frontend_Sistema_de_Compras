/** Envelope estándar de toda respuesta de la API (03 §1). */
export interface Envelope<T> {
  ok: boolean
  data: T
  mensaje: string | null
  errores?: Record<string, string[]>
}

/** Forma de `data` en cualquier listado paginado (03 §1). */
export interface Paginado<T> {
  items: T[]
  paginacion: {
    pagina: number
    por_pagina: number
    total: number
    ultima_pagina: number
  }
}

/** Colores semánticos válidos para chips de estado (05D §2.3). Deben existir en el tema de Vuetify. */
export type ColorEstado = 'info' | 'success' | 'warning' | 'error' | 'grey' | 'primary'

/** Estado de un contexto (CONVOCATORIA, OFERTA, ENTIDAD, PROVEEDOR...) (03 §15). */
export interface Estado {
  codigo: string
  nombre: string
  color: ColorEstado
  orden?: number
}

/** Ítem del menú lateral, devuelto por `/auth/me` (03 §16). */
export interface MenuItem {
  codigo: string
  nombre: string
  icono: string
  orden: number
}

/** Query params comunes a todo listado `GET /{modulo}` (03 §1). */
export interface ListadoParams {
  pagina?: number
  por_pagina?: number
  ordenar_por?: string
  direccion?: 'asc' | 'desc'
  buscar?: string
  [filtro: string]: unknown
}
