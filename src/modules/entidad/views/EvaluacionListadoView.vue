<script setup lang="ts">
// M07 del TDR — Evaluación (05C hardening): bandeja propia con las
// convocatorias que ya tienen al menos una oferta, PUBLICADA o
// EN_EVALUACION — evaluar ya no espera a que venza el plazo de postulación
// (pedido explícitamente por el usuario, filtro `lista_para_evaluar`).
// "Ir a Evaluación" lleva al cuadro comparativo/modal de evaluación ya
// existentes (sin cambios).
import { convocatoriasApi } from '@/api/convocatorias.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { ConvocatoriaListaItem } from '@/modules/entidad/entidad.types'
import dayjs from '@/plugins/dayjs'

const { items, paginacion, cargando, params, recargar } = useListado<ConvocatoriaListaItem>(
  convocatoriasApi.index,
  { lista_para_evaluar: 'true', ordenar_por: 'fecha_fin', direccion: 'asc' },
)

const cabeceras = [
  { title: 'Número', key: 'numero' },
  { title: 'Nombre', key: 'nombre_servicio', sortable: false },
  { title: 'Estado', key: 'estado', sortable: false },
  { title: 'Cierre de plazo', key: 'fecha_fin' },
  { title: 'N.º ofertas', key: 'total_ofertas', sortable: false },
  { title: 'Progreso', key: 'progreso', sortable: false },
  { title: '', key: 'acciones', sortable: false },
]

// Indicador de avance de evaluación (05C hardening, pedido explícitamente
// por el usuario): con muchos registros, saber de un vistazo cuáles ya se
// terminaron de calificar y cuáles siguen pendientes.
function progreso(item: ConvocatoriaListaItem): { texto: string; color: string; icono?: string } {
  if (item.total_ofertas === 0) return { texto: 'Sin ofertas', color: 'grey' }
  if (item.ofertas_evaluadas === item.total_ofertas) {
    return { texto: 'Evaluación completa', color: 'success', icono: 'mdi-check-circle-outline' }
  }
  return { texto: `${item.ofertas_evaluadas}/${item.total_ofertas} evaluadas`, color: 'warning' }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Evaluación</div>
      <v-btn icon color="primary" variant="text" :loading="cargando" @click="recargar()">
        <v-icon icon="mdi-refresh" />
        <v-tooltip activator="parent" location="bottom">Refrescar</v-tooltip>
      </v-btn>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        v-model="params.buscar"
        label="Buscar por nombre o número"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 280px"
        clearable
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
      mensaje-vacio="No hay convocatorias para evaluar."
    >
      <template #item.estado="{ item }"><BaseChipEstado :estado="item.estado" /></template>
      <template #item.fecha_fin="{ item }">{{ dayjs(item.fecha_fin).tz().format('DD/MM/YYYY HH:mm') }}</template>
      <template #item.progreso="{ item }">
        <v-chip :color="progreso(item).color" variant="tonal" size="small" :prepend-icon="progreso(item).icono">
          {{ progreso(item).texto }}
        </v-chip>
      </template>
      <template #item.acciones="{ item }">
        <v-btn :to="`/app/convocatorias/${item.convocatoria_id}/evaluacion`" variant="text" size="small">
          Ir a Evaluación
        </v-btn>
      </template>
    </BaseTablaServidor>
  </v-container>
</template>
