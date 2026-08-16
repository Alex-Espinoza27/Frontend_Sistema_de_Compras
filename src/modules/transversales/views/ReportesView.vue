<script setup lang="ts">
// J2 — Reportes (05B). Única pantalla con POST /reportes/buscar. Las
// columnas, el orden disponible y qué filtros aplican cambian según `tipo`
// (`ReporteService::mapearFila`/`cabeceras`, `ReporteController::COLUMNAS_ORDEN`).
// `estado` solo tiene efecto real en POR_PERIODO (estados de CONVOCATORIA) y
// POR_PROVEEDOR (estados de OFERTA) — en ADJUDICACION/POR_DEPENDENCIA el
// backend nunca lo usa, así que se oculta ahí para no confundir.
//
// 05C hardening: se agregaron filtros `tipo_requerimiento`/`rubro_id`
// (ADJUDICACION/POR_PERIODO/POR_DEPENDENCIA) y `tipo_comprobante_id`
// (POR_PROVEEDOR), y se corrigió un bug real — el filtro "Área usuaria"
// enviaba texto libre (`area_usuaria`) pero el backend siempre esperó
// `area_id` (entero, FK al catálogo de Áreas); ahora es un select real. Las
// áreas son por-entidad: para ADMIN/AUDITOR el select solo aparece una vez
// elegida una entidad (`AreaController::index` exige `entidad_id` para esos
// roles, 05C hardening).
import { computed, reactive, ref, watch } from 'vue'

import { adminApi } from '@/api/admin.api'
import { areasApi } from '@/api/areas.api'
import { entidadesApi } from '@/api/entidades.api'
import { publicoApi } from '@/api/publico.api'
import { reportesApi } from '@/api/reportes.api'
import BaseDatePicker from '@/components/base/BaseDatePicker.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useDescarga } from '@/composables/useDescarga'
import type { AreaItem } from '@/modules/entidad/entidad.types'
import type { EntidadListaItem, ProveedorAdminItem, TipoComprobanteAdmin } from '@/modules/muni/muni.types'
import type { RubroPublico } from '@/modules/publico/publico.types'
import type { ReporteFila, TipoReporte } from '@/modules/transversales/transversales.types'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const esEntidad = auth.usuario?.rol === 'ENTIDAD'

const opcionesTipo: { title: string; value: TipoReporte }[] = [
  { title: 'Adjudicación', value: 'ADJUDICACION' },
  { title: 'Por período', value: 'POR_PERIODO' },
  { title: 'Por dependencia', value: 'POR_DEPENDENCIA' },
  { title: 'Por proveedor', value: 'POR_PROVEEDOR' },
]

// Los tipos que parten de Convocatoria (todos menos POR_PROVEEDOR) admiten
// los filtros de tipo de bien/servicio y rubro del requerimiento.
const tiposConvocatoria: TipoReporte[] = ['ADJUDICACION', 'POR_PERIODO', 'POR_DEPENDENCIA']

