<script setup lang="ts">
// M07 del TDR — Evaluación (05C hardening): bandeja propia con las
// convocatorias EN_EVALUACION de la entidad; "Ir a Evaluación" lleva al
// cuadro comparativo/modal de evaluación ya existentes (sin cambios).
import { convocatoriasApi } from '@/api/convocatorias.api'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { ConvocatoriaListaItem } from '@/modules/entidad/entidad.types'
import dayjs from '@/plugins/dayjs'

const { items, paginacion, cargando, params } = useListado<ConvocatoriaListaItem>(
  convocatoriasApi.index,
  { estado: 'EN_EVALUACION', ordenar_por: 'fecha_fin', direccion: 'asc' },
)

const cabeceras = [
  { title: 'Número', key: 'numero' },
  { title: 'Nombre', key: 'nombre_servicio', sortable: false },
  { title: 'Cierre de plazo', key: 'fecha_fin' },
  { title: 'N.º ofertas', key: 'total_ofertas', sortable: false },
  { title: '', key: 'acciones', sortable: false },
]
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Evaluación</div>
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
      mensaje-vacio="No hay convocatorias en evaluación."
    >
      <template #item.fecha_fin="{ item }">{{ dayjs(item.fecha_fin).tz().format('DD/MM/YYYY HH:mm') }}</template>
      <template #item.acciones="{ item }">
        <v-btn :to="`/app/convocatorias/${item.convocatoria_id}/evaluacion`" variant="text" size="small">
          Ir a Evaluación
        </v-btn>
      </template>
    </BaseTablaServidor>
  </v-container>
</template>
