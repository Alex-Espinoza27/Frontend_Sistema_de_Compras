<script setup lang="ts">
// F1 — Bandeja de evaluación / cuadro comparativo (05B). Solo disponible si
// la convocatoria está EN_EVALUACION (o resuelta, en lectura); el backend
// responde 409 en cualquier otro caso.
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import { evaluacionApi } from '@/api/evaluacion.api'
import BaseVolver from '@/components/base/BaseVolver.vue'
import { useListado } from '@/composables/useListado'
import ModalEvaluarOferta from '@/modules/entidad/components/ModalEvaluarOferta.vue'
import type { CuadroComparativoRespuesta, OfertaEvaluacionItem } from '@/modules/entidad/entidad.types'
import dayjs from '@/plugins/dayjs'

const route = useRoute()
const convocatoriaId = Number(route.params.id)

// Ofertas: paginado (05C hardening, pedido explícitamente por el usuario —
// una convocatoria puede recibir más de 100 ofertas, no se cargan todas de
// un golpe). El cuadro comparativo se sigue cargando aparte, sin paginar
// (solo resume las aprobadas para decidir a quién recomendar).
const {
  items: ofertas,
  paginacion,
  cargando,
  params,
  recargar,
} = useListado<OfertaEvaluacionItem>((p) => evaluacionApi.ofertas(convocatoriaId, p), { por_pagina: 15 })

const errorCarga = ref('')
const cuadro = ref<CuadroComparativoRespuesta | null>(null)

async function cargarCuadro() {
  try {
    cuadro.value = await evaluacionApi.cuadroComparativo(convocatoriaId)
  } catch (e: unknown) {
    const error = e as { response?: { data?: { mensaje?: string | null } } }
    errorCarga.value = error.response?.data?.mensaje ?? 'No se pudo cargar la evaluación.'
  }
}
cargarCuadro()

function alGuardarEvaluacion() {
  recargar()
  cargarCuadro()
}

function colorCompuerta(valor: string | null) {
  if (valor === 'APROBADO') return 'success'
  if (valor === 'DESAPROBADO') return 'error'
  return 'grey'
}

const modalAbierto = ref(false)
const ofertaSeleccionada = ref<number | null>(null)
function abrirModal(ofertaId: number) {
  ofertaSeleccionada.value = ofertaId
  modalAbierto.value = true
}
</script>

<template>
  <v-container class="py-8">
    <BaseVolver to="/app/convocatorias" texto="Volver a convocatorias" />
    <div class="text-h5 text-titulo mb-6">Evaluación de ofertas</div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <v-alert v-else-if="errorCarga" type="error" density="compact">{{ errorCarga }}</v-alert>

    <template v-else>
      <v-card class="pa-4 mb-6">
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Código</th>
              <th>Proveedor</th>
              <th>Total S/</th>
              <th>Comprobante</th>
              <th>Ev. Técnica</th>
              <th>Ev. Logística</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="oferta in ofertas" :key="oferta.oferta_id">
              <td class="text-datos">{{ oferta.constancia_codigo }}</td>
              <td>
                <div>{{ oferta.proveedor.razon_social }}</div>
                <div class="text-caption text-grey">{{ oferta.proveedor.numero_documento }}</div>
              </td>
              <td>{{ oferta.total_general }}</td>
              <td>{{ oferta.tipo_comprobante }}</td>
              <td><v-chip size="small" :color="colorCompuerta(oferta.eval_tecnica)" variant="tonal">{{ oferta.eval_tecnica ?? 'Pendiente' }}</v-chip></td>
              <td><v-chip size="small" :color="colorCompuerta(oferta.eval_logistica)" variant="tonal">{{ oferta.eval_logistica ?? 'Pendiente' }}</v-chip></td>
              <td><v-chip size="small" :color="oferta.estado.color" variant="tonal">{{ oferta.estado.codigo }}</v-chip></td>
              <td>{{ dayjs(oferta.fecha_envio).tz().format('DD/MM/YYYY HH:mm') }}</td>
              <td>
                <v-btn
                  v-can="'evaluacion.evaluar'"
                  variant="tonal"
                  color="primary"
                  size="small"
                  @click="abrirModal(oferta.oferta_id)"
                >
                  Evaluar
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
        <div v-if="!ofertas.length" class="text-center py-8 text-grey">No hay ofertas para esta convocatoria.</div>

        <div v-if="paginacion.ultima_pagina > 1" class="d-flex justify-center mt-4">
          <v-pagination
            v-model="params.pagina"
            :length="paginacion.ultima_pagina"
            density="comfortable"
            show-first-last-page
            :total-visible="5"
          />
        </div>
      </v-card>

      <!-- Solo informativo: la decisión de adjudicar/declarar desierta vive
           en el módulo Adjudicación (05C hardening, pedido explícitamente
           por el usuario) — aquí ya no hay acción, solo se deja ver quién
           va ganando. -->
      <v-card v-if="cuadro" class="pa-4">
        <div class="text-subtitle-1 text-titulo mb-3">Cuadro comparativo</div>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Total S/</th>
              <th>Estado</th>
              <th>Recomendada</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in cuadro.items"
              :key="item.oferta_id"
              :class="{ 'bg-primary-soft': item.es_recomendada }"
            >
              <td>{{ item.proveedor.razon_social }}</td>
              <td>{{ item.total_general }}</td>
              <td>{{ item.estado }}</td>
              <td><v-icon v-if="item.es_recomendada" icon="mdi-star" color="primary" /></td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>

    <ModalEvaluarOferta v-model:abierto="modalAbierto" :oferta-id="ofertaSeleccionada" @guardado="alGuardarEvaluacion" />
  </v-container>
</template>
