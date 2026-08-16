<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { datosAbiertosApi } from '@/api/datosAbiertos.api'
import { publicoApi } from '@/api/publico.api'
import { useDescarga } from '@/composables/useDescarga'
import { useListado } from '@/composables/useListado'
import CardConvocatoria from '@/modules/publico/components/CardConvocatoria.vue'
import ModalMotivoCierre from '@/modules/publico/components/ModalMotivoCierre.vue'
import type { ConvocatoriaPublicaItem, EstadoGrupo, EstadisticasPublicas, TipoConvocatoria } from '@/modules/publico/publico.types'

// `entidadId` opcional como prop (05C hardening, pedido explícitamente por el
// usuario): cuando la plataforma solo tiene una entidad, `PortadaView.vue`
// incrusta este mismo componente directamente en "/" (sin redirigir a
// "/entidad/{id}") — ahí no hay `route.params.id`, así que se resuelve por
// prop en vez de por ruta.
const props = defineProps<{ entidadId?: number }>()
const route = useRoute()
const entidadId = computed(() => props.entidadId ?? Number(route.params.id))

const entidadNombre = ref('')
publicoApi.entidades().then((respuesta) => {
  const entidad = respuesta.items.find((item) => item.entidad_id === entidadId.value)
  entidadNombre.value = entidad ? `${entidad.razon_social} (${entidad.sigla})` : ''
})

// 05C hardening (pedido explícitamente por el usuario): mismos cards de
// estado y descargas que `/datos-abiertos`, acotados a esta entidad.
const estadisticas = ref<EstadisticasPublicas | null>(null)
datosAbiertosApi.estadisticas(entidadId.value).then((data) => (estadisticas.value = data))
const { cargando: descargando, bloqueado, descargar } = useDescarga()

const pestana = ref<EstadoGrupo>('VIGENTES')

const { items, paginacion, cargando, params, recargar } = useListado<ConvocatoriaPublicaItem>(
  publicoApi.convocatorias,
  { estado_grupo: pestana.value, entidad_id: entidadId.value, ordenar_por: 'fecha_fin', direccion: 'asc' },
)

watch(pestana, (valor) => {
  params.estado_grupo = valor
  params.pagina = 1
  recargar()
})

// Filtros por nombre/número y tipo (05C hardening, pedido explícitamente por
// el usuario): mismo patrón que ya existe en `ListadoConvocatorias.vue`
// (proveedor autenticado) — antes esta pantalla pública no tenía ninguno.
const buscar = ref('')
let temporizadorBuscar: ReturnType<typeof setTimeout>
watch(buscar, (valor) => {
  clearTimeout(temporizadorBuscar)
  temporizadorBuscar = setTimeout(() => {
    params.buscar = valor || undefined
    params.pagina = 1
    recargar()
  }, 400)
})

const tipo = ref<TipoConvocatoria | null>(null)
function elegirTipo(valor: TipoConvocatoria | null) {
  tipo.value = tipo.value === valor ? null : valor
  params.tipo = tipo.value ?? undefined
  params.pagina = 1
  recargar()
}

const mensajeVacio: Record<EstadoGrupo, string> = {
  VIGENTES: 'Aún no hay convocatorias vigentes en esta entidad.',
  EN_EVALUACION: 'No hay convocatorias en evaluación por el momento.',
  CONCLUIDAS: 'Todavía no hay convocatorias concluidas.',
}

const motivoAbierto = ref(false)
const motivoConvocatoriaId = ref<number | null>(null)
function verMotivo(id: number) {
  motivoConvocatoriaId.value = id
  motivoAbierto.value = true
}

function alReenfocar() {
  if (document.visibilityState === 'visible') recargar()
}
onMounted(() => document.addEventListener('visibilitychange', alReenfocar))
onUnmounted(() => document.removeEventListener('visibilitychange', alReenfocar))
</script>

