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
const descargasAbierto = ref(false)

const pestana = ref<EstadoGrupo>('VIGENTES')

const { items, paginacion, cargando, params, recargar } = useListado<ConvocatoriaPublicaItem>(
  publicoApi.convocatorias,
  { estado_grupo: pestana.value, entidad_id: entidadId.value, ordenar_por: 'fecha_fin', direccion: 'asc' },
)

const subEstadoFiltro = ref<string | null>(null)

watch(pestana, (valor) => {
  subEstadoFiltro.value = null
  params.estado_grupo = valor
  params.estado_codigo = undefined
  params.pagina = 1
  recargar()
})

// Filtro por nombre/número (05C hardening, pedido explícitamente por el
// usuario): se liga directo a `params.buscar` — `useListado` ya debounea
// (400ms) y recarga sola cuando cambia. Antes había un `ref` local con su
// propio debounce de 400ms que, al terminar, asignaba `params.buscar` y
// llamaba `recargar()` manualmente; eso disparaba el debounce interno de
// `useListado` por segunda vez y duplicaba la petición con hasta ~800ms de
// demora total. Mismo patrón que ya usa `UsuariosView.vue` y el resto de
// listados del sistema.
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

// Totales calculados para los badges de las pestañas
const totalVigentes = computed(() => {
  if (!estadisticas.value) return null
  const item = estadisticas.value.convocatorias_por_estado.find(
    (e) => e.codigo === 'PUBLICADA' || e.codigo === 'VIGENTE',
  )
  return item?.total ?? 0
})

const totalEnEvaluacion = computed(() => {
  if (!estadisticas.value) return null
  const item = estadisticas.value.convocatorias_por_estado.find(
    (e) => e.codigo === 'EN_EVALUACION',
  )
  return item?.total ?? 0
})

const totalConcluidas = computed(() => {
  if (!estadisticas.value) return null
  return estadisticas.value.convocatorias_por_estado
    .filter((e) => ['ADJUDICADA', 'DESIERTA', 'CANCELADA'].includes(e.codigo))
    .reduce((acc, curr) => acc + curr.total, 0)
})

const listaTarjetas = computed(() => {
  const getCount = (codes: string[]) => {
    if (!estadisticas.value) return 0
    return estadisticas.value.convocatorias_por_estado
      .filter((e) => codes.includes(e.codigo))
      .reduce((acc, curr) => acc + curr.total, 0)
  }

  return [
    {
      id: 'vigentes',
      label: 'Vigentes',
      total: getCount(['PUBLICADA', 'VIGENTE']),
      color: 'primary',
      icon: 'mdi-bullhorn-outline',
      tab: 'VIGENTES' as EstadoGrupo,
      subEstado: null,
      activo: pestana.value === 'VIGENTES' && !subEstadoFiltro.value,
    },
    {
      id: 'en_evaluacion',
      label: 'En evaluación',
      total: getCount(['EN_EVALUACION']),
      color: 'info',
      icon: 'mdi-clipboard-text-search-outline',
      tab: 'EN_EVALUACION' as EstadoGrupo,
      subEstado: null,
      activo: pestana.value === 'EN_EVALUACION' && !subEstadoFiltro.value,
    },
    {
      id: 'adjudicadas',
      label: 'Adjudicadas',
      total: getCount(['ADJUDICADA']),
      color: 'success',
      icon: 'mdi-check-decagram-outline',
      tab: 'CONCLUIDAS' as EstadoGrupo,
      subEstado: 'ADJUDICADA',
      activo: pestana.value === 'CONCLUIDAS' && subEstadoFiltro.value === 'ADJUDICADA',
    },
    {
      id: 'desiertas',
      label: 'Desiertas',
      total: getCount(['DESIERTA']),
      color: 'warning',
      icon: 'mdi-file-remove-outline',
      tab: 'CONCLUIDAS' as EstadoGrupo,
      subEstado: 'DESIERTA',
      activo: pestana.value === 'CONCLUIDAS' && subEstadoFiltro.value === 'DESIERTA',
    },
    {
      id: 'canceladas',
      label: 'Canceladas',
      total: getCount(['CANCELADA']),
      color: 'error',
      icon: 'mdi-close-circle-outline',
      tab: 'CONCLUIDAS' as EstadoGrupo,
      subEstado: 'CANCELADA',
      activo: pestana.value === 'CONCLUIDAS' && subEstadoFiltro.value === 'CANCELADA',
    },
    {
      id: 'proveedores',
      label: 'Proveedores',
      total: estadisticas.value?.proveedores_participantes ?? 0,
      color: 'secondary',
      icon: 'mdi-account-group-outline',
      tab: null,
      subEstado: null,
      activo: false,
    },
  ]
})

