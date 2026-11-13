<script setup lang="ts">
// J1 — Dashboard (05B). No se cachea de más (el backend manda
// Cache-Control corto, y aquí se refresca al re-enfocar la pestaña, igual
// que el portal público — los datos cambian solos por el scheduler).
// 05C hardening: el backend ahora responde una forma distinta según
// `contexto` — ENTIDAD_ADMIN (entidad propia, o general/filtrada para
// admin-auditor) vs PROVEEDOR (solo sus propias ofertas) — así que esta
// vista rama por ese campo en vez de asumir un único set de tarjetas/gráficos.
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { useTheme } from 'vuetify'

import { dashboardApi } from '@/api/dashboard.api'
import { entidadesApi } from '@/api/entidades.api'
import BaseRangoFechas from '@/components/base/BaseRangoFechas.vue'
import type { DashboardDatos } from '@/modules/transversales/transversales.types'
import type { EntidadListaItem } from '@/modules/muni/muni.types'
import { useAuthStore } from '@/stores/auth.store'

ChartJS.register(BarElement, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)

const theme = useTheme()
const auth = useAuthStore()
const esAdmin = computed(() => auth.usuario?.rol === 'ADMINISTRADOR')
const entidadAsignada = computed(() => (auth.perfil?.tipo === 'ENTIDAD' ? auth.perfil.entidad : null))

// Solo el ADMINISTRADOR puede seleccionar o cambiar entre entidades (o ver consolidado general).
// Para los demás usuarios (ej. ENTIDAD), se asigna por defecto su propia entidad registrada.
const entidadIdPorDefecto = esAdmin.value ? null : (entidadAsignada.value?.entidad_id ?? null)
const filtros = reactive({
  desde: '',
  hasta: '',
  entidad_id: entidadIdPorDefecto as number | null,
})

const entidades = ref<EntidadListaItem[]>([])
if (esAdmin.value) {
  entidadesApi.index({ ordenar_por: 'razon_social', por_pagina: 100 }).then((data) => (entidades.value = data.items))
}

const datos = ref<DashboardDatos | null>(null)
const cargando = ref(true)
async function cargar() {
  cargando.value = true
  try {
    const entidadId = esAdmin.value
      ? (filtros.entidad_id ?? undefined)
      : (entidadAsignada.value?.entidad_id ?? undefined)

    datos.value = await dashboardApi.obtener({
      desde: filtros.desde || undefined,
      hasta: filtros.hasta || undefined,
      entidad_id: entidadId,
    })
  } finally {
    cargando.value = false
  }
}
cargar()

function alReenfocar() {
  if (document.visibilityState === 'visible') cargar()
}
onMounted(() => document.addEventListener('visibilitychange', alReenfocar))
onUnmounted(() => document.removeEventListener('visibilitychange', alReenfocar))

// Colores leídos del tema activo (no hardcodeados): así los gráficos usan los
// colores correctos tanto en claro como en oscuro (05D: nada de color fuera
// del tema). `nombre` son claves semánticas del tema (primary/success/...),
// las mismas que ya usa BaseChipEstado para ESTA_COLOR.
function colorTema(nombre: string): string {
  const colores = theme.current.value.colors as Record<string, string>
  return colores[nombre] ?? colores.primary
}

