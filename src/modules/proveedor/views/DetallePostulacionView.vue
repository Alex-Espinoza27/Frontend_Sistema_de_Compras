<script setup lang="ts">
// D4 — Detalle de postulación (05B). `resultado_evaluacion` solo llega si la
// convocatoria ya se resolvió (ADJUDICADA/DESIERTA/CANCELADA).
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import { ofertasApi } from '@/api/ofertas.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseVolver from '@/components/base/BaseVolver.vue'
import { useDescarga } from '@/composables/useDescarga'
import type { OfertaDetalle } from '@/modules/proveedor/proveedor.types'

const route = useRoute()
const ofertaId = Number(route.params.id)

const oferta = ref<OfertaDetalle | null>(null)
const cargando = ref(true)
ofertasApi
  .show(ofertaId)
  .then((data) => (oferta.value = data))
  .finally(() => (cargando.value = false))

const { descargar } = useDescarga()
function descargarArchivo(url: string, nombre: string) {
  descargar(url, nombre)
}
</script>

<template>
  <v-container class="py-8" max-width="900">
    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <template v-else-if="oferta">
      <BaseVolver to="/app/mis-postulaciones" texto="Volver a mis postulaciones" />
      <div class="d-flex flex-wrap justify-space-between align-start ga-4 mb-6">
        <div>
          <div class="text-h5 text-titulo mb-1">{{ oferta.convocatoria.nombre_servicio }}</div>
          <div class="text-body-2 text-grey">{{ oferta.convocatoria.numero ?? '—' }}</div>
        </div>
        <BaseChipEstado :estado="oferta.estado" />
      </div>

      <v-card class="pa-4 mb-4">
        <div class="text-subtitle-1 text-titulo mb-3">Ítems</div>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Ítem</th>
              <th>Descripción</th>
              <th>Unidad</th>
              <th>Marca/Modelo</th>
              <th>P. Unitario S/</th>
              <th>P. Total S/</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in oferta.items" :key="item.numero">
              <td>{{ item.numero }}</td>
              <td>{{ item.descripcion }}</td>
              <td>{{ item.unidad_medida.nombre }}</td>
              <td>{{ item.marca_modelo }}</td>
              <td>{{ item.precio_unitario }}</td>
              <td>{{ item.precio_total }}</td>
            </tr>
          </tbody>
        </v-table>
        <div class="d-flex justify-end text-h6 text-datos mt-4">TOTAL GENERAL: S/ {{ oferta.total_general }}</div>
      </v-card>

      <v-card class="pa-4 mb-4">
        <div class="text-subtitle-1 text-titulo mb-3">Condiciones</div>
        <v-row dense>
          <v-col cols="12" sm="6">Comprobante: {{ oferta.tipo_comprobante.nombre }}</v-col>
          <v-col cols="12" sm="6">Validez: {{ oferta.validez_dias }} días</v-col>
          <v-col cols="12" sm="6">
            Ejecución: {{ oferta.plazo_ejecucion_segun_tdr ? 'Según TDR' : `${oferta.plazo_ejecucion_dias} días` }}
          </v-col>
          <v-col cols="12" sm="6">
            Forma de pago: {{ oferta.forma_pago_segun_tdr ? 'Según TDR' : `${oferta.forma_pago_dias} días` }}
          </v-col>
          <v-col cols="12" sm="6">Garantía: {{ oferta.plazo_garantia }}</v-col>
          <v-col cols="12" sm="6">Fecha de envío: {{ oferta.fecha_envio }}</v-col>
          <v-col cols="12">
            Contacto: {{ oferta.contacto_nombre }} · {{ oferta.contacto_telefono }} · {{ oferta.contacto_correo }}
          </v-col>
        </v-row>
      </v-card>

      <v-card class="pa-4 mb-4">
        <div class="text-subtitle-1 text-titulo mb-3">Archivos</div>
        <v-list density="compact">
          <v-list-item
            v-if="oferta.archivos.declaracion_jurada"
            :title="oferta.archivos.declaracion_jurada.nombre"
            prepend-icon="mdi-file-document-outline"
            @click="descargarArchivo(`/archivos/${oferta.archivos.declaracion_jurada.archivo_id}/descargar`, oferta.archivos.declaracion_jurada.nombre)"
          />
          <v-list-item
            v-for="sustento in oferta.archivos.sustentos"
            :key="sustento.archivo_id"
            :title="sustento.nombre"
            prepend-icon="mdi-paperclip"
            @click="descargarArchivo(`/archivos/${sustento.archivo_id}/descargar`, sustento.nombre)"
          />
        </v-list>
        <v-btn class="mt-2" prepend-icon="mdi-download" @click="descargarArchivo(oferta.archivos.constancia_url, `constancia-${oferta.constancia_codigo}.pdf`)">
          Descargar constancia
        </v-btn>
      </v-card>

      <v-card v-if="oferta.resultado_evaluacion" class="pa-4">
        <div class="text-subtitle-1 text-titulo mb-3">Resultado de evaluación</div>
        <v-row dense>
          <v-col cols="12" sm="6">
            <div class="text-body-2 text-grey">Evaluación técnica</div>
            <div>{{ oferta.resultado_evaluacion.eval_tecnica ?? '—' }}</div>
            <div v-if="oferta.resultado_evaluacion.eval_tecnica_motivo" class="text-caption text-grey">
              {{ oferta.resultado_evaluacion.eval_tecnica_motivo }}
            </div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-body-2 text-grey">Evaluación logística</div>
            <div>{{ oferta.resultado_evaluacion.eval_logistica ?? '—' }}</div>
            <div v-if="oferta.resultado_evaluacion.eval_logistica_motivo" class="text-caption text-grey">
              {{ oferta.resultado_evaluacion.eval_logistica_motivo }}
            </div>
          </v-col>
        </v-row>
      </v-card>
    </template>
  </v-container>
</template>