function filtrarPorCard(estadoGrupo: EstadoGrupo, codigo?: string | null) {
  pestana.value = estadoGrupo
  subEstadoFiltro.value = codigo ?? null
  params.estado_grupo = estadoGrupo
  params.estado_codigo = codigo ?? undefined
  params.pagina = 1
  recargar()

  const elemento = document.getElementById('seccion-listado-convocatorias')
  if (elemento) {
    elemento.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Opciones de ordenamiento — cada una con una descripción en lenguaje llano
// (05C hardening, pedido explícitamente por el usuario): "más próximas/
// lejanas" no es un umbral fijo (ej. "menos de 1 hora") sino un orden
// continuo por la fecha y hora exacta de cierre/publicación — el texto ahora
// lo deja explícito para que no se interprete como una categoría con un
// límite de horas/días.
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
  () => !!params.buscar || tipo.value !== null || !!subEstadoFiltro.value || ordenSeleccionado.value !== 'fecha_fin-asc',
)

function limpiarFiltros() {
  tipo.value = null
  ordenSeleccionado.value = 'fecha_fin-asc'
  subEstadoFiltro.value = null
  params.buscar = undefined
  params.tipo = undefined
  params.estado_codigo = undefined
  params.ordenar_por = 'fecha_fin'
  params.direccion = 'asc'
  params.pagina = 1
  recargar()
}

const descripcionPestana: Record<EstadoGrupo, string> = {
  VIGENTES: 'Procesos de adquisición abiertos actualmente recibiendo cotizaciones u ofertas de proveedores.',
  EN_EVALUACION: 'Convocatorias en proceso de evaluación y calificación por los funcionarios de la entidad.',
  CONCLUIDAS: 'Historial de adquisiciones que han finalizado su ciclo: adjudicadas, desiertas o canceladas.',
}

function alReenfocar() {
  if (document.visibilityState === 'visible') recargar()
}
onMounted(() => document.addEventListener('visibilitychange', alReenfocar))
onUnmounted(() => document.removeEventListener('visibilitychange', alReenfocar))
</script>

<template>
  <v-container class="py-8 portal-publico-container">
    <!-- 1. Hero Institucional de la Entidad -->
    <v-card class="pa-6 mb-6 rounded-lg hero-banner" elevation="0">
      <div class="d-flex align-center ga-2 mb-2">
        <v-chip color="primary" variant="flat" size="small" class="font-weight-bold">
          <v-icon icon="mdi-shield-check" size="14" class="mr-1" />
          Portal Oficial de Compras Menores (hasta 8 UIT)
        </v-chip>
      </div>
      <h1 class="text-h4 text-titulo font-weight-bold mb-2">
        {{ entidadNombre || 'Municipalidad Distrital de La Perla' }}
      </h1>
      <p class="text-body-1 text-grey-darken-1 mb-0" style="max-width: 800px">
        Consulta las convocatorias públicas para la contratación de bienes y servicios menores a 8 UIT de la entidad.
        Descargue bases, términos de referencia y postule de manera 100% digital y transparente.
      </p>
    </v-card>

    <!-- 2. Tarjetas de Métricas / Contadores -->
    <template v-if="estadisticas">
      <div class="mb-2 d-flex align-center justify-space-between flex-wrap ga-2">
        <div class="text-subtitle-2 text-uppercase text-grey font-weight-bold d-flex align-center ga-1">
          <v-icon icon="mdi-chart-timeline-variant" size="16" />
          <span>Resumen de Procesos y Participación</span>
        </div>
        <div class="text-caption text-grey">
          Haz clic en cualquier estado para filtrar las convocatorias
        </div>
      </div>

      <v-row class="mb-5" density="comfortable">
        <v-col
          v-for="card in listaTarjetas"
          :key="card.id"
          cols="6"
          sm="4"
          md="2"
        >
          <v-card
            class="pa-3 metrica-card rounded-lg h-100 d-flex flex-column justify-space-between"
            :class="{
              'metrica-card--activa': card.activo,
              'metrica-card--click': !!card.tab,
            }"
            @click="card.tab ? filtrarPorCard(card.tab, card.subEstado) : null"
          >
            <!-- Cabecera de la tarjeta: avatar icono y estado activo -->
            <div class="d-flex align-center justify-space-between mb-2">
              <v-avatar :color="card.color" size="32" variant="tonal" rounded="md">
                <v-icon :icon="card.icon" size="18" />
              </v-avatar>

              <v-chip
                v-if="card.activo"
                size="x-small"
                :color="card.color"
                variant="flat"
                class="font-weight-bold px-1"
                style="height: 18px; font-size: 10px"
              >
                Activo
              </v-chip>
              <v-icon
                v-else-if="card.tab"
                icon="mdi-chevron-right"
                size="15"
                class="text-grey-lighten-1"
              />
            </div>

            <!-- Cuerpo de la tarjeta: Cifra y Nombre -->
            <div>
              <div
                class="text-h5 font-weight-bold font-datos mb-0 lh-tight"
                :class="`text-${card.color}`"
              >
                {{ card.total }}
              </div>
              <div class="text-caption font-weight-bold text-truncate text-grey-darken-1">
                {{ card.label }}
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- 3. Centro de Descargas y Datos Abiertos (Colapsable) -->
      <v-card class="mb-8 rounded-lg descargas-container border" elevation="0">
        <div
          class="pa-4 d-flex flex-column flex-sm-row justify-space-between align-start align-sm-center ga-3 cursor-pointer"
          @click="descargasAbierto = !descargasAbierto"
        >
          <div class="d-flex align-center ga-3">
            <v-avatar color="primary" variant="tonal" size="40" rounded="lg">
              <v-icon icon="mdi-tray-arrow-down" size="22" />
            </v-avatar>
            <div>
              <div class="text-subtitle-1 text-titulo font-weight-bold">
                Descarga de Datos Abiertos y Transparencia
              </div>
              <div class="text-caption text-grey">
                Formatos estándar (.xlsx y .csv) de convocatorias y adjudicaciones públicas.
              </div>
            </div>
          </div>

          <v-btn
            variant="tonal"
            size="small"
            color="primary"
            class="text-none font-weight-medium flex-shrink-0"
            :append-icon="descargasAbierto ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            @click.stop="descargasAbierto = !descargasAbierto"
          >
            {{ descargasAbierto ? 'Ocultar descargas' : 'Ver descargas' }}
          </v-btn>
        </div>

        <v-expand-transition>
          <div v-show="descargasAbierto" class="px-5 pb-5 pt-1 border-t">
            <v-row density="comfortable" class="mt-1">
              <!-- Bloque Convocatorias -->
              <v-col cols="12" md="6">
                <div class="descarga-grupo-card pa-4 rounded-lg h-100 border">
                  <div class="d-flex align-center ga-2 mb-2">
                    <v-icon icon="mdi-file-document-multiple-outline" color="primary" size="20" />
                    <span class="text-subtitle-2 font-weight-bold">Procesos de Convocatoria</span>
                  </div>
                  <p class="text-caption text-grey mb-3">
                    Listado de bases, requerimientos, fechas límites de postulación y estado actual de cada proceso.
                  </p>
                  <div class="d-flex flex-wrap ga-2">
                    <v-btn
                      variant="tonal"
                      color="success"
                      size="small"
                      prepend-icon="mdi-file-excel-box"
                      :loading="descargando"
                      :disabled="bloqueado"
                      class="font-weight-medium"
                      @click="descargar(datosAbiertosApi.convocatoriasXlsxUrl(entidadId), 'convocatorias.xlsx')"
                    >
                      Excel (.xlsx)
                    </v-btn>
                    <v-btn
                      variant="tonal"
                      color="primary"
                      size="small"
                      prepend-icon="mdi-file-delimited"
                      :loading="descargando"
                      :disabled="bloqueado"
                      class="font-weight-medium"
                      @click="descargar(datosAbiertosApi.convocatoriasCsvUrl(entidadId), 'convocatorias.csv')"
                    >
                      CSV (.csv)
                    </v-btn>
                  </div>
                </div>
              </v-col>

              <!-- Bloque Adjudicaciones -->
              <v-col cols="12" md="6">
                <div class="descarga-grupo-card pa-4 rounded-lg h-100 border">
                  <div class="d-flex align-center ga-2 mb-2">
                    <v-icon icon="mdi-trophy-outline" color="warning" size="20" />
                    <span class="text-subtitle-2 font-weight-bold">Adjudicaciones y Resultados</span>
                  </div>
                  <p class="text-caption text-grey mb-3">
                    Resultados definitivos, proveedores ganadores, actas y montos contratados por la entidad.
                  </p>
                  <div class="d-flex flex-wrap ga-2">
                    <v-btn
                      variant="tonal"
                      color="success"
                      size="small"
                      prepend-icon="mdi-file-excel-box"
                      :loading="descargando"
                      :disabled="bloqueado"
                      class="font-weight-medium"
                      @click="descargar(datosAbiertosApi.adjudicacionesXlsxUrl(entidadId), 'adjudicaciones.xlsx')"
                    >
                      Excel (.xlsx)
                    </v-btn>
                    <v-btn
                      variant="tonal"
                      color="primary"
                      size="small"
                      prepend-icon="mdi-file-delimited"
                      :loading="descargando"
                      :disabled="bloqueado"
                      class="font-weight-medium"
                      @click="descargar(datosAbiertosApi.adjudicacionesCsvUrl(entidadId), 'adjudicaciones.csv')"
                    >
                      CSV (.csv)
                    </v-btn>
                  </div>
                </div>
              </v-col>
            </v-row>
          </div>
        </v-expand-transition>
      </v-card>
    </template>

    <!-- 4. Pestañas de Estado con Contadores (Centradas y Grandes) -->
    <div id="seccion-listado-convocatorias" class="mb-4" />
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
            v-if="totalVigentes !== null"
            size="small"
            class="ml-2 font-datos font-weight-bold"
            :color="pestana === 'VIGENTES' ? 'primary' : 'grey'"
            :variant="pestana === 'VIGENTES' ? 'flat' : 'tonal'"
          >
            {{ totalVigentes }}
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
            v-if="totalEnEvaluacion !== null"
            size="small"
            class="ml-2 font-datos font-weight-bold"
            :color="pestana === 'EN_EVALUACION' ? 'info' : 'grey'"
            :variant="pestana === 'EN_EVALUACION' ? 'flat' : 'tonal'"
          >
            {{ totalEnEvaluacion }}
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
            v-if="totalConcluidas !== null"
            size="small"
            class="ml-2 font-datos font-weight-bold"
            :color="pestana === 'CONCLUIDAS' ? 'success' : 'grey'"
            :variant="pestana === 'CONCLUIDAS' ? 'flat' : 'tonal'"
          >
            {{ totalConcluidas }}
          </v-chip>
        </v-tab>
      </v-tabs>
    </div>

    <!-- 5. Barra de Filtros Avanzada -->
    <v-card class="pa-4 mb-6 rounded-lg border bg-surface" elevation="0">
      <!-- Explicación de la pestaña activa y sub-filtro -->
      <div class="text-caption text-grey mb-3 d-flex align-center justify-space-between flex-wrap ga-2">
        <div class="d-flex align-center ga-1">
          <v-icon icon="mdi-information-outline" size="14" color="primary" />
          <span>{{ descripcionPestana[pestana] }}</span>
        </div>
        <v-chip
          v-if="subEstadoFiltro"
          size="small"
          color="primary"
          variant="tonal"
          closable
          class="font-weight-medium"
          @click:close="filtrarPorCard(pestana, null)"
        >
          Filtrando por estado: <strong>{{ subEstadoFiltro }}</strong>
        </v-chip>
      </div>

      <v-row density="compact" align="center">
        <!-- Búsqueda por texto libre -->
        <v-col cols="12" md="5">
          <v-text-field
            v-model="params.buscar"
            placeholder="Buscar por código (ej: CONV-2026-001) o descripción del requerimiento..."
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            density="compact"
          />
        </v-col>

        <!-- Filtro por Tipo (Bien / Servicio) -->
        <v-col cols="12" sm="6" md="4" class="d-flex align-center ga-2">
          <span class="text-caption font-weight-bold text-grey text-no-wrap">Tipo:</span>
          <v-btn-toggle
            density="compact"
            variant="outlined"
            divided
            class="flex-grow-1"
          >
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

        <!-- Ordenamiento -->
        <v-col cols="12" sm="6" md="3">
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

    <!-- 6. Listado de Convocatorias -->
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

    <!-- 7. Paginación -->
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

    <!-- Modal de motivo de cierre -->
    <ModalMotivoCierre v-model:abierto="motivoAbierto" :convocatoria-id="motivoConvocatoriaId" />
  </v-container>