function hexConOpacidad(hex: string, alpha: number): string {
  if (!hex) return hex
  const c = hex.replace('#', '')
  if (c.length === 6) {
    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return hex
}

function formatearNumero(val: number | string): string {
  const num = Number(val)
  if (isNaN(num)) return String(val)
  return new Intl.NumberFormat('es-PE').format(num)
}

function formatearMoneda(val: number | string): string {
  const num = Number(val)
  if (isNaN(num)) return 'S/ 0.00'
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

// Estilos globales de Chart.js basados en el tema
const textColor = computed(() => (theme.current.value.dark ? '#93A6B8' : '#64748B'))
const gridColor = computed(() => (theme.current.value.dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)'))

const tooltipsComunes = computed(() => ({
  backgroundColor: theme.current.value.dark ? '#1E293B' : '#0F2438',
  titleColor: '#FFFFFF',
  bodyColor: '#E2E8F0',
  borderColor: theme.current.value.dark ? '#334155' : 'rgba(255, 255, 255, 0.12)',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
  boxPadding: 6,
  usePointStyle: true,
  titleFont: { family: 'Nunito', weight: 'bold' as const, size: 13 },
  bodyFont: { family: 'Nunito', size: 12 },
}))

const escalasEstandar = computed(() => ({
  x: {
    grid: { display: false, drawBorder: false },
    ticks: { color: textColor.value, font: { family: 'Nunito', size: 11 } },
  },
  y: {
    grid: { color: gridColor.value, drawBorder: false },
    ticks: { color: textColor.value, font: { family: 'Nunito', size: 11 } },
  },
}))

const opcionesDoughnut = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 14,
        color: textColor.value,
        font: { family: 'Nunito', size: 12 },
      },
    },
    tooltip: {
      ...tooltipsComunes.value,
      callbacks: {
        label: (context: any) => {
          const label = context.label || ''
          const val = context.raw || 0
          const total = (context.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0)
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0'
          return ` ${label}: ${val} (${pct}%)`
        },
      },
    },
  },
}))

const opcionesLineas = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
      align: 'end' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 12,
        color: textColor.value,
        font: { family: 'Nunito', size: 12 },
      },
    },
    tooltip: tooltipsComunes.value,
  },
  scales: escalasEstandar.value,
}))

const opcionesLineasMoneda = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltipsComunes.value,
      callbacks: {
        label: (context: any) => ` Monto: ${formatearMoneda(context.raw)}`,
      },
    },
  },
  scales: {
    x: escalasEstandar.value.x,
    y: {
      ...escalasEstandar.value.y,
      ticks: {
        color: textColor.value,
        font: { family: 'Nunito', size: 11 },
        callback: (value: any) => {
          const num = Number(value)
          if (num >= 1000000) return `S/ ${(num / 1000000).toFixed(1)}M`
          if (num >= 1000) return `S/ ${(num / 1000).toFixed(0)}k`
          return `S/ ${num}`
        },
      },
    },
  },
}))

const opcionesBarras = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: tooltipsComunes.value,
  },
  scales: escalasEstandar.value,
}))

const opcionesBarrasHorizontales = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { display: false },
    tooltip: tooltipsComunes.value,
  },
  scales: {
    x: {
      grid: { color: gridColor.value, drawBorder: false },
      ticks: { color: textColor.value, font: { family: 'Nunito', size: 11 } },
    },
    y: {
      grid: { display: false, drawBorder: false },
      ticks: { color: textColor.value, font: { family: 'Nunito', size: 11 } },
    },
  },
}))

const opcionesApiladas = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      align: 'end' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 12,
        color: textColor.value,
        font: { family: 'Nunito', size: 12 },
      },
    },
    tooltip: tooltipsComunes.value,
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false, drawBorder: false },
      ticks: { color: textColor.value, font: { family: 'Nunito', size: 11 } },
    },
    y: {
      stacked: true,
      grid: { color: gridColor.value, drawBorder: false },
      ticks: { color: textColor.value, font: { family: 'Nunito', size: 11 } },
    },
  },
}))

// --- Vista ENTIDAD/ADMIN/AUDITOR --------------------------------------------
const datosEntidad = computed(() => (datos.value?.contexto === 'ENTIDAD_ADMIN' ? datos.value : null))

