<script setup lang="ts">
// M06 del TDR — Presentación de Ofertas (05C hardening). Detalle de solo
// lectura de una oferta recibida (ítems, condiciones, archivos y resultado
// de evaluación si ya se registró) — página propia en vez de modal (pedido
// explícitamente por el usuario, mismo patrón que `DetallePostulacionView.vue`
// del proveedor), para tener más espacio con archivos/tablas largas y poder
// compartir el link directo. No permite evaluar — eso sigue siendo exclusivo
// del módulo Evaluación.
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import { presentacionOfertasApi } from '@/api/presentacionOfertas.api'
import BaseVolver from '@/components/base/BaseVolver.vue'
import { useDescarga } from '@/composables/useDescarga'
import type { OfertaEvaluacionDetalle } from '@/modules/entidad/entidad.types'

const route = useRoute()
const ofertaId = Number(route.params.id)

const cargando = ref(true)
const detalle = ref<OfertaEvaluacionDetalle | null>(null)
const { descargar } = useDescarga()

presentacionOfertasApi
  .show(ofertaId)
  .then((data) => (detalle.value = data))
  .finally(() => (cargando.value = false))

function etiquetaResultado(valor: string | null) {
  if (valor === 'APROBADO') return 'Aprobado'
  if (valor === 'DESAPROBADO') return 'Desaprobado'
  return 'Pendiente'
}
</script>

<template>
  <v-container class="py-8" max-width="900">
    <BaseVolver to="/app/presentacion-ofertas" texto="Volver a Presentación de Ofertas" />

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <template v-else-if="detalle">
      <div class="text-h5 text-titulo mb-1">{{ detalle.proveedor.razon_social }}</div>
      <div class="text-body-2 text-grey mb-6">{{ detalle.proveedor.numero_documento }}</div>

      <v-card class="pa-4 mb-4">
        <div class="text-subtitle-1 text-titulo mb-3">Ítems ofertados</div>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Ítem</th>
              <th>Descripción</th>
              <th>Presentación</th>
              <th>Marca/Modelo</th>
              <th>P. Unitario</th>
              <th>P. Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in detalle.items" :key="item.numero">
              <td>{{ item.numero }}</td>
              <td>{{ item.descripcion }}</td>
              <td>{{ item.presentacion ?? '—' }}</td>
              <td>{{ item.marca_modelo }}</td>
              <td>{{ item.precio_unitario }}</td>
              <td>{{ item.precio_total }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-card class="pa-4 mb-4">
        <div class="text-subtitle-1 text-titulo mb-3">Condiciones ofertadas</div>
        <v-row dense>
          <v-col cols="6" sm="3">
            <div class="text-body-2 text-grey">Validez de la oferta</div>
            <div>{{ detalle.validez_dias }} días</div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="text-body-2 text-grey">Garantía</div>
            <div>{{ detalle.plazo_garantia }}</div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="text-body-2 text-grey">Plazo de ejecución</div>
            <div>{{ detalle.plazo_ejecucion.segun_tdr ? 'Según TDR' : `${detalle.plazo_ejecucion.dias} días` }}</div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="text-body-2 text-grey">Forma de pago</div>
            <div>{{ detalle.forma_pago.segun_tdr ? 'Según TDR' : `${detalle.forma_pago.dias} días` }}</div>
          </v-col>
        </v-row>
      </v-card>

      <v-card class="pa-4 mb-4">
        <div class="text-subtitle-1 text-titulo mb-3">Archivos</div>
        <v-list density="compact">
          <v-list-item
            v-for="archivo in detalle.archivos"
            :key="archivo.archivo_id"
            :title="archivo.nombre"
            prepend-icon="mdi-file-document-outline"
            rounded="md"
            @click="descargar(archivo.descarga_url, archivo.nombre)"
          >
            <template #append>
              <v-icon icon="mdi-download" size="18" />
            </template>
          </v-list-item>
        </v-list>
        <div v-if="!detalle.archivos.length" class="text-body-2 text-grey">Sin archivos adjuntos.</div>
      </v-card>

      <v-card class="pa-4">
        <div class="text-subtitle-1 text-titulo mb-3">Resultado de evaluación</div>
        <v-row dense>
          <v-col cols="12" sm="6">
            <div class="text-body-2 text-grey">Evaluación técnica</div>
            <div>{{ etiquetaResultado(detalle.eval_tecnica) }}</div>
            <div v-if="detalle.eval_tecnica_motivo" class="text-caption text-grey">{{ detalle.eval_tecnica_motivo }}</div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-body-2 text-grey">Evaluación logística</div>
            <div>{{ etiquetaResultado(detalle.eval_logistica) }}</div>
            <div v-if="detalle.eval_logistica_motivo" class="text-caption text-grey">{{ detalle.eval_logistica_motivo }}</div>
          </v-col>
        </v-row>
      </v-card>
    </template>
  </v-container>
</template>
