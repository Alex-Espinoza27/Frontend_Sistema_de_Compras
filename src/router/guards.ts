import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

type Resultado = RouteLocationRaw | void

/** Ruta protegida (meta.requiereSesion) sin sesión → /login guardando el destino. */
export function requiereSesion(to: RouteLocationNormalized): Resultado {
  const auth = useAuthStore()
  if (!auth.autenticado) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
}

/**
 * Ruta con meta.permiso que el usuario no tiene → página 403. También valida
 * meta.rol cuando la pantalla es exclusiva de un rol de negocio (p. ej.
 * Postular es solo de PROVEEDOR): el permiso solo no basta porque
 * ADMINISTRADOR reúne todos los permisos del sistema (incluido `ofertas.*`)
 * sin ser proveedor — sin esta validación, ADMINISTRADOR podía entrar a la
 * pantalla y recién ahí el backend la rechazaba con 403 (`role:PROVEEDOR`).
 *
 * `meta.permiso` acepta varios permisos separados por `|` (igual que el
 * middleware `permission:a|b` del backend) — basta con tener UNO para
 * entrar; útil para módulos con más de una pestaña donde cada una exige un
 * permiso distinto (ej. "Configuración": `administracion.catalogos` o
 * `administracion.configuracion`, 05C hardening).
 */
export function requierePermiso(to: RouteLocationNormalized): Resultado {
  const permiso = to.meta.permiso as string | undefined
  const rol = to.meta.rol as string | undefined
  const auth = useAuthStore()

  if (rol && auth.usuario?.rol !== rol) {
    return { path: '/app/403' }
  }
  if (permiso && !permiso.split('|').some((p) => auth.puede(p))) {
    return { path: '/app/403' }
  }
}

/** Ruta solo-invitado (meta.soloInvitado, ej. /login) con sesión activa → su home. */
export function soloInvitado(): Resultado {
  const auth = useAuthStore()
  if (auth.autenticado) {
    return { path: '/app' }
  }
}
