<script setup lang="ts">
// E3 — Convocatorias (05B). Acciones contextuales según estado; reducido a
// registrar/ver/cancelar (05C hardening, Bloque E3) — "Ir a Evaluación" y
// "Adjudicar" ahora viven en sus propios módulos de sidebar (Evaluación y
// Adjudicación, M07/M08 del TDR), no como acciones de esta tabla.
import { ref } from 'vue'

import { convocatoriasApi } from '@/api/convocatorias.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseDatePicker from '@/components/base/BaseDatePicker.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { ConvocatoriaListaItem } from '@/modules/entidad/entidad.types'
import dayjs from '@/plugins/dayjs'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()

const { items, paginacion, cargando, params, recargar } = useListado<ConvocatoriaListaItem>(
  convocatoriasApi.index,
  { ordenar_por: 'fecha_fin', direccion: 'asc' },
)

const opcionesEstado = [
  { title: 'Borrador', value: 'BORRADOR' },
  { title: 'Publicada', value: 'PUBLICADA' },
  { title: 'En evaluación', value: 'EN_EVALUACION' },
  { title: 'Adjudicada', value: 'ADJUDICADA' },
  { title: 'Desierta', value: 'DESIERTA' },
  { title: 'Cancelada', value: 'CANCELADA' },
]

// `sortable` refleja lo que soporta `ConvocatoriaController::index`
// (fecha_fin/fecha_inicio/numero/estado, 05C hardening); "Fechas" es una
// columna combinada sin un único campo del backend al que mapear, así que
// no es ordenable por clic.
const cabeceras = [
  { title: 'Número', key: 'numero' },
  { title: 'Nombre', key: 'nombre_servicio', sortable: false },
  { title: 'Fechas', key: 'fechas', sortable: false },
  { title: 'Estado', key: 'estado' },
  { title: 'Motivo', key: 'motivo_cierre', sortable: false },
  { title: 'Urgencia', key: 'urgencia_dias', sortable: false },
  { title: 'N.º ofertas', key: 'total_ofertas', sortable: false },
  { title: '', key: 'acciones', sortable: false },
]

const cancelarAbierto = ref(false)
const cancelarId = ref<number | null>(null)
const cancelando = ref(false)
function pedirCancelar(id: number) {
  cancelarId.value = id
  cancelarAbierto.value = true
}
async function confirmarCancelar(motivo: string | undefined) {
  if (!cancelarId.value || !motivo) return
  cancelando.value = true
  try {
    await convocatoriasApi.cancelar(cancelarId.value, motivo)
    cancelarAbierto.value = false
    ui.mostrarSnackbar('Convocatoria cancelada.', 'success')
    recargar()
  } finally {
    cancelando.value = false
  }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Convocatorias</div>
      <div class="d-flex ga-2">
        <v-btn icon color="primary" variant="text" :loading="cargando" @click="recargar()">
          <v-icon icon="mdi-refresh" />
          <v-tooltip activator="parent" location="bottom">Refrescar</v-tooltip>
        </v-btn>
        <v-btn to="/app/convocatorias/nueva" prepend-icon="mdi-plus">Nueva convocatoria</v-btn>
      </div>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        v-model="params.buscar"
        label="Buscar por nombre o número"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 280px"
        clearable
      />
      <v-select
        v-model="params.estado"
        :items="opcionesEstado"
        label="Estado"
        clearable
        style="max-width: 180px"
        @update:model-value="recargar()"
      />
      <BaseDatePicker
        v-model="params.desde as string"
        label="Desde"
        clearable
        style="max-width: 180px"
        @update:model-value="recargar()"
      />
      <BaseDatePicker
        v-model="params.hasta as string"
        label="Hasta"
        clearable
        style="max-width: 180px"
        @update:model-value="recargar()"
      />
    </div>

    <BaseTablaServidor
      v-model:page="params.pagina"
      v-model:items-per-page="params.por_pagina"
      v-model:ordenar-por="params.ordenar_por"
      v-model:direccion="params.direccion"
      :headers="cabeceras"
      :items="items"
      :items-length="paginacion.total"
      :loading="cargando"
      mensaje-vacio="Aún no has creado convocatorias."
    >
      <template #item.numero="{ item }">{{ item.numero ?? '— borrador' }}</template>
      <template #item.fechas="{ item }">
        {{ dayjs(item.fecha_inicio).tz().format('DD/MM/YYYY') }} — {{ dayjs(item.fecha_fin).tz().format('DD/MM/YYYY') }}
      </template>
      <template #item.estado="{ item }"><BaseChipEstado :estado="item.estado" /></template>
      <template #item.motivo_cierre="{ item }">
        <v-tooltip v-if="item.motivo_cierre" location="top" max-width="320">
          <template #activator="{ props: tooltipProps }">
            <span v-bind="tooltipProps" class="text-truncate d-inline-block" style="max-width: 220px">
              {{ item.motivo_cierre }}
            </span>
          </template>
          {{ item.motivo_cierre }}
        </v-tooltip>
        <span v-else>—</span>
      </template>
      <template #item.urgencia_dias="{ item }">
        <v-icon v-if="item.urgencia_dias <= 3 && item.estado.codigo === 'PUBLICADA'" icon="mdi-alert-circle-outline" color="accent" size="18" />
        <span v-else>—</span>
      </template>
      <template #item.acciones="{ item }">
        <template v-if="item.estado.codigo === 'BORRADOR'">
          <v-btn v-can="'convocatorias.editar'" :to="`/app/convocatorias/${item.convocatoria_id}`" variant="text" size="small">
            Editar
          </v-btn>
        </template>
        <template v-else-if="item.estado.codigo === 'ADJUDICADA' || (item.estado.codigo === 'DESIERTA' && item.numero_indagacion)">
          <v-btn :to="`/app/convocatorias/${item.convocatoria_id}/resultados`" variant="text" size="small">
            Ver resultados
          </v-btn>
        </template>
        <template v-else>
          <v-btn :to="`/app/convocatorias/${item.convocatoria_id}`" variant="text" size="small">Ver</v-btn>
        </template>
        <v-btn
          v-if="['BORRADOR', 'PUBLICADA', 'EN_EVALUACION'].includes(item.estado.codigo)"
          v-can="'convocatorias.cancelar'"
          variant="text"
          size="small"
          color="error"
          @click="pedirCancelar(item.convocatoria_id)"
        >
          Cancelar
        </v-btn>
      </template>
    </BaseTablaServidor>

    <BaseConfirmacion
      v-model:abierto="cancelarAbierto"
      titulo="Cancelar convocatoria"
      mensaje="Esta acción cierra la convocatoria de forma definitiva y notifica a los postores. Indica el motivo."
      texto-confirmar="Cancelar convocatoria"
      pedir-motivo
      :cargando="cancelando"
      @confirmar="confirmarCancelar"
    />
  </v-container>
</template>
