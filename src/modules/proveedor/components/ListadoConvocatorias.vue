<script setup lang="ts">
// D1/D3 — Ver Convocatorias / Mis Postulaciones (05C hardening, pedido
// explícitamente por el usuario): antes eran una sola pantalla con pestañas
// internas (TabsOfertas) y "Mis postulaciones" era una tabla plana distinta.
// Ahora son 2 módulos separados del sidebar que comparten esta misma
// estructura (3 tabs de estado + filtros) — la única diferencia es `mias`:
// `false` lista todas las convocatorias, `true` solo las que el proveedor ya
// postuló (`PublicoController::convocatorias`, filtro `mias`).
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { publicoApi } from '@/api/publico.api'
import { useListado } from '@/composables/useListado'
import CardConvocatoria from '@/modules/publico/components/CardConvocatoria.vue'
import ModalMotivoCierre from '@/modules/publico/components/ModalMotivoCierre.vue'
import type { ConvocatoriaPublicaItem, EntidadPublica, EstadoGrupo, TipoConvocatoria } from '@/modules/publico/publico.types'

const props = defineProps<{ mias: boolean; titulo: string; subtitulo: string }>()

const pestana = ref<EstadoGrupo>('VIGENTES')

const { items, paginacion, cargando, params, recargar } = useListado<ConvocatoriaPublicaItem>(
  publicoApi.convocatorias,
  { estado_grupo: pestana.value, mias: props.mias, ordenar_por: 'fecha_fin', direccion: 'asc' },
)

watch(pestana, (valor) => {
  params.estado_grupo = valor
  params.pagina = 1
  recargar()
})

// --- Filtros: buscar por nombre + tipo (bien/servicio) + entidad ------------
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

// Entidad preseleccionada cuando solo hay una registrada en la plataforma
// (05C hardening): evita el paso extra de elegir entidad cuando no hay nada
// que elegir; si hay varias, sí se muestra el selector, sin preseleccionar.
const entidades = ref<EntidadPublica[]>([])
const entidadId = ref<number | null>(null)
const mostrarSelectorEntidad = computed(() => entidades.value.length > 1)
onMounted(async () => {
  const data = await publicoApi.entidades()
  entidades.value = data.items
  if (data.items.length === 1) {
    entidadId.value = data.items[0].entidad_id
    params.entidad_id = entidadId.value
    recargar()
  }
})
function alCambiarEntidad() {
  params.entidad_id = entidadId.value ?? undefined
  params.pagina = 1
  recargar()
}

const mensajeVacio: Record<EstadoGrupo, string> = {
  VIGENTES: props.mias ? 'No tienes postulaciones vigentes.' : 'No hay convocatorias vigentes por el momento.',
  EN_EVALUACION: props.mias ? 'No tienes postulaciones en evaluación.' : 'No hay convocatorias en evaluación por el momento.',
  CONCLUIDAS: props.mias ? 'No tienes postulaciones concluidas.' : 'Todavía no hay convocatorias concluidas.',
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
    <div class="text-h5 text-titulo mb-1">{{ titulo }}</div>
    <div class="text-body-2 text-grey mb-6">{{ subtitulo }}</div>

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
      <v-select
        v-if="mostrarSelectorEntidad"
        v-model="entidadId"
        :items="entidades.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
        label="Entidad"
        clearable
        style="max-width: 260px"
        hide-details
        @update:model-value="alCambiarEntidad"
      />
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
