import { useAuthStore } from '@/stores/auth.store'
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
  PRESENTACION_OFERTAS: '/app/presentacion-ofertas',
  GESTION_PROVEEDORES: '/app/proveedores',
  GESTION_USUARIOS: '/app/usuarios',
  ROLES_PERMISOS: '/app/roles-permisos',
  CATALOGOS: '/app/catalogos',
  CONFIGURACION: '/app/configuracion',
  ADMINISTRACION: '/app/configuracion',
}

export function rutaModulo(codigo: string): string {
  return destinosFijos[codigo] ?? `/app/${codigo.toLowerCase()}`
}

export function itemsMenu(menu: MenuItem[]): ItemMenu[] {
  const auth = useAuthStore()
  return menu.flatMap((modulo) => {
    if (modulo.codigo === 'OFERTAS') {
      return [
        { codigo: 'OFERTAS', nombre: modulo.nombre, icono: modulo.icono, ruta: '/app/convocatorias-abiertas' },
        { codigo: 'MIS_POSTULACIONES', nombre: 'Mis Postulaciones', icono: 'mdi-file-check-outline', ruta: '/app/mis-postulaciones' },
      ]
    }
    if (modulo.codigo === 'ADMINISTRACION') {
      const items: ItemMenu[] = []
      if (auth.puede('administracion.catalogos')) {
        items.push({
          codigo: 'CATALOGOS',
          nombre: 'Catálogos',
          icono: 'mdi-format-list-bulleted-type',
          ruta: '/app/catalogos',
        })
      }
      if (auth.puede('administracion.configuracion')) {
        items.push({
          codigo: 'CONFIGURACION',
          nombre: 'Configuración',
          icono: 'mdi-cog',
          ruta: '/app/configuracion',
        })
      }
      return items.length ? items : [{ codigo: 'ADMINISTRACION', nombre: 'Configuración', icono: 'mdi-cog', ruta: '/app/configuracion' }]
    }
    return [{ codigo: modulo.codigo, nombre: modulo.nombre, icono: modulo.icono, ruta: rutaModulo(modulo.codigo) }]
  })
}
