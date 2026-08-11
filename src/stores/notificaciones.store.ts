import { defineStore } from 'pinia'

import { notificacionesApi } from '@/api/notificaciones.api'
import type { NotificacionItem } from '@/modules/transversales/transversales.types'

const INTERVALO_POLLING_MS = 60_000

export const useNotificacionesStore = defineStore('notificaciones', {
  state: () => ({
    noLeidas: 0,
    items: [] as NotificacionItem[],
    cargandoLista: false,
    intervaloId: null as ReturnType<typeof setInterval> | null,
  }),
  actions: {
    async cargarContador() {
      const data = await notificacionesApi.contador()
      this.noLeidas = data.no_leidas
    },
    async cargarLista() {
      this.cargandoLista = true
      try {
        const data = await notificacionesApi.index()
        this.items = data.items
      } finally {
        this.cargandoLista = false
      }
    },
    async marcarLeida(id: number) {
      const data = await notificacionesApi.leer(id)
      this.noLeidas = data.no_leidas
      const item = this.items.find((i) => i.notificacion_id === id)
      if (item) item.leida = true
    },
    async marcarTodasLeidas() {
      await notificacionesApi.leerTodas()
      this.noLeidas = 0
      this.items.forEach((i) => (i.leida = true))
    },
    /** Se llama una vez al montar el shell autenticado (05C: "junto con notificaciones.store"). */
    iniciarPolling() {
      if (this.intervaloId) return
      this.cargarContador()
      this.intervaloId = setInterval(() => this.cargarContador(), INTERVALO_POLLING_MS)
    },
    detenerPolling() {
      if (this.intervaloId) clearInterval(this.intervaloId)
      this.intervaloId = null
    },
  },
})
