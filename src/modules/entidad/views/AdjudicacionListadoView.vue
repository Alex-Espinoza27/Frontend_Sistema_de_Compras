<script setup lang="ts">
// M08 del TDR — Adjudicación (05C hardening): bandeja propia con las
// convocatorias EN_EVALUACION donde ya no queda ninguna oferta pendiente de
// evaluar (filtro `lista_para_adjudicar`, calculado en el backend con el
// mismo criterio que ya exige `AdjudicacionService::adjudicar` — sin agregar
// un estado nuevo, decisión confirmada con el usuario). "Ir a Adjudicación"
// lleva a la pantalla existente (sin cambios).
import { convocatoriasApi } from '@/api/convocatorias.api'
import BaseRangoFechas from '@/components/base/BaseRangoFechas.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { ConvocatoriaListaItem } from '@/modules/entidad/entidad.types'
import dayjs from '@/plugins/dayjs'
import { hoyTexto } from '@/utils/fechas'

// El filtro de fecha (nuevo, 05C hardening, sobre el cierre de plazo) arranca
// marcado en "Hoy" — mismo criterio pedido para Presentación de Ofertas.
const { items, paginacion, cargando, params, recargar } = useListado<ConvocatoriaListaItem>(
  convocatoriasApi.index,
  { lista_para_adjudicar: 'true', ordenar_por: 'fecha_fin', direccion: 'asc', desde: hoyTexto(), hasta: hoyTexto() },
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
      <div class="text-h5 text-titulo">Adjudicación</div>
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
      <BaseRangoFechas
        v-model:desde="params.desde as string"
        v-model:hasta="params.hasta as string"
        label="Cierre de plazo"
        style="max-width: 260px"
        @aplicar="recargar()"
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
      mensaje-vacio="No hay convocatorias listas para adjudicar."
    >
      <template #item.fecha_fin="{ item }">{{ dayjs(item.fecha_fin).tz().format('DD/MM/YYYY HH:mm') }}</template>
      <template #item.acciones="{ item }">
        <v-btn :to="`/app/convocatorias/${item.convocatoria_id}/adjudicacion`" variant="text" size="small">
          Ir a Adjudicación
        </v-btn>
      </template>
    </BaseTablaServidor>
  </v-container>
</template>
