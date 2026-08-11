import type { MenuItem } from '@/types/api'

/** Ítem de sidebar/header ya resuelto a una ruta concreta (puede haber más de
 * uno por módulo del backend, ver `itemsMenu`). */
export interface ItemMenu {
  codigo: string
  nombre: string
  icono: string
  ruta: string
}

// Placeholder de ruta por módulo (05A §16); cada fase reemplaza el destino de
// su módulo por la ruta real cuando construye esa pantalla.
const destinosFijos: Record<string, string> = {
  OFERTAS: '/app/convocatorias-abiertas',
  // PRESENTACION_OFERTAS/GESTION_PROVEEDORES/GESTION_USUARIOS/ROLES_PERMISOS
  // (05C hardening) no siguen el patrón `/app/${codigo.toLowerCase()}` porque
  // el código tiene guion bajo y la ruta usa guion medio o un nombre más corto.
  PRESENTACION_OFERTAS: '/app/presentacion-ofertas',
  GESTION_PROVEEDORES: '/app/proveedores',
  GESTION_USUARIOS: '/app/usuarios',
  ROLES_PERMISOS: '/app/roles-permisos',
}

export function rutaModulo(codigo: string): string {
  return destinosFijos[codigo] ?? `/app/${codigo.toLowerCase()}`
}

/**
 * `auth.menu` es 1 fila por módulo/grupo de permisos del backend
 * (`AuthController::construirMe()`). OFERTAS es la excepción: agrupa dos
 * pantallas del proveedor bajo el mismo permiso `ofertas.*` — "Ver
 * Convocatorias" (todas) y "Mis Postulaciones" (solo las propias, 05C
 * hardening pedido explícitamente por el usuario). Se expande aquí, en el
 * frontend, en vez de crear un módulo/permiso nuevo en el backend solo para
 * separar visualmente dos rutas que ya comparten el mismo permiso real.
 */
export function itemsMenu(menu: MenuItem[]): ItemMenu[] {
  return menu.flatMap((modulo) => {
    if (modulo.codigo === 'OFERTAS') {
      return [
        { codigo: 'OFERTAS', nombre: modulo.nombre, icono: modulo.icono, ruta: '/app/convocatorias-abiertas' },
        { codigo: 'MIS_POSTULACIONES', nombre: 'Mis Postulaciones', icono: 'mdi-file-check-outline', ruta: '/app/mis-postulaciones' },
      ]
    }
    return [{ codigo: modulo.codigo, nombre: modulo.nombre, icono: modulo.icono, ruta: rutaModulo(modulo.codigo) }]
  })
}
