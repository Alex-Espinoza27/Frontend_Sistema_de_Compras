<script setup lang="ts">
// D1/D3 — Ver Convocatorias / Mis Postulaciones (05C hardening, pedido
// explícitamente por el usuario): antes eran una sola pantalla con pestañas
// internas (TabsOfertas) y "Mis postulaciones" era una tabla plana distinta.
// Ahora son 2 módulos separados del sidebar que comparten esta misma
// estructura (3 tabs de estado + filtros) — la única diferencia es `mias`:
// `false` lista todas las convocatorias, `true` solo las que el proveedor ya
// postuló (`PublicoController::convocatorias`, filtro `mias`).
//
// 05C hardening (pedido explícitamente por el usuario): se porta aquí el
// mismo diseño de pestañas con contador + barra de filtros avanzada que ya
// se validó en `ConvocatoriasEntidadView.vue` (portal público) — antes esta
// pantalla tenía tabs planos sin contador y solo buscador + tipo + entidad,
// sin "Ordenar por" ni mensaje de resultados/limpiar filtros.
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

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

// Tipo (Bien/Servicio) — se liga directo a `params.buscar` para el texto
// libre (ver nota en `ConvocatoriasEntidadView.vue`: `useListado` ya
// debounea 400ms y recarga sola, un `ref` local duplicaba la espera).
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
  cargarTotales()
})
function alCambiarEntidad() {
  params.entidad_id = entidadId.value ?? undefined
  params.pagina = 1
  recargar()
  cargarTotales()
}

// Contadores de las pestañas (05C hardening, pedido explícitamente por el
// usuario): no existe un endpoint de estadísticas acotado por `mias`, así
// que se piden 3 totales livianos (`por_pagina=1`, solo se lee
// `paginacion.total`) contra el mismo endpoint del listado — así el contador
// siempre coincide exactamente con lo que realmente se lista en cada tab.
const totales = reactive<Record<EstadoGrupo, number | null>>({
  VIGENTES: null,
  EN_EVALUACION: null,
  CONCLUIDAS: null,
})
async function cargarTotales() {
  const grupos: EstadoGrupo[] = ['VIGENTES', 'EN_EVALUACION', 'CONCLUIDAS']
  await Promise.all(
    grupos.map(async (grupo) => {
      const respuesta = await publicoApi.convocatorias({
        estado_grupo: grupo,
        mias: props.mias,
        entidad_id: entidadId.value ?? undefined,
        pagina: 1,
        por_pagina: 1,
      })
      totales[grupo] = respuesta.paginacion.total
    }),
  )
}

const mensajeVacio: Record<EstadoGrupo, string> = {
  VIGENTES: props.mias ? 'No tienes postulaciones vigentes.' : 'No hay convocatorias vigentes por el momento.',
  EN_EVALUACION: props.mias ? 'No tienes postulaciones en evaluación.' : 'No hay convocatorias en evaluación por el momento.',
  CONCLUIDAS: props.mias ? 'No tienes postulaciones concluidas.' : 'Todavía no hay convocatorias concluidas.',
}

const descripcionPestana: Record<EstadoGrupo, string> = {
  VIGENTES: 'Procesos de adquisición abiertos actualmente recibiendo cotizaciones u ofertas de proveedores.',
  EN_EVALUACION: 'Convocatorias en proceso de evaluación y calificación por los funcionarios de la entidad.',
  CONCLUIDAS: 'Historial de adquisiciones que han finalizado su ciclo: adjudicadas, desiertas o canceladas.',
}

const motivoAbierto = ref(false)
const motivoConvocatoriaId = ref<number | null>(null)
function verMotivo(id: number) {
  motivoConvocatoriaId.value = id
  motivoAbierto.value = true
}

