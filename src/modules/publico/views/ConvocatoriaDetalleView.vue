<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import { publicoApi } from '@/api/publico.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useDescarga } from '@/composables/useDescarga'
import dayjs from '@/plugins/dayjs'
import type { ConvocatoriaPublicaDetalle } from '@/modules/publico/publico.types'

const route = useRoute()
const auth = useAuthStore()
const { cargando: descargando, abrirEnNuevaPestana } = useDescarga()
const { cargando: descargandoTdr, descargar } = useDescarga()

const detalle = ref<ConvocatoriaPublicaDetalle | null>(null)
const cargando = ref(true)
const noEncontrada = ref(false)

async function cargar() {
  cargando.value = true
  try {
    detalle.value = await publicoApi.convocatoria(Number(route.params.id))
  } catch {
    noEncontrada.value = true
  } finally {
    cargando.value = false
  }
}
cargar()

function verResultados() {
  if (detalle.value) abrirEnNuevaPestana(publicoApi.resultadosPdfUrl(detalle.value.convocatoria_id))
}
function descargarTdr() {
  if (detalle.value?.archivos.tdr) {
    descargar(publicoApi.tdrUrl(detalle.value.convocatoria_id), detalle.value.archivos.tdr.nombre)
  }
}

const etiquetaTdr = computed(() =>
  detalle.value?.tipo === 'SERVICIO' ? 'Descargar Especificaciones Técnicas' : 'Descargar Términos de Referencia',
)

// Motivo/resultado visibles sin acción adicional (05C hardening, pedido
// explícitamente por el usuario). DESIERTA ahora también descarga el
// documento (`accion === 'RESULTADOS'`), pero igual debe mostrar el motivo.
const fraseResultado = computed(() => {
  const d = detalle.value
  if (!d) return null
  if (d.resultado_resumen) return d.resultado_resumen
  if (d.motivo_cierre) {
    return `La convocatoria fue declarada ${d.estado.nombre.toUpperCase()} por el motivo siguiente: ${d.motivo_cierre}`
  }
  return null
})

const etiquetaDocumento = computed(() => (detalle.value?.estado.codigo === 'DESIERTA' ? 'Ver documento' : 'Ver resultados'))
</script>

<template>
  <v-container class="py-8">
    <div v-if="cargando" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="noEncontrada" class="text-center py-12 text-grey">
      Esta convocatoria no existe o todavía no está publicada.
    </div>

    <template v-else-if="detalle">
      <div class="d-flex flex-wrap justify-space-between align-start ga-4 mb-6">
        <div>
          <div class="text-caption text-grey">{{ detalle.entidad.razon_social }} ({{ detalle.entidad.sigla }})</div>
          <div class="text-datos text-grey">{{ detalle.numero ?? '—' }}</div>
          <div class="text-h5 text-titulo">{{ detalle.nombre_servicio }}</div>
          <div v-if="detalle.fecha_publicacion" class="text-body-2 text-grey mt-1">
            Fecha de publicación: {{ dayjs(detalle.fecha_publicacion).tz().format('DD/MM/YYYY') }}
          </div>
          <div class="text-body-2 text-grey">
            Postular hasta el {{ dayjs(detalle.fecha_fin).tz().format('DD/MM/YYYY') }} a las
            {{ dayjs(detalle.fecha_fin).tz().format('HH:mm') }} horas
          </div>
        </div>

        <div class="d-flex flex-column align-end ga-2">
          <BaseChipEstado :estado="detalle.estado" size="large" />

          <template v-if="detalle.accion === 'POSTULAR'">
            <v-btn v-if="auth.usuario?.rol === 'PROVEEDOR'" :to="`/app/postular/${detalle.convocatoria_id}`">
              Postular
            </v-btn>
            <v-btn v-else-if="!auth.autenticado" to="/login" variant="tonal">Inicia sesión para postular</v-btn>
            <div v-else class="text-caption text-grey" style="max-width: 180px">
              Solo los proveedores registrados pueden postular.
            </div>
          </template>

          <v-btn
            v-else-if="detalle.accion === 'YA_POSTULADO'"
            variant="tonal"
            color="success"
            prepend-icon="mdi-check-circle-outline"
            to="/app/mis-postulaciones"
          >
            Ya postulaste
          </v-btn>

          <v-btn v-else-if="detalle.accion === 'RESULTADOS'" variant="tonal" :loading="descargando" @click="verResultados">
            {{ etiquetaDocumento }}
          </v-btn>
        </div>
      </div>

      <v-alert v-if="fraseResultado" :type="detalle.estado.codigo === 'ADJUDICADA' ? 'info' : 'warning'" variant="tonal" class="mb-6">
        {{ fraseResultado }}
      </v-alert>

      <v-card class="mb-6">
        <v-card-title class="text-titulo">Ítems requeridos</v-card-title>
        <v-table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Descripción</th>
              <th>Unidad</th>
              <th>Cantidad</th>
              <th>Presentación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in detalle.items" :key="item.numero">
              <td>{{ item.numero }}</td>
              <td>{{ item.descripcion }}</td>
              <td>{{ item.unidad_medida.nombre }}</td>
              <td class="text-datos">{{ item.cantidad }}</td>
              <td>{{ item.presentacion ?? '—' }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-card v-if="detalle.archivos.tdr || detalle.archivos.plantilla_dj">
        <v-card-title class="text-titulo">Archivos</v-card-title>
        <v-card-text>
          <v-btn
            v-if="detalle.archivos.tdr"
            variant="text"
            density="compact"
            class="pl-0 d-flex mb-1"
            prepend-icon="mdi-file-download-outline"
            :loading="descargandoTdr"
            @click="descargarTdr"
          >
            {{ etiquetaTdr }}
          </v-btn>
          <div v-if="detalle.archivos.plantilla_dj" class="text-body-2">
            <v-icon icon="mdi-file-document-outline" size="16" class="mr-1" />
            Plantilla DJ: {{ detalle.archivos.plantilla_dj.nombre }}
          </div>
        </v-card-text>
      </v-card>
    </template>
  </v-container>
</template>