const tarjetasEntidadFila1 = computed(() => [
  {
    titulo: 'Convocatorias vigentes',
    valor: datosEntidad.value?.convocatorias_vigentes ?? 0,
    icono: 'mdi-bullhorn-outline',
    color: 'primary',
    subtitulo: 'En etapa de postulación activa',
    esMoneda: false,
    destacada: false,
  },
  {
    titulo: 'En evaluación',
    valor: datosEntidad.value?.convocatorias_en_evaluacion ?? 0,
    icono: 'mdi-clipboard-text-search-outline',
    color: 'info',
    subtitulo: 'Revisión técnica y logística',
    esMoneda: false,
    destacada: false,
  },
  {
    titulo: 'Procesos adjudicados',
    valor: datosEntidad.value?.procesos_adjudicados ?? 0,
    icono: 'mdi-check-decagram-outline',
    color: 'success',
    subtitulo: 'Buena pro otorgada y consentida',
    esMoneda: false,
    destacada: false,
  },
  {
    titulo: 'Procesos desiertos',
    valor: datosEntidad.value?.procesos_desiertos ?? 0,
    icono: 'mdi-alert-circle-outline',
    color: 'warning',
    subtitulo: 'Sin ofertas válidas en plazo',
    esMoneda: false,
    destacada: false,
  },
])

const tarjetasEntidadFila2 = computed(() => [
  {
    titulo: 'Procesos cancelados',
    valor: datosEntidad.value?.procesos_cancelados ?? 0,
    icono: 'mdi-close-octagon-outline',
    color: 'error',
    subtitulo: 'Convocatorias dadas de baja',
    esMoneda: false,
    destacada: false,
    colsMd: 3,
  },
  {
    titulo: 'Proveedores participantes',
    valor: datosEntidad.value?.proveedores_participantes ?? 0,
    icono: 'mdi-account-group-outline',
    color: 'accent',
    subtitulo: 'Empresas y postores registrados',
    esMoneda: false,
    destacada: false,
    colsMd: 3,
  },
  {
    titulo: 'Monto total adjudicado',
    valor: datosEntidad.value?.monto_total_adjudicado ?? 0,
    icono: 'mdi-cash-multiple',
    color: 'primary',
    subtitulo: 'Presupuesto total contratado en el periodo',
    esMoneda: true,
    destacada: true,
    colsMd: 6,
  },
])

const totalConvocatoriasEstado = computed(() => {
  if (!datosEntidad.value?.convocatorias_por_estado) return 0
  return datosEntidad.value.convocatorias_por_estado.reduce((acc, curr) => acc + curr.cantidad, 0)
})

const graficoEstados = computed(() => ({
  labels: datosEntidad.value?.convocatorias_por_estado.map((e) => e.nombre) ?? [],
  datasets: [
    {
      data: datosEntidad.value?.convocatorias_por_estado.map((e) => e.cantidad) ?? [],
      backgroundColor: datosEntidad.value?.convocatorias_por_estado.map((e) => colorTema(e.color)) ?? [],
      borderRadius: 6,
      spacing: 3,
      borderWidth: 0,
    },
  ],
}))

const graficoConvocatoriasPorMes = computed(() => ({
  labels: datosEntidad.value?.convocatorias_por_mes.map((m) => m.mes) ?? [],
  datasets: [
    {
      label: 'Presentadas',
      borderColor: colorTema('success'),
      backgroundColor: hexConOpacidad(colorTema('success'), 0.15),
      data: datosEntidad.value?.convocatorias_por_mes.map((m) => m.presentadas) ?? [],
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#FFFFFF',
      pointBorderWidth: 2,
    },
    {
      label: 'En evaluación',
      borderColor: colorTema('info'),
      backgroundColor: hexConOpacidad(colorTema('info'), 0.15),
      data: datosEntidad.value?.convocatorias_por_mes.map((m) => m.en_evaluacion) ?? [],
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#FFFFFF',
      pointBorderWidth: 2,
    },
    {
      label: 'Concluidas',
      borderColor: colorTema('accent'),
      backgroundColor: hexConOpacidad(colorTema('accent'), 0.15),
      data: datosEntidad.value?.convocatorias_por_mes.map((m) => m.concluidas) ?? [],
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#FFFFFF',
      pointBorderWidth: 2,
    },
  ],
}))