const configColumnas: Record<TipoReporte, { title: string; key: string }[]> = {
  ADJUDICACION: [
    { title: 'Número', key: 'numero' },
    { title: 'Servicio', key: 'nombre_servicio' },
    { title: 'Entidad', key: 'entidad' },
    { title: 'RUC entidad', key: 'entidad_ruc' },
    { title: 'Tipo', key: 'tipo' },
    { title: 'Rubros', key: 'rubros' },
    { title: 'Fecha inicio', key: 'fecha_inicio' },
    { title: 'Fecha fin', key: 'fecha_fin' },
    { title: 'Proveedor adjudicado', key: 'proveedor_adjudicado' },
    { title: 'RUC/DNI proveedor', key: 'proveedor_ruc' },
    { title: 'Comprobante', key: 'tipo_comprobante' },
    { title: 'Monto S/', key: 'monto' },
    { title: 'Validez oferta (días)', key: 'validez_dias' },
    { title: 'Plazo ejecución', key: 'plazo_ejecucion' },
    { title: 'Forma de pago', key: 'forma_pago' },
    { title: 'Plazo garantía', key: 'plazo_garantia' },
    { title: 'Fecha de resultado', key: 'fecha_resultado' },
  ],
  POR_PERIODO: [
    { title: 'Número', key: 'numero' },
    { title: 'Servicio', key: 'nombre_servicio' },
    { title: 'Entidad', key: 'entidad' },
    { title: 'RUC entidad', key: 'entidad_ruc' },
    { title: 'Tipo', key: 'tipo' },
    { title: 'Rubros', key: 'rubros' },
    { title: 'Estado', key: 'estado' },
    { title: 'N.º ofertas', key: 'total_ofertas' },
    { title: 'Fecha inicio', key: 'fecha_inicio' },
    { title: 'Fecha publicación', key: 'fecha_publicacion' },
    { title: 'Fecha resultado', key: 'fecha_resultado' },
    { title: 'Motivo de cierre', key: 'motivo_cierre' },
  ],
  POR_DEPENDENCIA: [
    { title: 'Número', key: 'numero' },
    { title: 'Servicio', key: 'nombre_servicio' },
    { title: 'Entidad', key: 'entidad' },
    { title: 'RUC entidad', key: 'entidad_ruc' },
    { title: 'Tipo', key: 'tipo' },
    { title: 'Rubros', key: 'rubros' },
    { title: 'Área usuaria', key: 'area_usuaria' },
    { title: 'Estado', key: 'estado' },
    { title: 'N.º ofertas', key: 'total_ofertas' },
    { title: 'Fecha inicio', key: 'fecha_inicio' },
    { title: 'Fecha fin', key: 'fecha_fin' },
    { title: 'Fecha resultado', key: 'fecha_resultado' },
  ],
  POR_PROVEEDOR: [
    { title: 'Proveedor', key: 'proveedor' },
    { title: 'RUC/DNI', key: 'proveedor_ruc' },
    { title: 'Tipo de persona', key: 'tipo_persona' },
    { title: 'Convocatoria', key: 'convocatoria' },
    { title: 'Entidad', key: 'entidad' },
    { title: 'RUC entidad', key: 'entidad_ruc' },
    { title: 'Comprobante', key: 'tipo_comprobante' },
    { title: 'Total ofertado S/', key: 'total_general' },
    { title: 'Validez oferta (días)', key: 'validez_dias' },
    { title: 'Plazo ejecución', key: 'plazo_ejecucion' },
    { title: 'Forma de pago', key: 'forma_pago' },
    { title: 'Plazo garantía', key: 'plazo_garantia' },
    { title: 'Eval. técnica', key: 'eval_tecnica' },
    { title: 'Eval. logística', key: 'eval_logistica' },
    { title: 'Contacto', key: 'contacto_nombre' },
    { title: 'Tel. contacto', key: 'contacto_telefono' },
    { title: 'Correo contacto', key: 'contacto_correo' },
    { title: 'Estado', key: 'estado' },
    { title: 'Fecha de envío', key: 'fecha_envio' },
  ],
}

const opcionesOrden: Record<TipoReporte, { title: string; value: string }[]> = {
  ADJUDICACION: [
    { title: 'Fecha de resultado', value: 'fecha_resultado' },
    { title: 'Número', value: 'numero' },
  ],
  POR_PERIODO: [
    { title: 'Fecha de resultado', value: 'fecha_resultado' },
    { title: 'Número', value: 'numero' },
  ],
  POR_DEPENDENCIA: [
    { title: 'Fecha de resultado', value: 'fecha_resultado' },
    { title: 'Número', value: 'numero' },
  ],
  POR_PROVEEDOR: [
    { title: 'Fecha de envío', value: 'fecha_envio' },
    { title: 'Total ofertado', value: 'total_general' },
  ],
}

const opcionesEstadoConvocatoria = [
  { title: 'Borrador', value: 'BORRADOR' },
  { title: 'Publicada', value: 'PUBLICADA' },
  { title: 'En evaluación', value: 'EN_EVALUACION' },
  { title: 'Adjudicada', value: 'ADJUDICADA' },
  { title: 'Desierta', value: 'DESIERTA' },
  { title: 'Cancelada', value: 'CANCELADA' },
]
const opcionesEstadoOferta = [
  { title: 'Enviada', value: 'ENVIADA' },
  { title: 'En evaluación', value: 'EN_EVALUACION' },
  { title: 'Aprobada', value: 'APROBADA' },
  { title: 'Desaprobada', value: 'DESAPROBADA' },
  { title: 'Adjudicada', value: 'ADJUDICADA' },
  { title: 'No adjudicada', value: 'NO_ADJUDICADA' },
]
const opcionesTipoRequerimiento = [
  { title: 'Bien', value: 'BIEN' },
  { title: 'Servicio', value: 'SERVICIO' },
]

const tipo = ref<TipoReporte>('ADJUDICACION')
const filtros = reactive({
  desde: '',
  hasta: '',
  entidad_id: null as number | null,
  area_id: null as number | null,
  proveedor_id: null as number | null,
  estado: null as string | null,
  tipo_requerimiento: null as 'BIEN' | 'SERVICIO' | null,
  rubro_id: null as number | null,
  tipo_comprobante_id: null as number | null,
  ordenar_por: 'fecha_resultado',
  direccion: 'desc' as 'asc' | 'desc',
})
const pagina = ref(1)
const porPagina = ref(15)

