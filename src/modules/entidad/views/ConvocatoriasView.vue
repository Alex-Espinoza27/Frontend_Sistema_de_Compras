<script setup lang="ts">
// E3 — Convocatorias (05B). Acciones contextuales según estado; reducido a
// registrar/ver/cancelar (05C hardening, Bloque E3) — "Ir a Evaluación" y
// "Adjudicar" ahora viven en sus propios módulos de sidebar (Evaluación y
// Adjudicación, M07/M08 del TDR), no como acciones de esta tabla.
import { ref } from 'vue'

import { convocatoriasApi } from '@/api/convocatorias.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseRangoFechas from '@/components/base/BaseRangoFechas.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { ConvocatoriaListaItem } from '@/modules/entidad/entidad.types'
import dayjs from '@/plugins/dayjs'
import { useUiStore } from '@/stores/ui.store'
import { hoyTexto } from '@/utils/fechas'

const ui = useUiStore()

// El filtro de fecha (antes dos `BaseDatePicker` sueltos, 05C hardening)
// arranca marcado en "Hoy".
const { items, paginacion, cargando, params, recargar } = useListado<ConvocatoriaListaItem>(
  convocatoriasApi.index,
  { ordenar_por: 'fecha_fin', direccion: 'asc', desde: hoyTexto(), hasta: hoyTexto() },
  'filtros_convocatorias',
)

const opcionesEstado = [
  { title: 'Borrador', value: 'BORRADOR' },
  { title: 'Convocatoria Vigente', value: 'PUBLICADA' },
  { title: 'Convocatoria en Evaluación', value: 'EN_EVALUACION' },
  { title: 'Convocatoria Adjudicada', value: 'ADJUDICADA' },
  { title: 'Convocatoria Desierta', value: 'DESIERTA' },
  { title: 'Convocatoria Cancelada', value: 'CANCELADA' },
]

// `sortable` refleja lo que soporta `ConvocatoriaController::index`
// (fecha_fin/fecha_inicio/numero/estado, 05C hardening); "Fechas" es una
// columna combinada sin un único campo del backend al que mapear, así que
// no es ordenable por clic.
const cabeceras = [
  { title: 'Acciones', key: 'acciones', sortable: false },
  { title: 'Número', key: 'numero' },
  { title: 'Nombre', key: 'nombre_servicio', sortable: false },
  { title: 'Fechas', key: 'fechas', sortable: false },
  { title: 'Estado', key: 'estado' },
  { title: 'Motivo', key: 'motivo_cierre', sortable: false },
  { title: 'Urgencia', key: 'urgencia_dias', sortable: false },
  { title: 'N.º ofertas', key: 'total_ofertas', sortable: false },
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
        <v-btn icon color="primary" variant="outlined" :loading="cargando" @click="recargar()">
          <v-icon icon="mdi-refresh" />
          <v-tooltip activator="parent" location="bottom">Refrescar</v-tooltip>
        </v-btn>
        <v-btn to="/app/convocatorias/nueva" color="primary" variant="flat" elevation="2" class="font-weight-medium px-5">
          Nueva convocatoria
        </v-btn>
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
        style="max-width: 240px"
        @update:model-value="recargar()"
      />
      <BaseRangoFechas
        v-model:desde="params.desde as string"
        v-model:hasta="params.hasta as string"
        style="max-width: 260px"
        @aplicar="recargar()"
      />
    </div>

    <v-card variant="flat" :border="false" class="pa-3 mb-4 rounded-lg bg-surface leyenda-estados">
      <div class="d-flex align-center flex-wrap ga-3">
        <div class="text-caption font-weight-bold text-grey-darken-1 d-flex align-center ga-1">
          <v-icon icon="mdi-information-outline" size="16" />
          Leyenda de estados:
        </div>
        <div class="d-flex flex-wrap align-center ga-2">
          <BaseChipEstado :estado="{ codigo: 'BORRADOR', nombre: 'Borrador', color: 'grey' }" />
          <BaseChipEstado :estado="{ codigo: 'PUBLICADA', nombre: 'Convocatoria Vigente', color: 'success' }" />
          <BaseChipEstado :estado="{ codigo: 'EN_EVALUACION', nombre: 'Convocatoria en Evaluación', color: 'info' }" />
          <BaseChipEstado :estado="{ codigo: 'ADJUDICADA', nombre: 'Convocatoria Adjudicada', color: 'primary' }" />
          <BaseChipEstado :estado="{ codigo: 'DESIERTA', nombre: 'Convocatoria Desierta', color: 'warning' }" />
          <BaseChipEstado :estado="{ codigo: 'CANCELADA', nombre: 'Convocatoria Cancelada', color: 'error' }" />
        </div>
      </div>
    </v-card>

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
      <template #item.acciones="{ item }">
        <div class="d-flex align-center ga-1">
          <template v-if="item.estado.codigo === 'BORRADOR'">
            <v-btn
              v-can="'convocatorias.editar'"
              :to="`/app/convocatorias/${item.convocatoria_id}`"
              icon
              variant="text"
              size="small"
              color="primary"
            >
              <v-icon icon="mdi-pencil-outline" />
              <v-tooltip activator="parent" location="top">Editar borrador</v-tooltip>
            </v-btn>
          </template>
          <template v-else-if="item.estado.codigo === 'ADJUDICADA' || (item.estado.codigo === 'DESIERTA' && item.numero_indagacion)">
            <v-btn
              :to="`/app/convocatorias/${item.convocatoria_id}/resultados`"
              icon
              variant="text"
              size="small"
              color="info"
            >
              <v-icon icon="mdi-file-chart-outline" />
              <v-tooltip activator="parent" location="top">Ver resultados</v-tooltip>
            </v-btn>
          </template>
          <template v-else>
            <v-btn
              :to="`/app/convocatorias/${item.convocatoria_id}`"
              icon
              variant="text"
              size="small"
              color="primary"
            >
              <v-icon icon="mdi-eye-outline" />
              <v-tooltip activator="parent" location="top">Ver detalle</v-tooltip>
            </v-btn>
          </template>
          <v-btn
            v-if="['BORRADOR', 'PUBLICADA', 'EN_EVALUACION'].includes(item.estado.codigo)"
            v-can="'convocatorias.cancelar'"
            icon
            variant="text"
            size="small"
            color="error"
            @click="pedirCancelar(item.convocatoria_id)"
          >
            <v-icon icon="mdi-close-circle-outline" />
            <v-tooltip activator="parent" location="top">Cancelar convocatoria</v-tooltip>
          </v-btn>
        </div>
      </template>
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

<style scoped>
/* El `variant="outlined"` que tenía esta tarjeta dibuja su borde con
   `currentColor` (negro/gris oscuro en Material Design por defecto), no con
   el `--border-color` suave del tema (05C hardening, reportado por el
   usuario: "el border negro se ve muy mal"). Se reemplaza por una sombra
   básica, sin borde. */
.leyenda-estados {
  box-shadow: var(--sombra-1);
}
</style>