const graficoAdjudicadasPorMes = computed(() => ({
  labels: datosEntidad.value?.adjudicadas_por_mes.map((m) => m.mes) ?? [],
  datasets: [
    {
      label: 'Adjudicadas por mes',
      backgroundColor: hexConOpacidad(colorTema('primary'), 0.85),
      hoverBackgroundColor: colorTema('primary'),
      data: datosEntidad.value?.adjudicadas_por_mes.map((m) => m.cantidad) ?? [],
      borderRadius: 6,
      maxBarThickness: 32,
    },
  ],
}))

const graficoMontoPorMes = computed(() => ({
  labels: datosEntidad.value?.adjudicadas_por_mes.map((m) => m.mes) ?? [],
  datasets: [
    {
      label: 'Monto adjudicado',
      borderColor: colorTema('primary'),
      backgroundColor: hexConOpacidad(colorTema('primary'), 0.12),
      data: datosEntidad.value?.adjudicadas_por_mes.map((m) => m.monto) ?? [],
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#FFFFFF',
      pointBorderWidth: 2,
    },
  ],
}))

const graficoRubros = computed(() => ({
  labels: datosEntidad.value?.top_rubros.map((r) => r.rubro) ?? [],
  datasets: [
    {
      label: 'Cantidad adjudicada',
      backgroundColor: hexConOpacidad(colorTema('accent'), 0.85),
      hoverBackgroundColor: colorTema('accent'),
      data: datosEntidad.value?.top_rubros.map((r) => r.cantidad) ?? [],
      borderRadius: 6,
      maxBarThickness: 24,
    },
  ],
}))

const graficoComparativaEntidades = computed(() => ({
  labels: datosEntidad.value?.comparativa_entidades.map((e) => e.sigla) ?? [],
  datasets: [
    {
      label: 'Adjudicadas',
      backgroundColor: colorTema('primary'),
      data: datosEntidad.value?.comparativa_entidades.map((e) => e.adjudicadas) ?? [],
      stack: 'total',
      borderRadius: 4,
      maxBarThickness: 36,
    },
    {
      label: 'Desiertas',
      backgroundColor: colorTema('warning'),
      data: datosEntidad.value?.comparativa_entidades.map((e) => e.desiertas) ?? [],
      stack: 'total',
      borderRadius: 4,
      maxBarThickness: 36,
    },
    {
      label: 'Canceladas',
      backgroundColor: colorTema('error'),
      data: datosEntidad.value?.comparativa_entidades.map((e) => e.canceladas) ?? [],
      stack: 'total',
      borderRadius: 4,
      maxBarThickness: 36,
    },
  ],
}))

// --- Vista PROVEEDOR ---------------------------------------------------------
const datosProveedor = computed(() => (datos.value?.contexto === 'PROVEEDOR' ? datos.value : null))

const tarjetasProveedor = computed(() => [
  {
    titulo: 'Ofertas enviadas',
    valor: datosProveedor.value?.mis_ofertas_enviadas ?? 0,
    icono: 'mdi-send-check-outline',
    color: 'info',
    subtitulo: 'Postulaciones registradas',
    esMoneda: false,
    destacada: false,
    colsMd: 3,
  },
  {
    titulo: 'En evaluación',
    valor: datosProveedor.value?.mis_ofertas_en_evaluacion ?? 0,
    icono: 'mdi-clipboard-clock-outline',
    color: 'warning',
    subtitulo: 'Propuestas en calificación',
    esMoneda: false,
    destacada: false,
    colsMd: 3,
  },
  {
    titulo: 'Adjudicadas',
    valor: datosProveedor.value?.mis_ofertas_adjudicadas ?? 0,
    icono: 'mdi-trophy-outline',
    color: 'success',
    subtitulo: 'Contrataciones ganadas',
    esMoneda: false,
    destacada: false,
    colsMd: 3,
  },
  {
    titulo: 'No adjudicadas',
    valor: datosProveedor.value?.mis_ofertas_no_adjudicadas ?? 0,
    icono: 'mdi-close-circle-outline',
    color: 'grey',
    subtitulo: 'Ofertas no seleccionadas',
    esMoneda: false,
    destacada: false,
    colsMd: 3,
  },
  {
    titulo: 'Monto total ganado',
    valor: datosProveedor.value?.monto_total_ganado ?? 0,
    icono: 'mdi-cash-check',
    color: 'primary',
    subtitulo: 'Importe acumulado adjudicado a favor',
    esMoneda: true,
    destacada: true,
    colsMd: 12,
  },
])

