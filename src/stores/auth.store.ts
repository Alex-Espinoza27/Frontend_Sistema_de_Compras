import { defineStore } from 'pinia'

import { authApi } from '@/api/auth.api'
import { borrarToken, guardarToken, obtenerToken } from '@/api/token'
import type { LoginInput, Perfil, SesionConToken, SesionMe, Usuario } from '@/modules/auth/auth.types'
import type { MenuItem } from '@/types/api'

interface EstadoAuth {
  usuario: Usuario | null
  permisos: string[]
  menu: MenuItem[]
  perfil: Perfil | null
  sesionCargada: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): EstadoAuth => ({
    usuario: null,
    permisos: [],
    menu: [],
    perfil: null,
    sesionCargada: false,
  }),
  getters: {
    autenticado: (estado) => estado.usuario !== null,
    puede: (estado) => (permiso: string) => estado.permisos.includes(permiso),
  },
  actions: {
    /** `data` puede traer `token` (login/registro) o no (me) — si viene, se
     * guarda antes de aplicar el resto, porque las siguientes peticiones
     * (incluido el propio `/auth/me` del bootstrap) lo necesitan. */
    aplicarSesion(data: SesionMe | SesionConToken) {
      if ('token' in data) guardarToken(data.token)
      this.usuario = data.usuario
      this.permisos = data.permisos
      this.menu = data.menu
      this.perfil = data.perfil
    },
    limpiarSesion() {
      borrarToken()
      this.usuario = null
      this.permisos = []
      this.menu = []
      this.perfil = null
    },
    /** Bootstrap de la app (main.ts). Sin token guardado no hay sesión que
     * cargar — evita un 401 anónimo de arranque en cada visita pública. Un
     * 401 real (token vencido/revocado) tampoco es un error, es una sesión
     * anónima válida. */
    async cargarSesion(): Promise<void> {
      if (!obtenerToken()) {
        this.sesionCargada = true
        return
      }
      try {
        const data = await authApi.me()
        this.aplicarSesion(data)
      } catch {
        this.limpiarSesion()
      } finally {
        this.sesionCargada = true
      }
    },
    async login(input: LoginInput): Promise<void> {
      const data = await authApi.login(input)
      this.aplicarSesion(data)
    },
    /** Cerrar sesión es "best effort": si el servidor falla igual se limpia
     * el estado y el token local, porque la intención del usuario siempre es
     * salir. */
    async logout(): Promise<void> {
      try {
        await authApi.logout()
      } finally {
        this.limpiarSesion()
      }
    },
  },
})
