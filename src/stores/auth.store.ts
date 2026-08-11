import { defineStore } from 'pinia'

import { authApi } from '@/api/auth.api'
import { asegurarCsrf } from '@/api/cliente'
import type { LoginInput, Perfil, SesionMe, Usuario } from '@/modules/auth/auth.types'
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
    aplicarSesion(data: SesionMe) {
      this.usuario = data.usuario
      this.permisos = data.permisos
      this.menu = data.menu
      this.perfil = data.perfil
    },
    limpiarSesion() {
      this.usuario = null
      this.permisos = []
      this.menu = []
      this.perfil = null
    },
    /** Bootstrap de la app (main.ts). Un 401 es una sesión anónima válida, no un error. */
    async cargarSesion(): Promise<void> {
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
      await asegurarCsrf()
      const data = await authApi.login(input)
      this.aplicarSesion(data)
    },
    /** Cerrar sesión es "best effort": si el servidor falla (ej. 419 por
     * sesión ya vencida tras un rato de inactividad) igual se limpia el
     * estado local, porque la intención del usuario siempre es salir. */
    async logout(): Promise<void> {
      try {
        await authApi.logout()
      } finally {
        this.limpiarSesion()
      }
    },
  },
})
