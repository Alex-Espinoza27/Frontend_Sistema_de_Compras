<script setup lang="ts">
// J4 — Campanita de notificaciones (05B sección C, asignada a la Fase 11 por
// 05C). Las últimas 50, sin paginación. Clic marca leída y navega a la
// referencia si hay una ruta conocida para ese `referencia_tipo`.
//
// La notificación solo guarda {referencia_tipo:'CONVOCATORIA', referencia_id}
// (no el oferta_id del proveedor), así que para el proveedor se resuelve su
// oferta_id vía el filtro convocatoria_id de GET /ofertas y se navega directo
// al detalle (D4); si por algo no se encuentra, cae a la lista general.
import { useRouter } from 'vue-router'

import { ofertasApi } from '@/api/ofertas.api'
import dayjs from '@/plugins/dayjs'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificacionesStore } from '@/stores/notificaciones.store'
import type { NotificacionItem } from '@/modules/transversales/transversales.types'

const notificaciones = useNotificacionesStore()
const auth = useAuthStore()
const router = useRouter()

defineProps<{
  colorIcono?: string
}>()

async function rutaReferencia(item: NotificacionItem): Promise<string | null> {
  if (item.referencia_id == null) return null
  switch (item.referencia_tipo) {
    case 'CONVOCATORIA':
      if (auth.usuario?.rol === 'PROVEEDOR') {
        const data = await ofertasApi.index({ convocatoria_id: item.referencia_id })
        const ofertaId = data.items[0]?.oferta_id
        return ofertaId ? `/app/mis-postulaciones/${ofertaId}` : '/app/mis-postulaciones'
      }
      if (['ENTIDAD', 'ADMINISTRADOR', 'AUDITOR'].includes(auth.usuario?.rol ?? '')) {
        return `/app/convocatorias/${item.referencia_id}/resultados`
      }
      return `/convocatoria/${item.referencia_id}`
    default:
      return null
  }
}

async function alAbrir(abierto: boolean) {
  if (abierto) await notificaciones.cargarLista()
}

async function clicNotificacion(item: NotificacionItem) {
  if (!item.leida) await notificaciones.marcarLeida(item.notificacion_id)
  const ruta = await rutaReferencia(item)
  if (ruta) router.push(ruta)
}
</script>

<template>
  <v-menu :close-on-content-click="false" @update:model-value="alAbrir">
    <template #activator="{ props: menuProps }">
      <v-btn icon variant="text" :color="colorIcono" v-bind="menuProps">
        <v-badge v-if="notificaciones.noLeidas > 0" :content="notificaciones.noLeidas" color="error">
          <v-icon icon="mdi-bell-outline" />
        </v-badge>
        <v-icon v-else icon="mdi-bell-outline" />
      </v-btn>
    </template>

    <v-card min-width="360" max-width="420">
      <v-card-title class="d-flex justify-space-between align-center text-subtitle-1">
        Notificaciones
        <v-btn
          v-if="notificaciones.noLeidas > 0"
          variant="text"
          size="small"
          @click="notificaciones.marcarTodasLeidas()"
        >
          Marcar todas como leídas
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-list density="compact" max-height="420" style="overflow-y: auto">
        <v-progress-circular v-if="notificaciones.cargandoLista" indeterminate color="primary" class="ma-4" />
        <template v-else-if="notificaciones.items.length">
          <v-list-item
            v-for="item in notificaciones.items"
            :key="item.notificacion_id"
            :class="{ 'bg-primary-soft': item.tipo === 'ADJUDICACION' && !item.leida }"
            @click="clicNotificacion(item)"
          >
            <v-list-item-title :class="{ 'font-weight-bold': !item.leida }">{{ item.titulo }}</v-list-item-title>
            <v-list-item-subtitle>{{ item.mensaje }}</v-list-item-subtitle>
            <template #append>
              <v-icon v-if="!item.leida" icon="mdi-circle-small" color="primary" />
            </template>
            <div class="text-caption text-grey">{{ dayjs(item.creado_en).fromNow() }}</div>
          </v-list-item>
        </template>
        <div v-else class="text-center py-6 text-grey">Sin notificaciones.</div>
      </v-list>
    </v-card>
  </v-menu>
</template>