const graficoMisOfertasPorMes = computed(() => ({
  labels: datosProveedor.value?.ofertas_por_mes.map((m) => m.mes) ?? [],
  datasets: [
    {
      label: 'Enviadas',
      borderColor: colorTema('info'),
      backgroundColor: hexConOpacidad(colorTema('info'), 0.15),
      data: datosProveedor.value?.ofertas_por_mes.map((m) => m.enviadas) ?? [],
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#FFFFFF',
      pointBorderWidth: 2,
    },
    {
      label: 'Adjudicadas',
      borderColor: colorTema('primary'),
      backgroundColor: hexConOpacidad(colorTema('primary'), 0.15),
      data: datosProveedor.value?.ofertas_por_mes.map((m) => m.adjudicadas) ?? [],
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#FFFFFF',
      pointBorderWidth: 2,
    },
  ],
}))

const graficoMisRubros = computed(() => ({
  labels: datosProveedor.value?.top_rubros_postulados.map((r) => r.rubro) ?? [],
  datasets: [
    {
      label: 'Postulaciones por rubro',
      backgroundColor: hexConOpacidad(colorTema('accent'), 0.85),
      hoverBackgroundColor: colorTema('accent'),
      data: datosProveedor.value?.top_rubros_postulados.map((r) => r.cantidad) ?? [],
      borderRadius: 6,
      maxBarThickness: 24,
    },
  ],
}))
</script>

