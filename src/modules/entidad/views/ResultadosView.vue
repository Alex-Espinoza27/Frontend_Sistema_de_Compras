<script setup lang="ts">
// Resultados internos (05B, módulo G). Solo lectura; el PDF reutiliza el
// endpoint público de resultados (Fase 2), ya probado.
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import { convocatoriasApi } from '@/api/convocatorias.api'
import { publicoApi } from '@/api/publico.api'
import BaseVolver from '@/components/base/BaseVolver.vue'
import { useDescarga } from '@/composables/useDescarga'
import type { ResultadosConvocatoria } from '@/modules/entidad/entidad.types'

const route = useRoute()
const convocatoriaId = Number(route.params.id)

const cargando = ref(true)
const errorCarga = ref('')
const resultados = ref<ResultadosConvocatoria | null>(null)

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    resultados.value = await convocatoriasApi.resultados(convocatoriaId)
  } catch (e: unknown) {
    const error = e as { response?: { data?: { mensaje?: string | null } } }
    errorCarga.value = error.response?.data?.mensaje ?? 'Esta convocatoria aún no tiene resultados.'
  } finally {
    cargando.value = false
  }
}
cargar()

const { cargando: descargando, abrirEnNuevaPestana } = useDescarga()
function verPdf() {
  abrirEnNuevaPestana(publicoApi.resultadosPdfUrl(convocatoriaId))
}
</script>

<template>
  <v-container class="py-8" max-width="900">
    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <template v-else-if="errorCarga">
      <BaseVolver to="/app/convocatorias" texto="Volver a convocatorias" />
      <v-alert type="error" density="compact">{{ errorCarga }}</v-alert>
    </template>

    <template v-else-if="resultados">
      <BaseVolver to="/app/convocatorias" texto="Volver a convocatorias" />
      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <div class="text-h5 text-titulo">{{ resultados.numero ?? '—' }}</div>
          <div class="text-body-2 text-grey">{{ resultados.nombre_servicio }}</div>
          <div v-if="resultados.numero_indagacion" class="text-caption text-grey">
            Indagación de Mercado N° {{ resultados.numero_indagacion }}
          </div>
        </div>
        <v-btn :loading="descargando" prepend-icon="mdi-file-pdf-box" @click="verPdf">Ver PDF de resultados</v-btn>
      </div>

      <v-alert v-if="resultados.motivo_cierre" type="info" density="compact" class="mb-4">
        Motivo: {{ resultados.motivo_cierre }}
      </v-alert>

      <v-card class="pa-4">
        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Monto S/</th>
              <th>Ev. Técnica</th>
              <th>Ev. Logística</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="oferta in resultados.ofertas"
              :key="oferta.oferta_id"
              :class="{ 'bg-primary-soft': oferta.oferta_id === resultados.oferta_adjudicada_id }"
            >
              <td>{{ oferta.proveedor.razon_social }}</td>
              <td>{{ oferta.monto }}</td>
              <td>{{ oferta.eval_tecnica ?? '—' }}</td>
              <td>{{ oferta.eval_logistica ?? '—' }}</td>
              <td>
                {{ oferta.resultado }}
                <v-icon v-if="oferta.oferta_id === resultados.oferta_adjudicada_id" icon="mdi-trophy" color="success" size="16" class="ml-1" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>
  </v-container>
</template>