const entidades = ref<EntidadListaItem[]>([])
const proveedores = ref<ProveedorAdminItem[]>([])
const rubros = ref<RubroPublico[]>([])
const tiposComprobante = ref<TipoComprobanteAdmin[]>([])
const areas = ref<AreaItem[]>([])
if (!esEntidad) {
  entidadesApi.index({ ordenar_por: 'razon_social', por_pagina: 100 }).then((data) => (entidades.value = data.items))
}
adminApi.proveedores({ por_pagina: 100 }).then((data) => (proveedores.value = data.items))
publicoApi.rubros().then((data) => (rubros.value = data.items))
adminApi.tiposComprobante().then((data) => (tiposComprobante.value = data))

// Las áreas son por-entidad: para ENTIDAD, el backend ya scopea a la propia
// (no hace falta enviar entidad_id); para ADMIN/AUDITOR, se exige una
// entidad elegida (`AreaController::index`, 05C hardening).
const puedeElegirArea = computed(() => esEntidad || !!filtros.entidad_id)
async function cargarAreas() {
  if (!puedeElegirArea.value) {
    areas.value = []
    return
  }
  const params: Record<string, unknown> = { activo: 'true', por_pagina: 100 }
  if (!esEntidad && filtros.entidad_id) params.entidad_id = filtros.entidad_id
  const data = await areasApi.index(params)
  areas.value = data.items
}
watch(() => filtros.entidad_id, cargarAreas)
cargarAreas()

const rubrosFiltrados = computed(() =>
  filtros.tipo_requerimiento ? rubros.value.filter((r) => r.tipo === filtros.tipo_requerimiento) : rubros.value,
)

const pageId = computed(() => (tipo.value === 'POR_PROVEEDOR' ? 'oferta_id' : 'convocatoria_id'))
// `sortable` refleja exactamente `ReporteController::COLUMNAS_ORDEN` por
// tipo (05C hardening) — las mismas 2 opciones que ya ofrece el selector
// "Ordenar por"; el resto de columnas no es ordenable por clic.
const cabeceras = computed(() => {
  const permitidas = opcionesOrden[tipo.value].map((o) => o.value)
  return configColumnas[tipo.value].map((col) => ({ ...col, sortable: permitidas.includes(col.key) }))
})

watch(tipo, () => {
  filtros.estado = null
  filtros.area_id = null
  filtros.proveedor_id = null
  filtros.tipo_requerimiento = null
  filtros.rubro_id = null
  filtros.tipo_comprobante_id = null
  filtros.ordenar_por = opcionesOrden[tipo.value][0].value
  pagina.value = 1
  buscar()
})

const items = ref<ReporteFila[]>([])
const total = ref(0)
const cargando = ref(false)

async function buscar() {
  cargando.value = true
  try {
    const data = await reportesApi.buscar({
      tipo: tipo.value,
      desde: filtros.desde || undefined,
      hasta: filtros.hasta || undefined,
      entidad_id: filtros.entidad_id ?? undefined,
      area_id: filtros.area_id ?? undefined,
      proveedor_id: filtros.proveedor_id ?? undefined,
      estado: filtros.estado ?? undefined,
      tipo_requerimiento: filtros.tipo_requerimiento ?? undefined,
      rubro_id: filtros.rubro_id ?? undefined,
      tipo_comprobante_id: filtros.tipo_comprobante_id ?? undefined,
      pagina: pagina.value,
      por_pagina: porPagina.value,
      ordenar_por: filtros.ordenar_por,
      direccion: filtros.direccion,
    })
    items.value = data.items
    total.value = data.paginacion.total
  } finally {
    cargando.value = false
  }
}
buscar()

watch(
  () => [filtros.ordenar_por, filtros.direccion],
  () => {
    pagina.value = 1
    buscar()
  },
)
watch([pagina, porPagina], buscar)

const { descargar, abrirEnNuevaPestana } = useDescarga()
function exportarExcel() {
  descargar(reportesApi.exportarXlsxUrl(filtrosActuales()), `reporte-${tipo.value.toLowerCase()}.xlsx`)
}
function exportarPdf() {
  abrirEnNuevaPestana(reportesApi.exportarPdfUrl(filtrosActuales()))
}
function filtrosActuales() {
  return {
    tipo: tipo.value,
    desde: filtros.desde || undefined,
    hasta: filtros.hasta || undefined,
    entidad_id: filtros.entidad_id ?? undefined,
    area_id: filtros.area_id ?? undefined,
    proveedor_id: filtros.proveedor_id ?? undefined,
    estado: filtros.estado ?? undefined,
    tipo_requerimiento: filtros.tipo_requerimiento ?? undefined,
    rubro_id: filtros.rubro_id ?? undefined,
    tipo_comprobante_id: filtros.tipo_comprobante_id ?? undefined,
  }
}
</script>