// Opciones de ordenamiento — mismo criterio y mismas descripciones que
// `ConvocatoriasEntidadView.vue`: es un orden continuo por fecha/hora exacta,
// no un umbral fijo (ej. "menos de 1 hora").
const ordenSeleccionado = ref('fecha_fin-asc')
const opcionesOrden = [
  {
    title: 'Vencimiento: Más próximos',
    subtitulo: 'Ordena por la fecha y hora exacta de cierre: la que tiene menos tiempo restante para postular aparece primero (sin importar si faltan minutos, horas o días — no hay un límite fijo).',
    value: 'fecha_fin-asc',
    ordenar_por: 'fecha_fin',
    direccion: 'asc',
  },
  {
    title: 'Vencimiento: Más lejanos',
    subtitulo: 'Mismo criterio de fecha y hora de cierre, en orden inverso: la que tiene más tiempo restante para postular aparece primero.',
    value: 'fecha_fin-desc',
    ordenar_por: 'fecha_fin',
    direccion: 'desc',
  },
  {
    title: 'Publicación: Más reciente',
    subtitulo: 'Ordena por la fecha y hora exacta en que se publicó: la convocatoria publicada más recientemente aparece primero.',
    value: 'fecha_inicio-desc',
    ordenar_por: 'fecha_inicio',
    direccion: 'desc',
  },
  {
    title: 'Número de convocatoria',
    subtitulo: 'Ordena por el código de la convocatoria (ej. CONV-2026-001), de mayor a menor.',
    value: 'numero-desc',
    ordenar_por: 'numero',
    direccion: 'desc',
  },
]

const subtituloOrdenActual = computed(
  () => opcionesOrden.find((o) => o.value === ordenSeleccionado.value)?.subtitulo ?? '',
)

function alCambiarOrden(valor: string) {
  ordenSeleccionado.value = valor
  const opcion = opcionesOrden.find((o) => o.value === valor)
  if (opcion) {
    params.ordenar_por = opcion.ordenar_por
    params.direccion = opcion.direccion as 'asc' | 'desc'
    params.pagina = 1
    recargar()
  }
}

const tieneFiltrosActivos = computed(
  () => !!params.buscar || tipo.value !== null || ordenSeleccionado.value !== 'fecha_fin-asc',
)

function limpiarFiltros() {
  tipo.value = null
  ordenSeleccionado.value = 'fecha_fin-asc'
  params.buscar = undefined
  params.tipo = undefined
  params.ordenar_por = 'fecha_fin'
  params.direccion = 'asc'
  params.pagina = 1
  recargar()
}

function alReenfocar() {
  if (document.visibilityState === 'visible') {
    recargar()
    cargarTotales()
  }
}
onMounted(() => document.addEventListener('visibilitychange', alReenfocar))
onUnmounted(() => document.removeEventListener('visibilitychange', alReenfocar))
</script>

