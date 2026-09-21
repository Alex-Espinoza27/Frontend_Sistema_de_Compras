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

ChartJS.register(BarElement, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

const theme = useTheme()
const auth = useAuthStore()
const esAdminOAuditor = auth.usuario?.rol === 'ADMINISTRADOR' || auth.usuario?.rol === 'AUDITOR'

const filtros = reactive({ desde: '', hasta: '', entidad_id: null as number | null })
const entidades = ref<EntidadListaItem[]>([])
if (esAdminOAuditor) {
  entidadesApi.index({ ordenar_por: 'razon_social', por_pagina: 100 }).then((data) => (entidades.value = data.items))
}

const datos = ref<DashboardDatos | null>(null)
const cargando = ref(true)
async function cargar() {
  cargando.value = true
  try {
    datos.value = await dashboardApi.obtener({
      desde: filtros.desde || undefined,
      hasta: filtros.hasta || undefined,
      entidad_id: filtros.entidad_id ?? undefined,
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

const opcionesBase = { responsive: true, maintainAspectRatio: false }
const opcionesSinLeyenda = { ...opcionesBase, plugins: { legend: { display: false } } }

// --- Vista ENTIDAD/ADMIN/AUDITOR --------------------------------------------
const datosEntidad = computed(() => (datos.value?.contexto === 'ENTIDAD_ADMIN' ? datos.value : null))

const tarjetasEntidad = computed(() => [
  { titulo: 'Convocatorias vigentes', valor: datosEntidad.value?.convocatorias_vigentes ?? 0 },
  { titulo: 'En evaluación', valor: datosEntidad.value?.convocatorias_en_evaluacion ?? 0 },
  { titulo: 'Adjudicados', valor: datosEntidad.value?.procesos_adjudicados ?? 0 },
  { titulo: 'Desiertos', valor: datosEntidad.value?.procesos_desiertos ?? 0 },
  { titulo: 'Cancelados', valor: datosEntidad.value?.procesos_cancelados ?? 0 },
  { titulo: 'Proveedores participantes', valor: datosEntidad.value?.proveedores_participantes ?? 0 },
  { titulo: 'Monto total adjudicado (S/)', valor: (datosEntidad.value?.monto_total_adjudicado ?? 0).toFixed(2) },
])

const graficoEstados = computed(() => ({
  labels: datosEntidad.value?.convocatorias_por_estado.map((e) => e.nombre) ?? [],
  datasets: [
    {
      data: datosEntidad.value?.convocatorias_por_estado.map((e) => e.cantidad) ?? [],
      backgroundColor: datosEntidad.value?.convocatorias_por_estado.map((e) => colorTema(e.color)) ?? [],
    },
  ],
}))

const graficoConvocatoriasPorMes = computed(() => ({
  labels: datosEntidad.value?.convocatorias_por_mes.map((m) => m.mes) ?? [],
  datasets: [
    {
      label: 'Presentadas',
      borderColor: colorTema('success'),
      backgroundColor: colorTema('success'),
      data: datosEntidad.value?.convocatorias_por_mes.map((m) => m.presentadas) ?? [],
      tension: 0.3,
    },
    {
      label: 'En evaluación',
      borderColor: colorTema('info'),
      backgroundColor: colorTema('info'),
      data: datosEntidad.value?.convocatorias_por_mes.map((m) => m.en_evaluacion) ?? [],
      tension: 0.3,
    },
    {
      label: 'Concluidas',
      borderColor: colorTema('accent'),
      backgroundColor: colorTema('accent'),
      data: datosEntidad.value?.convocatorias_por_mes.map((m) => m.concluidas) ?? [],
      tension: 0.3,
    },
  ],
}))

const graficoAdjudicadasPorMes = computed(() => ({
  labels: datosEntidad.value?.adjudicadas_por_mes.map((m) => m.mes) ?? [],
  datasets: [
    {
      label: 'Adjudicadas por mes',
      backgroundColor: colorTema('primary'),
      data: datosEntidad.value?.adjudicadas_por_mes.map((m) => m.cantidad) ?? [],
    },
  ],
}))

const graficoMontoPorMes = computed(() => ({
  labels: datosEntidad.value?.adjudicadas_por_mes.map((m) => m.mes) ?? [],
  datasets: [
    {
      label: 'Monto adjudicado (S/)',
      borderColor: colorTema('primary'),
      backgroundColor: colorTema('primary'),
      data: datosEntidad.value?.adjudicadas_por_mes.map((m) => m.monto) ?? [],
      tension: 0.3,
    },
  ],
}))

const graficoRubros = computed(() => ({
  labels: datosEntidad.value?.top_rubros.map((r) => r.rubro) ?? [],
  datasets: [
    {
      label: 'Top rubros adjudicados',
      backgroundColor: colorTema('accent'),
      data: datosEntidad.value?.top_rubros.map((r) => r.cantidad) ?? [],
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
    },
    {
      label: 'Desiertas',
      backgroundColor: colorTema('warning'),
      data: datosEntidad.value?.comparativa_entidades.map((e) => e.desiertas) ?? [],
      stack: 'total',
    },
    {
      label: 'Canceladas',
      backgroundColor: colorTema('error'),
      data: datosEntidad.value?.comparativa_entidades.map((e) => e.canceladas) ?? [],
      stack: 'total',
    },
  ],
}))
const opcionesApiladas = {
  ...opcionesBase,
  scales: { x: { stacked: true }, y: { stacked: true } },
}

// --- Vista PROVEEDOR ---------------------------------------------------------
const datosProveedor = computed(() => (datos.value?.contexto === 'PROVEEDOR' ? datos.value : null))

const tarjetasProveedor = computed(() => [
  { titulo: 'Ofertas enviadas', valor: datosProveedor.value?.mis_ofertas_enviadas ?? 0 },
  { titulo: 'En evaluación', valor: datosProveedor.value?.mis_ofertas_en_evaluacion ?? 0 },
  { titulo: 'Adjudicadas', valor: datosProveedor.value?.mis_ofertas_adjudicadas ?? 0 },
  { titulo: 'No adjudicadas', valor: datosProveedor.value?.mis_ofertas_no_adjudicadas ?? 0 },
  { titulo: 'Monto total ganado (S/)', valor: (datosProveedor.value?.monto_total_ganado ?? 0).toFixed(2) },
])

const graficoMisOfertasPorMes = computed(() => ({
  labels: datosProveedor.value?.ofertas_por_mes.map((m) => m.mes) ?? [],
  datasets: [
    {
      label: 'Enviadas',
      borderColor: colorTema('info'),
      backgroundColor: colorTema('info'),
      data: datosProveedor.value?.ofertas_por_mes.map((m) => m.enviadas) ?? [],
      tension: 0.3,
    },
    {
      label: 'Adjudicadas',
      borderColor: colorTema('primary'),
      backgroundColor: colorTema('primary'),
      data: datosProveedor.value?.ofertas_por_mes.map((m) => m.adjudicadas) ?? [],
      tension: 0.3,
    },
  ],
}))

const graficoMisRubros = computed(() => ({
  labels: datosProveedor.value?.top_rubros_postulados.map((r) => r.rubro) ?? [],
  datasets: [
    {
      label: 'Postulaciones por rubro',
      backgroundColor: colorTema('accent'),
      data: datosProveedor.value?.top_rubros_postulados.map((r) => r.cantidad) ?? [],
    },
  ],
}))
</script>

<template>
  <v-container class="py-8">
    <div class="text-h5 text-titulo mb-6">Dashboard</div>

    <div class="d-flex flex-wrap ga-4 mb-6">
      <BaseRangoFechas
        v-model:desde="filtros.desde"
        v-model:hasta="filtros.hasta"
        label="Rango de fechas"
        style="max-width: 260px"
        @aplicar="cargar"
      />
      <v-select
        v-if="esAdminOAuditor"
        v-model="filtros.entidad_id"
        :items="entidades.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
        label="Entidad"
        clearable
        style="max-width: 240px"
        @update:model-value="cargar"
      />
    </div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <!-- ENTIDAD / ADMINISTRADOR / AUDITOR -->
    <template v-else-if="datosEntidad">
      <v-row>
        <v-col v-for="t in tarjetasEntidad" :key="t.titulo" cols="12" sm="6" md="3">
          <v-card class="pa-4">
            <div class="text-body-2 text-grey">{{ t.titulo }}</div>
            <div class="text-h5 text-datos">{{ t.valor }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-2">
        <v-col cols="12" md="5">
          <v-card class="pa-4 grafico-card" style="height: 340px">
            <div class="text-subtitle-2 mb-2">Convocatorias por estado</div>
            <div class="grafico-canvas">
              <Doughnut :data="graficoEstados" :options="opcionesBase" />
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="7">
          <v-card class="pa-4 grafico-card" style="height: 340px">
            <div class="text-subtitle-2 mb-2">Convocatorias por mes (presentadas / en evaluación / concluidas)</div>
            <div class="grafico-canvas">
              <Line :data="graficoConvocatoriasPorMes" :options="opcionesBase" />
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-2">
        <v-col cols="12" md="6">
          <v-card class="pa-4 grafico-card" style="height: 320px">
            <div class="text-subtitle-2 mb-2">Adjudicadas por mes</div>
            <div class="grafico-canvas">
              <Bar :data="graficoAdjudicadasPorMes" :options="opcionesSinLeyenda" />
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card class="pa-4 grafico-card" style="height: 320px">
            <div class="text-subtitle-2 mb-2">Monto adjudicado por mes</div>
            <div class="grafico-canvas">
              <Line :data="graficoMontoPorMes" :options="opcionesSinLeyenda" />
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-2">
        <v-col cols="12" :md="datosEntidad.comparativa_entidades.length ? 6 : 12">
          <v-card class="pa-4 grafico-card" style="height: 320px">
            <div class="text-subtitle-2 mb-2">Top rubros adjudicados</div>
            <div class="grafico-canvas">
              <Bar :data="graficoRubros" :options="opcionesSinLeyenda" />
            </div>
          </v-card>
        </v-col>
        <v-col v-if="datosEntidad.comparativa_entidades.length" cols="12" md="6">
          <v-card class="pa-4 grafico-card" style="height: 320px">
            <div class="text-subtitle-2 mb-2">Comparativa entre entidades</div>
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
        <v-col v-for="t in tarjetasProveedor" :key="t.titulo" cols="12" sm="6" md="2" style="flex-grow: 1">
          <v-card class="pa-4">
            <div class="text-body-2 text-grey">{{ t.titulo }}</div>
            <div class="text-h5 text-datos">{{ t.valor }}</div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-2">
        <v-col cols="12" md="7">
          <v-card class="pa-4 grafico-card" style="height: 320px">
            <div class="text-subtitle-2 mb-2">Mis ofertas por mes</div>
            <div class="grafico-canvas">
              <Line :data="graficoMisOfertasPorMes" :options="opcionesBase" />
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="5">
          <v-card class="pa-4 grafico-card" style="height: 320px">
            <div class="text-subtitle-2 mb-2">Rubros en los que más postulo</div>
            <div class="grafico-canvas">
              <Bar :data="graficoMisRubros" :options="opcionesSinLeyenda" />
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<style scoped>
/* Las cards con height fijo no eran flex: el título y el canvas competían
 * por el mismo espacio y el chart (maintainAspectRatio: false, pensado para
 * llenar el 100% de su contenedor) terminaba más alto que lo que quedaba
 * libre bajo el título, recortando las etiquetas del eje X contra el borde
 * de la card (05C hardening, bug reportado por el usuario). El título ahora
 * reserva su alto real (flex: none) y el canvas solo ocupa el resto
 * (flex: 1 1 auto; min-height: 0, indispensable para que un hijo flex se
 * achique por debajo de su tamaño de contenido en vez de desbordar).
 */
.grafico-card {
  display: flex;
  flex-direction: column;
}
.grafico-canvas {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}
</style>