<template>
  <v-container class="py-8" fluid>
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Reportes</div>
      <div class="d-flex ga-2">
        <v-btn icon color="primary" variant="text" :loading="cargando" @click="buscar()">
          <v-icon icon="mdi-refresh" />
          <v-tooltip activator="parent" location="bottom">Refrescar</v-tooltip>
        </v-btn>
        <v-btn variant="tonal" prepend-icon="mdi-file-excel-outline" @click="exportarExcel">Excel</v-btn>
        <v-btn variant="tonal" prepend-icon="mdi-file-pdf-box" @click="exportarPdf">PDF</v-btn>
      </div>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-select v-model="tipo" :items="opcionesTipo" label="Tipo de reporte" style="max-width: 200px" />
      <BaseDatePicker v-model="filtros.desde" label="Desde" clearable style="max-width: 180px" @update:model-value="buscar" />
      <BaseDatePicker v-model="filtros.hasta" label="Hasta" clearable style="max-width: 180px" @update:model-value="buscar" />
      <v-select
        v-if="!esEntidad"
        v-model="filtros.entidad_id"
        :items="entidades.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
        label="Entidad"
        clearable
        style="max-width: 220px"
        @update:model-value="buscar"
      />
      <v-select
        v-if="tiposConvocatoria.includes(tipo)"
        v-model="filtros.tipo_requerimiento"
        :items="opcionesTipoRequerimiento"
        label="Tipo"
        clearable
        style="max-width: 160px"
        @update:model-value="buscar"
      />
      <v-autocomplete
        v-if="tiposConvocatoria.includes(tipo)"
        v-model="filtros.rubro_id"
        :items="rubrosFiltrados.map((r) => ({ title: r.nombre, value: r.rubro_id }))"
        label="Rubro"
        clearable
        style="max-width: 220px"
        @update:model-value="buscar"
      />
      <v-autocomplete
        v-if="tipo === 'POR_DEPENDENCIA' && puedeElegirArea"
        v-model="filtros.area_id"
        :items="areas.map((a) => ({ title: a.nombre, value: a.area_id }))"
        label="Área usuaria"
        clearable
        style="max-width: 220px"
        @update:model-value="buscar"
      />
      <div v-if="tipo === 'POR_DEPENDENCIA' && !puedeElegirArea" class="text-caption text-grey d-flex align-center">
        Elige una entidad para filtrar por área.
      </div>
      <v-select
        v-if="tipo === 'POR_PROVEEDOR'"
        v-model="filtros.proveedor_id"
        :items="proveedores.map((p) => ({ title: p.razon_social, value: p.proveedor_id }))"
        label="Proveedor"
        clearable
        style="max-width: 220px"
        @update:model-value="buscar"
      />
      <v-select
        v-if="tipo === 'POR_PROVEEDOR'"
        v-model="filtros.tipo_comprobante_id"
        :items="tiposComprobante.map((t) => ({ title: t.nombre, value: t.tipo_comprobante_id }))"
        label="Tipo de comprobante"
        clearable
        style="max-width: 200px"
        @update:model-value="buscar"
      />
      <v-select
        v-if="tipo === 'POR_PERIODO'"
        v-model="filtros.estado"
        :items="opcionesEstadoConvocatoria"
        label="Estado"
        clearable
        style="max-width: 180px"
        @update:model-value="buscar"
      />
      <v-select
        v-if="tipo === 'POR_PROVEEDOR'"
        v-model="filtros.estado"
        :items="opcionesEstadoOferta"
        label="Estado"
        clearable
        style="max-width: 180px"
        @update:model-value="buscar"
      />
      <v-select
        v-model="filtros.ordenar_por"
        :items="opcionesOrden[tipo]"
        label="Ordenar por"
        style="max-width: 180px"
        @update:model-value="buscar"
      />
    </div>

    <BaseTablaServidor
      v-model:page="pagina"
      v-model:items-per-page="porPagina"
      v-model:ordenar-por="filtros.ordenar_por"
      v-model:direccion="filtros.direccion"
      :headers="cabeceras"
      :items="items"
      :items-length="total"
      :loading="cargando"
      :item-value="pageId"
      mensaje-vacio="No hay resultados para estos filtros."
    />
  </v-container>
</template>
