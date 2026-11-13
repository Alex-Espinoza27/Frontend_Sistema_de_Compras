<script setup lang="ts">
// M06 del TDR — Presentación de Ofertas (05C hardening): lista todas las
// ofertas recibidas por las convocatorias de la entidad, sin filtrar por
// estado de convocatoria (a diferencia de la bandeja de Evaluación, que solo
// muestra convocatorias EN_EVALUACION).
import { presentacionOfertasApi } from '@/api/presentacionOfertas.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseRangoFechas from '@/components/base/BaseRangoFechas.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { PresentacionOfertaItem } from '@/modules/entidad/entidad.types'
import dayjs from '@/plugins/dayjs'
import { hoyTexto } from '@/utils/fechas'

// El filtro de fecha (nuevo, 05C hardening, sobre OFER_FECHA_ENVIO) arranca
// marcado en "Hoy".
const { items, paginacion, cargando, params, recargar } = useListado<PresentacionOfertaItem>(
  presentacionOfertasApi.index,
  { ordenar_por: 'fecha_envio', direccion: 'desc', desde: hoyTexto(), hasta: hoyTexto() },
  'filtros_presentacion_ofertas',
)

const cabeceras = [
  { title: 'Acciones', key: 'acciones', sortable: false },
  { title: 'Constancia', key: 'constancia_codigo' },
  { title: 'Convocatoria', key: 'convocatoria', sortable: false },
  { title: 'Proveedor', key: 'proveedor', sortable: false },
  { title: 'Total', key: 'total_general' },
  { title: 'Estado', key: 'estado', sortable: false },
  { title: 'Fecha de envío', key: 'fecha_envio' },
]

</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Presentación de Ofertas</div>
      <v-btn icon color="primary" variant="outlined" :loading="cargando" @click="recargar()">
        <v-icon icon="mdi-refresh" />
        <v-tooltip activator="parent" location="bottom">Refrescar</v-tooltip>
      </v-btn>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        v-model="params.buscar"
        label="Buscar por convocatoria"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 280px"
        clearable
      />
      <v-select
        v-model="params.estado"
        :items="[
          { title: 'Enviada', value: 'ENVIADA' },
          { title: 'En Evaluación', value: 'EN_EVALUACION' },
          { title: 'Aprobada', value: 'APROBADA' },
          { title: 'Desaprobada', value: 'DESAPROBADA' },
          { title: 'Adjudicada', value: 'ADJUDICADA' },
          { title: 'No Adjudicada', value: 'NO_ADJUDICADA' },
        ]"
        label="Estado"
        clearable
        style="max-width: 200px"
        @update:model-value="recargar()"
      />
      <BaseRangoFechas
        v-model:desde="params.desde as string"
        v-model:hasta="params.hasta as string"
        label="Fecha de envío"
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
          <BaseChipEstado :estado="{ codigo: 'ENVIADA', nombre: 'Enviada', color: 'info' }" />
          <BaseChipEstado :estado="{ codigo: 'EN_EVALUACION', nombre: 'En Evaluación', color: 'grey' }" />
          <BaseChipEstado :estado="{ codigo: 'APROBADA', nombre: 'Aprobada', color: 'success' }" />
          <BaseChipEstado :estado="{ codigo: 'DESAPROBADA', nombre: 'Desaprobada', color: 'error' }" />
          <BaseChipEstado :estado="{ codigo: 'ADJUDICADA', nombre: 'Adjudicada', color: 'primary' }" />
          <BaseChipEstado :estado="{ codigo: 'NO_ADJUDICADA', nombre: 'No Adjudicada', color: 'grey' }" />
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
      mensaje-vacio="Aún no se han recibido ofertas."
    >
      <template #item.acciones="{ item }">
        <div class="d-flex align-center ga-1">
          <v-btn
            :to="`/app/presentacion-ofertas/${item.oferta_id}`"
            icon
            variant="text"
            size="small"
            color="primary"
          >
            <v-icon icon="mdi-eye-outline" />
            <v-tooltip activator="parent" location="top">Ver detalle de oferta</v-tooltip>
          </v-btn>
        </div>
      </template>
      <template #item.convocatoria="{ item }">{{ item.convocatoria.numero ?? '—' }} — {{ item.convocatoria.nombre_servicio }}</template>
      <template #item.proveedor="{ item }">{{ item.proveedor.razon_social }}</template>
      <template #item.estado="{ item }">
        <BaseChipEstado :estado="{ codigo: item.estado.codigo, nombre: item.estado.nombre, color: item.estado.color }" />
      </template>
      <template #item.fecha_envio="{ item }">{{ dayjs(item.fecha_envio).tz().format('DD/MM/YYYY HH:mm') }}</template>
    </BaseTablaServidor>
  </v-container>
</template>

<style scoped>
/* Mismo fix que ConvocatoriasView.vue: `variant="outlined"` dibuja el borde
   con `currentColor` (negro/gris oscuro), no con el `--border-color` suave
   del tema — se reemplaza por una sombra básica, sin borde. */
.leyenda-estados {
  box-shadow: var(--sombra-1);
}
</style>
