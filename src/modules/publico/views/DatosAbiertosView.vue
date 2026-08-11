<script setup lang="ts">
import { ref } from 'vue'

import { datosAbiertosApi } from '@/api/datosAbiertos.api'
import { useDescarga } from '@/composables/useDescarga'
import type { EstadisticasPublicas } from '@/modules/publico/publico.types'

const estadisticas = ref<EstadisticasPublicas | null>(null)
datosAbiertosApi.estadisticas().then((data) => (estadisticas.value = data))

const { cargando, bloqueado, descargar } = useDescarga()
</script>

<template>
  <v-container class="py-8">
    <div class="text-h5 text-titulo mb-1">Datos abiertos</div>
    <div class="text-body-2 text-grey mb-6">Información pública, actualizada al momento.</div>

    <template v-if="estadisticas">
      <v-row class="mb-6">
        <v-col v-for="fila in estadisticas.convocatorias_por_estado" :key="fila.codigo" cols="6" sm="3">
          <v-card class="pa-4 text-center">
            <div class="text-h5 text-titulo">{{ fila.total }}</div>
            <div class="text-caption text-grey">{{ fila.nombre }}</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card class="pa-4 text-center">
            <div class="text-h5 text-titulo">{{ estadisticas.proveedores_participantes }}</div>
            <div class="text-caption text-grey">Proveedores participantes</div>
          </v-card>
        </v-col>
      </v-row>

      <v-card v-if="estadisticas.adjudicadas_por_mes.length" class="mb-6">
        <v-card-title class="text-titulo">Adjudicadas por mes</v-card-title>
        <v-table>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Convocatorias</th>
              <th>Monto adjudicado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in estadisticas.adjudicadas_por_mes" :key="fila.mes">
              <td class="text-datos">{{ fila.mes }}</td>
              <td>{{ fila.total }}</td>
              <td class="text-datos">S/ {{ fila.monto_adjudicado.toFixed(2) }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>

    <v-card>
      <v-card-title class="text-titulo">Descargas</v-card-title>
      <v-card-text class="d-flex flex-wrap ga-4">
        <v-btn
          variant="tonal"
          :loading="cargando"
          :disabled="bloqueado"
          @click="descargar(datosAbiertosApi.convocatoriasCsvUrl(), 'convocatorias.csv')"
        >
          Convocatorias .csv
        </v-btn>
        <v-btn
          variant="tonal"
          :loading="cargando"
          :disabled="bloqueado"
          @click="descargar(datosAbiertosApi.convocatoriasXlsxUrl(), 'convocatorias.xlsx')"
        >
          Convocatorias .xlsx
        </v-btn>
        <v-btn
          variant="tonal"
          :loading="cargando"
          :disabled="bloqueado"
          @click="descargar(datosAbiertosApi.adjudicacionesCsvUrl(), 'adjudicaciones.csv')"
        >
          Adjudicaciones .csv
        </v-btn>
        <v-btn
          variant="tonal"
          :loading="cargando"
          :disabled="bloqueado"
          @click="descargar(datosAbiertosApi.adjudicacionesXlsxUrl(), 'adjudicaciones.xlsx')"
        >
          Adjudicaciones .xlsx
        </v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>