<template>
  <v-container class="py-8">
    <div class="text-h5 text-titulo mb-1">{{ titulo }}</div>
    <div class="text-body-2 text-grey mb-6">{{ subtitulo }}</div>

    <!-- Pestañas de Estado con Contadores -->
    <div class="d-flex justify-center mb-6">
      <v-tabs
        v-model="pestana"
        color="primary"
        align-tabs="center"
        height="56"
        hide-slider
        class="pestanas-estado rounded-xl border bg-surface px-2 py-1"
      >
        <v-tab
          value="VIGENTES"
          class="tab-boton px-5 py-2 text-none"
          :class="{ 'tab-boton--activo-primary': pestana === 'VIGENTES' }"
        >
          <v-icon icon="mdi-bullhorn-outline" size="20" class="mr-2" />
          <span class="tab-titulo font-weight-bold">Vigentes</span>
          <v-chip
            v-if="totales.VIGENTES !== null"
            size="small"
            class="ml-2 font-datos font-weight-bold"
            :color="pestana === 'VIGENTES' ? 'primary' : 'grey'"
            :variant="pestana === 'VIGENTES' ? 'flat' : 'tonal'"
          >
            {{ totales.VIGENTES }}
          </v-chip>
        </v-tab>

        <v-tab
          value="EN_EVALUACION"
          class="tab-boton px-5 py-2 text-none"
          :class="{ 'tab-boton--activo-info': pestana === 'EN_EVALUACION' }"
        >
          <v-icon icon="mdi-clipboard-text-search-outline" size="20" class="mr-2" />
          <span class="tab-titulo font-weight-bold">En evaluación</span>
          <v-chip
            v-if="totales.EN_EVALUACION !== null"
            size="small"
            class="ml-2 font-datos font-weight-bold"
            :color="pestana === 'EN_EVALUACION' ? 'info' : 'grey'"
            :variant="pestana === 'EN_EVALUACION' ? 'flat' : 'tonal'"
          >
            {{ totales.EN_EVALUACION }}
          </v-chip>
        </v-tab>

        <v-tab
          value="CONCLUIDAS"
          class="tab-boton px-5 py-2 text-none"
          :class="{ 'tab-boton--activo-success': pestana === 'CONCLUIDAS' }"
        >
          <v-icon icon="mdi-archive-check-outline" size="20" class="mr-2" />
          <span class="tab-titulo font-weight-bold">Concluidas</span>
          <v-chip
            v-if="totales.CONCLUIDAS !== null"
            size="small"
            class="ml-2 font-datos font-weight-bold"
            :color="pestana === 'CONCLUIDAS' ? 'success' : 'grey'"
            :variant="pestana === 'CONCLUIDAS' ? 'flat' : 'tonal'"
          >
            {{ totales.CONCLUIDAS }}
          </v-chip>
        </v-tab>
      </v-tabs>
    </div>

    <!-- Barra de Filtros Avanzada -->
    <v-card class="pa-4 mb-6 rounded-lg border bg-surface" elevation="0">
      <div class="text-caption text-grey mb-3 d-flex align-center ga-1">
        <v-icon icon="mdi-information-outline" size="14" color="primary" />
        <span>{{ descripcionPestana[pestana] }}</span>
      </div>

      <v-row density="compact" align="center">
        <!-- Búsqueda por texto libre -->
        <v-col cols="12" md="5">
          <v-text-field
            v-model="params.buscar"
            placeholder="Buscar por código (ej: CONV-2026-001) o nombre del servicio..."
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            density="compact"
          />
        </v-col>

        <!-- Filtro por Tipo (Bien / Servicio) -->
        <v-col cols="12" sm="6" :md="mostrarSelectorEntidad ? 3 : 4" class="d-flex align-center ga-2">
          <span class="text-caption font-weight-bold text-grey text-no-wrap">Tipo:</span>
          <v-btn-toggle density="compact" variant="outlined" divided class="flex-grow-1">
            <v-btn
              :color="tipo === null ? 'secondary' : undefined"
              :variant="tipo === null ? 'flat' : 'outlined'"
              size="small"
              class="text-none flex-grow-1"
              @click="elegirTipo(null)"
            >
              <v-icon icon="mdi-all-inclusive" size="15" class="mr-1" />
              Todos
            </v-btn>
            <v-btn
              :color="tipo === 'BIEN' ? 'accent' : undefined"
              :variant="tipo === 'BIEN' ? 'flat' : 'outlined'"
              size="small"
              class="text-none flex-grow-1"
              @click="elegirTipo('BIEN')"
            >
              <v-icon icon="mdi-package-variant-closed" size="15" class="mr-1" />
              Bienes
            </v-btn>
            <v-btn
              :color="tipo === 'SERVICIO' ? 'primary' : undefined"
              :variant="tipo === 'SERVICIO' ? 'flat' : 'outlined'"
              size="small"
              class="text-none flex-grow-1"
              @click="elegirTipo('SERVICIO')"
            >
              <v-icon icon="mdi-account-wrench-outline" size="15" class="mr-1" />
              Servicios
            </v-btn>
          </v-btn-toggle>
        </v-col>

        <!-- Entidad (solo si hay más de una registrada) -->
        <v-col v-if="mostrarSelectorEntidad" cols="12" sm="6" md="2">
          <v-select
            v-model="entidadId"
            :items="entidades.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
            label="Entidad"
            prepend-inner-icon="mdi-city-variant-outline"
            clearable
            density="compact"
            hide-details
            @update:model-value="alCambiarEntidad"
          />
        </v-col>

        <!-- Ordenamiento -->
        <v-col cols="12" sm="6" :md="mostrarSelectorEntidad ? 2 : 3">
          <v-select
            v-model="ordenSeleccionado"
            :items="opcionesOrden"
            label="Ordenar por"
            prepend-inner-icon="mdi-sort-variant"
            density="compact"
            hide-details
            @update:model-value="alCambiarOrden"
          >
            <template #item="{ item, props: itemProps }">
              <v-list-item v-bind="itemProps" :title="item.raw.title" :subtitle="item.raw.subtitulo" lines="two" />
            </template>
          </v-select>
          <div class="text-caption text-grey mt-1">{{ subtituloOrdenActual }}</div>
        </v-col>
      </v-row>

      <!-- Línea inferior de resultados y botón de limpiar filtros -->
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mt-3 pt-2 border-t">
        <div class="text-caption text-grey">
          Mostrando <strong class="text-titulo">{{ items.length }}</strong> de
          <strong class="text-titulo">{{ paginacion.total }}</strong> convocatorias encontradas
        </div>

        <v-btn
          v-if="tieneFiltrosActivos"
          variant="text"
          color="error"
          size="small"
          density="compact"
          prepend-icon="mdi-filter-off-outline"
          class="text-none"
          @click="limpiarFiltros"
        >
          Limpiar filtros
        </v-btn>
      </div>
    </v-card>

    <v-progress-linear v-if="cargando" indeterminate color="primary" class="mb-4" />

    <v-row v-if="items.length">
      <v-col v-for="convocatoria in items" :key="convocatoria.convocatoria_id" cols="12">
        <CardConvocatoria :convocatoria="convocatoria" @ver-motivo="verMotivo" />
      </v-col>
    </v-row>

    <!-- Estado Vacío -->
    <v-card v-else-if="!cargando" class="pa-12 text-center rounded-lg border bg-surface" elevation="0">
      <v-avatar color="primary" variant="tonal" size="64" class="mb-4">
        <v-icon icon="mdi-folder-search-outline" size="36" />
      </v-avatar>
      <div class="text-h6 text-titulo font-weight-bold mb-1">No se encontraron convocatorias</div>
      <div class="text-body-2 text-grey mb-4" style="max-width: 480px; margin: 0 auto">
        {{ mensajeVacio[pestana] }}
      </div>
      <v-btn
        v-if="tieneFiltrosActivos"
        variant="outlined"
        color="primary"
        size="small"
        prepend-icon="mdi-filter-off-outline"
        @click="limpiarFiltros"
      >
        Restablecer filtros
      </v-btn>
    </v-card>

    <div v-if="paginacion.ultima_pagina > 1" class="d-flex justify-center mt-8">
      <v-pagination
        v-model="params.pagina"
        :length="paginacion.ultima_pagina"
        density="comfortable"
        show-first-last-page
        :total-visible="5"
        rounded="lg"
        color="primary"
        active-color="primary"
        class="paginacion-custom"
      />
    </div>

    <ModalMotivoCierre v-model:abierto="motivoAbierto" :convocatoria-id="motivoConvocatoriaId" />
  </v-container>
</template>

<style scoped>
.pestanas-estado {
  background: rgb(var(--v-theme-surface));
  box-shadow: var(--sombra-1);
}

.tab-boton {
  border-radius: 9999px !important;
  margin: 2px 4px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Pestaña activa: fondo tenue coherente con el color de cada pestaña en vez
   de la barra inferior de v-tabs (mismo criterio que ConvocatoriasEntidadView.vue). */
.tab-boton--activo-primary {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary)) !important;
}
.tab-boton--activo-info {
  background: rgba(var(--v-theme-info), 0.12);
  color: rgb(var(--v-theme-info)) !important;
}
.tab-boton--activo-success {
  background: rgba(var(--v-theme-success), 0.12);
  color: rgb(var(--v-theme-success)) !important;
}

.tab-titulo {
  font-size: 1rem;
  letter-spacing: 0.2px;
}

.paginacion-custom :deep(.v-pagination__item--is-active .v-btn) {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
  font-weight: 700 !important;
}
</style>