<template>
  <v-container class="py-8">
    <!-- Encabezado Principal y Acción de Refresco -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-titulo mb-1">Panel de Control</h1>
        <div class="text-body-2 text-medium-emphasis">
          Métricas clave, estadísticas operativas y seguimiento del sistema de compras
        </div>
      </div>
      <div class="d-flex align-center ga-2">
        <v-tooltip text="Actualizar datos del dashboard" location="bottom">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              icon="mdi-refresh"
              variant="tonal"
              color="primary"
              density="comfortable"
              :loading="cargando"
              @click="cargar"
            />
          </template>
        </v-tooltip>
      </div>
    </div>

    <!-- Barra de Filtros -->
    <v-card class="pa-4 mb-6" rounded="lg" elevation="0" border>
      <div class="d-flex flex-wrap align-center ga-4">
        <div class="d-flex align-center ga-2 text-subtitle-2 font-weight-bold text-medium-emphasis">
          <v-icon icon="mdi-filter-variant" size="20" color="primary" />
          <span>Filtros:</span>
        </div>
        <BaseRangoFechas
          v-model:desde="filtros.desde"
          v-model:hasta="filtros.hasta"
          label="Rango de fechas"
          style="max-width: 280px"
          @aplicar="cargar"
        />
        <!-- Selector exclusivo para ADMINISTRADOR -->
        <v-select
          v-if="esAdmin"
          v-model="filtros.entidad_id"
          :items="entidades.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
          label="Filtrar por Entidad"
          prepend-inner-icon="mdi-domain"
          clearable
          style="max-width: 300px"
          @update:model-value="cargar"
        />

        <!-- Para los demás usuarios (ej. perfil ENTIDAD), entidad asignada por defecto (no editable) -->
        <v-text-field
          v-else-if="entidadAsignada"
          :model-value="entidadAsignada.razon_social"
          label="Entidad asignada"
          prepend-inner-icon="mdi-domain"
          readonly
          density="comfortable"
          style="max-width: 320px"
        />
      </div>
    </v-card>

    <!-- Estado de Carga -->
    <div v-if="cargando" class="d-flex flex-column align-center justify-center py-16">
      <v-progress-circular indeterminate color="primary" size="56" width="4" />
      <span class="text-body-2 text-medium-emphasis mt-4">Actualizando información estadística...</span>
    </div>

    <!-- ENTIDAD / ADMINISTRADOR / AUDITOR -->
    <template v-else-if="datosEntidad">
      <!-- Tarjetas Fila 1 (Operativas) -->
      <v-row>
        <v-col v-for="t in tarjetasEntidadFila1" :key="t.titulo" cols="12" sm="6" md="3">
          <v-card
            class="kpi-card pa-4 fill-height d-flex flex-column justify-space-between"
            elevation="0"
            border
            rounded="lg"
          >
            <div class="d-flex align-start justify-space-between mb-2">
              <div class="pr-2">
                <span class="text-caption font-weight-medium text-medium-emphasis text-uppercase tracking-wider">
                  {{ t.titulo }}
                </span>
                <div class="text-h4 font-weight-bold mt-1 text-datos">
                  {{ formatearNumero(t.valor) }}
                </div>
              </div>
              <v-avatar :color="t.color" variant="tonal" size="44" rounded="md">
                <v-icon :icon="t.icono" size="24" :color="t.color" />
              </v-avatar>
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ t.subtitulo }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Tarjetas Fila 2 (Financiera y Participación) -->
      <v-row class="mt-1">
        <v-col v-for="t in tarjetasEntidadFila2" :key="t.titulo" cols="12" :sm="t.colsMd === 6 ? 12 : 6" :md="t.colsMd">
          <v-card
            class="kpi-card pa-4 fill-height d-flex flex-column justify-space-between"
            :class="{ 'kpi-destacada': t.destacada }"
            elevation="0"
            border
            rounded="lg"
          >
            <div class="d-flex align-start justify-space-between mb-2">
              <div class="pr-2">
                <span class="text-caption font-weight-medium text-medium-emphasis text-uppercase tracking-wider">
                  {{ t.titulo }}
                </span>
                <div class="text-h4 font-weight-bold mt-1 text-datos" :class="t.destacada ? 'text-primary' : ''">
                  {{ t.esMoneda ? formatearMoneda(t.valor) : formatearNumero(t.valor) }}
                </div>
              </div>
              <v-avatar :color="t.color" variant="tonal" size="44" rounded="md">
                <v-icon :icon="t.icono" size="24" :color="t.color" />
              </v-avatar>
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ t.subtitulo }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Gráficos Fila 1: Estado y Evolución -->
      <v-row class="mt-2">
        <v-col cols="12" md="5">
          <v-card class="pa-4 grafico-card" rounded="lg" elevation="0" border style="height: 380px">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center ga-2">
                <v-avatar color="primary" variant="tonal" size="32" rounded="sm">
                  <v-icon icon="mdi-chart-donut" size="18" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-titulo">Convocatorias por estado</div>
                  <div class="text-caption text-medium-emphasis">Distribución del flujo de convocatorias</div>
                </div>
              </div>
              <v-chip size="small" variant="tonal" color="primary" class="font-weight-medium">
                Total: {{ totalConvocatoriasEstado }}
              </v-chip>
            </div>
            <div v-if="!datosEntidad.convocatorias_por_estado.length" class="grafico-vacio">
              <v-icon icon="mdi-chart-donut" size="48" class="mb-2 opacity-50" />
              <span>Sin registros para mostrar</span>
            </div>
            <div v-else class="grafico-canvas">
              <Doughnut :data="graficoEstados" :options="opcionesDoughnut" />
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="7">
          <v-card class="pa-4 grafico-card" rounded="lg" elevation="0" border style="height: 380px">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center ga-2">
                <v-avatar color="info" variant="tonal" size="32" rounded="sm">
                  <v-icon icon="mdi-chart-line" size="18" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-titulo">Evolución mensual de convocatorias</div>
                  <div class="text-caption text-medium-emphasis">Tendencia según fase de atención</div>
                </div>
              </div>
            </div>
            <div v-if="!datosEntidad.convocatorias_por_mes.length" class="grafico-vacio">
              <v-icon icon="mdi-chart-line" size="48" class="mb-2 opacity-50" />
              <span>Sin registros para mostrar</span>
            </div>
            <div v-else class="grafico-canvas">
              <Line :data="graficoConvocatoriasPorMes" :options="opcionesLineas" />
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Gráficos Fila 2: Adjudicadas y Monto -->
      <v-row class="mt-2">
        <v-col cols="12" md="6">
          <v-card class="pa-4 grafico-card" rounded="lg" elevation="0" border style="height: 350px">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center ga-2">
                <v-avatar color="success" variant="tonal" size="32" rounded="sm">
                  <v-icon icon="mdi-check-decagram-outline" size="18" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-titulo">Procesos adjudicados por mes</div>
                  <div class="text-caption text-medium-emphasis">Cantidad de procesos culminados favorablemente</div>
                </div>
              </div>
            </div>
            <div v-if="!datosEntidad.adjudicadas_por_mes.length" class="grafico-vacio">
              <v-icon icon="mdi-chart-bar" size="48" class="mb-2 opacity-50" />
              <span>Sin registros para mostrar</span>
            </div>
            <div v-else class="grafico-canvas">
              <Bar :data="graficoAdjudicadasPorMes" :options="opcionesBarras" />
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="pa-4 grafico-card" rounded="lg" elevation="0" border style="height: 350px">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center ga-2">
                <v-avatar color="primary" variant="tonal" size="32" rounded="sm">
                  <v-icon icon="mdi-cash-multiple" size="18" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-titulo">Monto adjudicado mensual</div>
                  <div class="text-caption text-medium-emphasis">Importe financiero ejecutado por mes</div>
                </div>
              </div>
            </div>
            <div v-if="!datosEntidad.adjudicadas_por_mes.length" class="grafico-vacio">
              <v-icon icon="mdi-chart-bell-curve" size="48" class="mb-2 opacity-50" />
              <span>Sin registros para mostrar</span>
            </div>
            <div v-else class="grafico-canvas">
              <Line :data="graficoMontoPorMes" :options="opcionesLineasMoneda" />
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Gráficos Fila 3: Top Rubros y Comparativa -->
      <v-row class="mt-2">
        <v-col cols="12" :md="datosEntidad.comparativa_entidades.length ? 6 : 12">
          <v-card class="pa-4 grafico-card" rounded="lg" elevation="0" border style="height: 350px">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center ga-2">
                <v-avatar color="accent" variant="tonal" size="32" rounded="sm">
                  <v-icon icon="mdi-tag-multiple-outline" size="18" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-titulo">Top rubros adjudicados</div>
                  <div class="text-caption text-medium-emphasis">Especialidades con mayor contratación</div>
                </div>
              </div>
            </div>
            <div v-if="!datosEntidad.top_rubros.length" class="grafico-vacio">
              <v-icon icon="mdi-tag-multiple-outline" size="48" class="mb-2 opacity-50" />
              <span>Sin registros de rubros adjudicados</span>
            </div>
            <div v-else class="grafico-canvas">
              <Bar :data="graficoRubros" :options="opcionesBarrasHorizontales" />
            </div>
          </v-card>
        </v-col>

        <v-col v-if="datosEntidad.comparativa_entidades.length" cols="12" md="6">
          <v-card class="pa-4 grafico-card" rounded="lg" elevation="0" border style="height: 350px">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center ga-2">
                <v-avatar color="secondary" variant="tonal" size="32" rounded="sm">
                  <v-icon icon="mdi-domain" size="18" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-titulo">Comparativa entre entidades</div>
                  <div class="text-caption text-medium-emphasis">Procesos adjudicados, desiertos y cancelados</div>
                </div>
              </div>
            </div>
            <div class="grafico-canvas">
              <Bar :data="graficoComparativaEntidades" :options="opcionesApiladas" />
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- PROVEEDOR -->
    <template v-else-if="datosProveedor">
      <v-row>
        <v-col v-for="t in tarjetasProveedor" :key="t.titulo" cols="12" :sm="t.colsMd === 12 ? 12 : 6" :md="t.colsMd">
          <v-card
            class="kpi-card pa-4 fill-height d-flex flex-column justify-space-between"
            :class="{ 'kpi-destacada': t.destacada }"
            elevation="0"
            border
            rounded="lg"
          >
            <div class="d-flex align-start justify-space-between mb-2">
              <div class="pr-2">
                <span class="text-caption font-weight-medium text-medium-emphasis text-uppercase tracking-wider">
                  {{ t.titulo }}
                </span>
                <div class="text-h4 font-weight-bold mt-1 text-datos" :class="t.destacada ? 'text-primary' : ''">
                  {{ t.esMoneda ? formatearMoneda(t.valor) : formatearNumero(t.valor) }}
                </div>
              </div>
              <v-avatar :color="t.color" variant="tonal" size="44" rounded="md">
                <v-icon :icon="t.icono" size="24" :color="t.color" />
              </v-avatar>
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ t.subtitulo }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-2">
        <v-col cols="12" md="7">
          <v-card class="pa-4 grafico-card" rounded="lg" elevation="0" border style="height: 360px">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center ga-2">
                <v-avatar color="info" variant="tonal" size="32" rounded="sm">
                  <v-icon icon="mdi-chart-line" size="18" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-titulo">Mis ofertas por mes</div>
                  <div class="text-caption text-medium-emphasis">Postulaciones enviadas vs. contrataciones ganadas</div>
                </div>
              </div>
            </div>
            <div v-if="!datosProveedor.ofertas_por_mes.length" class="grafico-vacio">
              <v-icon icon="mdi-chart-line" size="48" class="mb-2 opacity-50" />
              <span>Sin ofertas registradas en el periodo</span>
            </div>
            <div v-else class="grafico-canvas">
              <Line :data="graficoMisOfertasPorMes" :options="opcionesLineas" />
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="5">
          <v-card class="pa-4 grafico-card" rounded="lg" elevation="0" border style="height: 360px">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center ga-2">
                <v-avatar color="accent" variant="tonal" size="32" rounded="sm">
                  <v-icon icon="mdi-briefcase-outline" size="18" />
                </v-avatar>
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-titulo">Rubros en los que más postulo</div>
                  <div class="text-caption text-medium-emphasis">Participación por especialidad comercial</div>
                </div>
              </div>
            </div>
            <div v-if="!datosProveedor.top_rubros_postulados.length" class="grafico-vacio">
              <v-icon icon="mdi-briefcase-outline" size="48" class="mb-2 opacity-50" />
              <span>Sin postulaciones registradas en el periodo</span>
            </div>
            <div v-else class="grafico-canvas">
              <Bar :data="graficoMisRubros" :options="opcionesBarrasHorizontales" />
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<style scoped>
/* Tarjetas KPI modernas con microinteracción */
.kpi-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--sombra-2);
}

.kpi-destacada {
  border-left: 4px solid rgb(var(--v-theme-primary)) !important;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05) 0%, rgba(var(--v-theme-surface), 1) 100%) !important;
}

/* Espacio y distribución de los gráficos Chart.js */
.grafico-card {
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s ease;
}
.grafico-card:hover {
  box-shadow: var(--sombra-2);
}

.grafico-canvas {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}

.grafico-vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.875rem;
}
</style>