</template>

<style scoped>
.hero-banner {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05) 0%, rgba(var(--v-theme-secondary), 0.03) 100%);
  border: 1px solid rgba(var(--v-border-color), 0.8);
}

.cursor-pointer {
  cursor: pointer;
}

.metrica-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
  border: 1px solid rgba(var(--v-border-color), 0.8);
  background: rgb(var(--v-theme-surface));
  cursor: pointer;
}

.metrica-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--sombra-2);
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.metrica-card--activa {
  border-color: rgb(var(--v-theme-primary)) !important;
  background: rgba(var(--v-theme-primary), 0.04) !important;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.25), var(--sombra-1) !important;
}

.descargas-container {
  background: rgb(var(--v-theme-surface));
  transition: border-color 0.2s ease;
}

.descarga-grupo-card {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border-color: rgba(var(--v-border-color), 0.6) !important;
  transition: border-color 0.2s ease;
}

.descarga-grupo-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.4) !important;
}

.pestanas-estado {
  background: rgb(var(--v-theme-surface));
  box-shadow: var(--sombra-1);
}

.tab-boton {
  border-radius: 9999px !important;
  margin: 2px 4px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Pestaña activa (05C hardening, pedido explícitamente por el usuario): antes
   la única señal de "activo" era la barra inferior de v-tabs, que se recortaba
   contra el contenedor. Se reemplaza por un fondo tenue de todo el botón
   (coherente con el color de cada pestaña) — el chip de contador sigue
   notándose porque usa "flat" (sólido) contra este fondo tenue, no sólido. */
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