<template>
  <v-container class="py-8">
    <div class="text-h5 text-titulo mb-1">{{ entidadNombre }}</div>
    <div class="text-body-2 text-grey mb-6">Convocatorias publicadas por esta entidad</div>

    <template v-if="estadisticas">
      <v-row class="mb-4">
        <v-col v-for="fila in estadisticas.convocatorias_por_estado" :key="fila.codigo" cols="6" sm="4" md="2">
          <v-card class="pa-4 text-center">
            <div class="text-h5 text-titulo">{{ fila.total }}</div>
            <div class="text-caption text-grey">{{ fila.nombre }}</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2">
          <v-card class="pa-4 text-center">
            <div class="text-h5 text-titulo">{{ estadisticas.proveedores_participantes }}</div>
            <div class="text-caption text-grey">Proveedores participantes</div>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="mb-6">
        <v-card-title class="text-titulo">Descargas</v-card-title>
        <v-card-text class="d-flex flex-wrap ga-4">
          <v-btn
            variant="tonal"
            :loading="descargando"
            :disabled="bloqueado"
            @click="descargar(datosAbiertosApi.convocatoriasCsvUrl(entidadId), 'convocatorias.csv')"
          >
            Convocatorias .csv
          </v-btn>
          <v-btn
            variant="tonal"
            :loading="descargando"
            :disabled="bloqueado"
            @click="descargar(datosAbiertosApi.convocatoriasXlsxUrl(entidadId), 'convocatorias.xlsx')"
          >
            Convocatorias .xlsx
          </v-btn>
          <v-btn
            variant="tonal"
            :loading="descargando"
            :disabled="bloqueado"
            @click="descargar(datosAbiertosApi.adjudicacionesCsvUrl(entidadId), 'adjudicaciones.csv')"
          >
            Adjudicaciones .csv
          </v-btn>
          <v-btn
            variant="tonal"
            :loading="descargando"
            :disabled="bloqueado"
            @click="descargar(datosAbiertosApi.adjudicacionesXlsxUrl(entidadId), 'adjudicaciones.xlsx')"
          >
            Adjudicaciones .xlsx
          </v-btn>
        </v-card-text>
      </v-card>
    </template>

    <div class="d-flex flex-wrap align-center ga-4 mb-4">
      <v-text-field
        v-model="buscar"
        label="Buscar por nombre del servicio"
        prepend-inner-icon="mdi-magnify"
        clearable
        style="max-width: 320px"
        hide-details
      />
      <v-btn-toggle density="comfortable" variant="outlined" divided>
        <v-btn :color="tipo === 'BIEN' ? 'primary' : undefined" @click="elegirTipo('BIEN')">Bien</v-btn>
        <v-btn :color="tipo === 'SERVICIO' ? 'primary' : undefined" @click="elegirTipo('SERVICIO')">Servicio</v-btn>
      </v-btn-toggle>
    </div>

    <v-tabs v-model="pestana" class="mb-6">
      <v-tab value="VIGENTES">Vigentes</v-tab>
      <v-tab value="EN_EVALUACION">En evaluación</v-tab>
      <v-tab value="CONCLUIDAS">Concluidas</v-tab>
    </v-tabs>

    <v-row v-if="items.length">
      <v-col v-for="convocatoria in items" :key="convocatoria.convocatoria_id" cols="12">
        <CardConvocatoria :convocatoria="convocatoria" @ver-motivo="verMotivo" />
      </v-col>
    </v-row>
    <div v-else-if="!cargando" class="text-center py-12 text-grey">
      {{ mensajeVacio[pestana] }}
    </div>

    <div v-if="paginacion.ultima_pagina > 1" class="d-flex justify-center mt-6">
      <v-pagination
        v-model="params.pagina"
        :length="paginacion.ultima_pagina"
        density="comfortable"
        show-first-last-page
        :total-visible="5"
      />
    </div>

    <ModalMotivoCierre v-model:abierto="motivoAbierto" :convocatoria-id="motivoConvocatoriaId" />
  </v-container>
</template>
