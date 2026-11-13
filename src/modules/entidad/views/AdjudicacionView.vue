<script setup lang="ts">
// G1 — Adjudicar / Declarar desierta (05B). Recomendación por defecto (menor
// precio entre aprobadas), permite elegir otra oferta aprobada.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { convocatoriasApi } from '@/api/convocatorias.api'
import { evaluacionApi } from '@/api/evaluacion.api'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseVolver from '@/components/base/BaseVolver.vue'
import type { CuadroComparativoRespuesta } from '@/modules/entidad/entidad.types'
import { useUiStore } from '@/stores/ui.store'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null } }
}

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const convocatoriaId = Number(route.params.id)

const cargando = ref(true)
const errorCarga = ref('')
const cuadro = ref<CuadroComparativoRespuesta | null>(null)
const ofertaSeleccionada = ref<number | null>(null)

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  try {
    cuadro.value = await evaluacionApi.cuadroComparativo(convocatoriaId)
    ofertaSeleccionada.value = cuadro.value.recomendada_oferta_id
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorCarga.value = error.response?.data?.mensaje ?? 'No se pudo cargar el cuadro comparativo.'
  } finally {
    cargando.value = false
  }
}
cargar()

const aprobadas = computed(() => cuadro.value?.items.filter((i) => i.estado === 'APROBADA') ?? [])
const hayAprobadas = computed(() => aprobadas.value.length > 0)
const sinOfertas = computed(() => (cuadro.value?.items.length ?? 0) === 0)

// 05C hardening (pedido explícitamente por el usuario): si nunca llegó
// ninguna oferta, se sugiere el motivo exacto — editable, no se fuerza.
const motivoSugerido = computed(() => (sinOfertas.value ? 'No se presentaron cotizaciones.' : ''))

const adjudicarAbierto = ref(false)
const adjudicando = ref(false)
const errorAdjudicar = ref('')
async function confirmarAdjudicar() {
  adjudicando.value = true
  errorAdjudicar.value = ''
  try {
    await convocatoriasApi.adjudicar(convocatoriaId, ofertaSeleccionada.value)
    ui.mostrarSnackbar('Convocatoria adjudicada.', 'success')
    router.push(`/app/convocatorias/${convocatoriaId}/resultados`)
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorAdjudicar.value = error.response?.data?.mensaje ?? 'No se pudo adjudicar.'
  } finally {
    adjudicando.value = false
  }
}

const desiertaAbierto = ref(false)
const declarandoDesierta = ref(false)
async function confirmarDesierta(motivo: string | undefined) {
  if (!motivo) return
  declarandoDesierta.value = true
  try {
    await convocatoriasApi.desierta(convocatoriaId, motivo)
    ui.mostrarSnackbar('Convocatoria declarada desierta.', 'success')
    router.push(`/app/convocatorias/${convocatoriaId}/resultados`)
  } finally {
    declarandoDesierta.value = false
  }
}
</script>

<template>
  <v-container class="py-8" max-width="900">
    <BaseVolver to="/app/adjudicacion" texto="Volver a Adjudicación" />
    <div class="text-h5 text-titulo mb-6">Adjudicación</div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <v-alert v-else-if="errorCarga" type="error" density="compact">{{ errorCarga }}</v-alert>

    <template v-else-if="cuadro">
      <v-card class="pa-4 mb-4">
        <v-table density="comfortable">
          <thead>
            <tr>
              <th></th>
              <th>Proveedor</th>
              <th>Total S/</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in cuadro.items" :key="item.oferta_id" :class="{ 'bg-primary-soft': item.es_recomendada }">
              <td>
                <v-radio
                  v-if="item.estado === 'APROBADA'"
                  :model-value="ofertaSeleccionada"
                  :value="item.oferta_id"
                  density="compact"
                  hide-details
                  @click="ofertaSeleccionada = item.oferta_id"
                />
              </td>
              <td>{{ item.proveedor.razon_social }}</td>
              <td>{{ item.total_general }}</td>
              <td>
                {{ item.estado }}
                <v-icon v-if="item.es_recomendada" icon="mdi-star" color="primary" size="16" class="ml-1" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-alert v-if="sinOfertas" type="warning" density="compact" class="mb-4">
        No se presentaron cotizaciones: no se puede adjudicar. Solo queda declarar desierta la convocatoria.
      </v-alert>
      <v-alert v-else-if="!hayAprobadas" type="warning" density="compact" class="mb-4">
        No hay ofertas aprobadas: no se puede adjudicar. Solo queda declarar desierta la convocatoria.
      </v-alert>

      <div class="d-flex justify-end ga-2">
        <v-btn variant="tonal" color="error" :disabled="hayAprobadas" @click="desiertaAbierto = true">
          Declarar desierta
        </v-btn>
        <v-btn color="primary" :disabled="!hayAprobadas" @click="adjudicarAbierto = true">Adjudicar</v-btn>
      </div>
    </template>

    <BaseConfirmacion
      v-model:abierto="adjudicarAbierto"
      titulo="Adjudicar convocatoria"
      :mensaje="`Se adjudicará a la oferta seleccionada. Esta acción genera el PDF de resultados y notifica a todos los postores. ${errorAdjudicar}`"
      texto-confirmar="Adjudicar"
      fuerte
      :cargando="adjudicando"
      @confirmar="confirmarAdjudicar"
    />

    <BaseConfirmacion
      v-model:abierto="desiertaAbierto"
      titulo="Declarar desierta"
      :mensaje="
        sinOfertas
          ? 'Esta acción cierra la convocatoria sin adjudicar y notifica a los postores. Indica el motivo.'
          : 'Esta acción cierra la convocatoria sin adjudicar, genera el PDF de resultados y notifica a los postores. Indica el motivo.'
      "
      texto-confirmar="Declarar desierta"
      pedir-motivo
      :motivo-sugerido="motivoSugerido"
      :cargando="declarandoDesierta"
      @confirmar="confirmarDesierta"
    />
  </v-container>
</template>
