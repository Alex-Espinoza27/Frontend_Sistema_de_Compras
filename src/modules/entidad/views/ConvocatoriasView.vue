<script setup lang="ts">
// E3 — Convocatorias (05B). Acciones contextuales según estado; reducido a
// registrar/ver/cancelar (05C hardening, Bloque E3) — "Ir a Evaluación" y
// "Adjudicar" ahora viven en sus propios módulos de sidebar (Evaluación y
// Adjudicación, M07/M08 del TDR), no como acciones de esta tabla.
import { ref } from 'vue'

import { convocatoriasApi } from '@/api/convocatorias.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseLeyendaFiltros from '@/components/base/BaseLeyendaFiltros.vue'
import BaseRangoFechas from '@/components/base/BaseRangoFechas.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { ConvocatoriaListaItem } from '@/modules/entidad/entidad.types'
import dayjs from '@/plugins/dayjs'
import { useUiStore } from '@/stores/ui.store'
import { hoyTexto } from '@/utils/fechas'

const ui = useUiStore()

// El filtro de fecha es por FECHA DE REGISTRO (cuándo se creó la convocatoria,
// días completos, sin importar la hora) y arranca marcado en "Hoy". Usa
// `registro_desde/hasta`: `desde/hasta` del backend son por cierre de plazo
// (los usan Evaluación y Adjudicación). La clave de persistencia es nueva
// para no heredar un rango viejo guardado con el significado anterior.
const { items, paginacion, cargando, params, recargar } = useListado<ConvocatoriaListaItem>(
  convocatoriasApi.index,
  { ordenar_por: 'fecha_fin', direccion: 'asc', registro_desde: hoyTexto(), registro_hasta: hoyTexto() },
  'filtros_convocatorias_registro',
)

const opcionesEstado = [
  { title: 'Borrador', value: 'BORRADOR' },
  { title: 'Convocatoria Vigente', value: 'PUBLICADA' },
  { title: 'Convocatoria en Evaluación', value: 'EN_EVALUACION' },
  { title: 'Convocatoria Adjudicada', value: 'ADJUDICADA' },
  { title: 'Convocatoria Desierta', value: 'DESIERTA' },
  { title: 'Convocatoria Cancelada', value: 'CANCELADA' },
]

// `sortable` refleja lo que soporta `ConvocatoriaController::index`
// (fecha_fin/fecha_inicio/fecha_registro/numero/estado); "Fechas programadas"
// es una columna combinada sin un único campo del backend al que mapear, así
// que no es ordenable por clic.
const leyenda = {
  proposito: "Convocatorias que publicó tu entidad para recibir ofertas, en cualquier estado.",
  columnas:
    "Número (con su requerimiento de origen), N.º de indagación (el del PDF de resultados), Fechas programadas " +
    "(inicio – fin para recibir ofertas, con los días que faltan para el cierre), Estado y N.º ofertas.",
  fechas: "Por fecha de registro (cuándo se creó), días completos, a cualquier hora.",
}

// La columna "Urgencia" se reemplazó por el contador de días dentro de
// "Fechas programadas" (pedido explícitamente por el usuario).
const cabeceras = [
  { title: 'Acciones', key: 'acciones', sortable: false },
  { title: 'Número', key: 'numero' },
  { title: 'N.º indagación', key: 'numero_indagacion', sortable: false },
  { title: 'Nombre', key: 'nombre_servicio', sortable: false },
  { title: 'Fecha de registro', key: 'fecha_registro' },
  { title: 'Fechas programadas', key: 'fechas', sortable: false },
  { title: 'Estado', key: 'estado' },
  { title: 'Motivo', key: 'motivo_cierre', sortable: false },
  { title: 'N.º ofertas', key: 'total_ofertas', sortable: false },
]

function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`
}

/**
 * Contador hasta el cierre del plazo, solo para convocatorias vigentes
 * (PUBLICADA): las demás ya no reciben ofertas o aún no se publicaron.
 * `texto` va en el chip y `detalle` en el tooltip.
 */
function contadorCierre(item: ConvocatoriaListaItem): { texto: string; detalle: string; color: string; icono: string } | null {
  if (item.estado.codigo !== 'PUBLICADA') return null
  const ahora = dayjs()
  const inicio = dayjs(item.fecha_inicio)
  const fin = dayjs(item.fecha_fin)
  const cierre = fin.tz().format('DD/MM/YYYY HH:mm')

  if (inicio.isAfter(ahora)) {
    const dias = Math.ceil(inicio.diff(ahora, 'hour', true) / 24)
    return {
      texto: `Inicia en ${dias} d`,
      detalle: `Aún no empieza a recibir ofertas: faltan ${plural(dias, 'día', 'días')} para el inicio (${inicio.tz().format('DD/MM/YYYY HH:mm')}).`,
      color: 'grey',
      icono: 'mdi-calendar-clock',
    }
  }
  if (!fin.isAfter(ahora)) {
    const dias = ahora.diff(fin, 'day')
    return {
      texto: 'Vencida',
      detalle:
        `El plazo venció ${dias === 0 ? 'hoy' : `hace ${plural(dias, 'día', 'días')}`} (${cierre}). ` +
        'Pasará a "En evaluación" automáticamente en unos minutos.',
      color: 'error',
      icono: 'mdi-timer-off-outline',
    }
  }
  const horas = fin.diff(ahora, 'hour', true)
  if (horas < 24) {
    const h = Math.ceil(horas)
    return {
      texto: `${h} h`,
      detalle: `Faltan menos de ${plural(h, 'hora', 'horas')} para que venza el plazo (cierra el ${cierre}).`,
      color: 'error',
      icono: 'mdi-timer-alert-outline',
    }
  }
  const dias = Math.floor(horas / 24)
  return {
    texto: `${dias} d`,
    detalle: `Faltan ${plural(dias, 'día', 'días')} para que venza el plazo (cierra el ${cierre}).`,
    color: dias <= 3 ? 'warning' : 'success',
    icono: 'mdi-timer-sand',
  }
}

const cancelarAbierto = ref(false)
const cancelarId = ref<number | null>(null)
const cancelando = ref(false)
function pedirCancelar(id: number) {
  cancelarId.value = id
  cancelarAbierto.value = true
}
async function confirmarCancelar(motivo: string | undefined) {
  if (!cancelarId.value || !motivo) return
  cancelando.value = true
  try {
    await convocatoriasApi.cancelar(cancelarId.value, motivo)
    cancelarAbierto.value = false
    ui.mostrarSnackbar('Convocatoria cancelada.', 'success')
    recargar()
  } finally {
    cancelando.value = false
  }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Convocatorias</div>
      <div class="d-flex ga-2">
        <v-btn icon color="primary" variant="outlined" :loading="cargando" @click="recargar()">
          <v-icon icon="mdi-refresh" />
          <v-tooltip activator="parent" location="bottom">Refrescar</v-tooltip>
        </v-btn>
        <v-btn v-can="'convocatorias.crear'" to="/app/convocatorias/nueva" color="primary" variant="flat" elevation="2" class="font-weight-medium px-5">
          Nueva convocatoria
        </v-btn>
      </div>
    </div>

    <BaseLeyendaFiltros v-bind="leyenda" />

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        v-model="params.buscar"
        label="Buscar"
        placeholder="Nombre, código, N.º indagación o N.º requerimiento"
        persistent-placeholder
        autocomplete="off"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 400px; min-width: 300px"
        clearable
      />
      <v-select
        v-model="params.estado"
        :items="opcionesEstado"
        label="Estado"
        clearable
        style="max-width: 240px"
        @update:model-value="recargar()"
      />
      <BaseRangoFechas
        v-model:desde="params.registro_desde as string"
        v-model:hasta="params.registro_hasta as string"
        label="Fecha de registro"
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
          <BaseChipEstado :estado="{ codigo: 'BORRADOR', nombre: 'Borrador', color: 'grey' }" />
          <BaseChipEstado :estado="{ codigo: 'PUBLICADA', nombre: 'Convocatoria Vigente', color: 'success' }" />
          <BaseChipEstado :estado="{ codigo: 'EN_EVALUACION', nombre: 'Convocatoria en Evaluación', color: 'info' }" />
          <BaseChipEstado :estado="{ codigo: 'ADJUDICADA', nombre: 'Convocatoria Adjudicada', color: 'primary' }" />
          <BaseChipEstado :estado="{ codigo: 'DESIERTA', nombre: 'Convocatoria Desierta', color: 'warning' }" />
          <BaseChipEstado :estado="{ codigo: 'CANCELADA', nombre: 'Convocatoria Cancelada', color: 'error' }" />
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
      mensaje-vacio="Aún no has creado convocatorias."
    >
      <template #item.acciones="{ item }">
        <div class="d-flex align-center ga-1">
          <template v-if="item.estado.codigo === 'BORRADOR'">
            <v-btn
              v-can="'convocatorias.editar'"
              :to="`/app/convocatorias/${item.convocatoria_id}`"
              icon
              variant="text"
              size="small"
              color="primary"
            >
              <v-icon icon="mdi-pencil-outline" />
              <v-tooltip activator="parent" location="top">Editar borrador</v-tooltip>
            </v-btn>
          </template>
          <template v-else-if="item.estado.codigo === 'ADJUDICADA' || (item.estado.codigo === 'DESIERTA' && item.numero_indagacion)">
            <v-btn
              :to="`/app/convocatorias/${item.convocatoria_id}/resultados`"
              icon
              variant="text"
              size="small"
              color="info"
            >
              <v-icon icon="mdi-file-chart-outline" />
              <v-tooltip activator="parent" location="top">Ver resultados</v-tooltip>
            </v-btn>
          </template>
          <template v-else>
            <v-btn
              :to="`/app/convocatorias/${item.convocatoria_id}`"
              icon
              variant="text"
              size="small"
              color="primary"
            >
              <v-icon icon="mdi-eye-outline" />
              <v-tooltip activator="parent" location="top">Ver detalle</v-tooltip>
            </v-btn>
          </template>
          <v-btn
            v-if="['BORRADOR', 'PUBLICADA', 'EN_EVALUACION'].includes(item.estado.codigo)"
            v-can="'convocatorias.cancelar'"
            icon
            variant="text"
            size="small"
            color="error"
            @click="pedirCancelar(item.convocatoria_id)"
          >
            <v-icon icon="mdi-close-circle-outline" />
            <v-tooltip activator="parent" location="top">Cancelar convocatoria</v-tooltip>
          </v-btn>
        </div>
      </template>
      <template #item.numero="{ item }">
        <div class="text-no-wrap">{{ item.numero ?? '— borrador' }}</div>
        <div v-if="item.requerimiento_numero" class="text-caption text-medium-emphasis text-no-wrap">
          <v-icon icon="mdi-file-document-outline" size="12" />
          Req. {{ item.requerimiento_numero }}
        </div>
      </template>
      <template #item.numero_indagacion="{ item }">
        <span v-if="item.numero_indagacion" class="text-no-wrap">{{ item.numero_indagacion }}</span>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template #item.fecha_registro="{ item }">
        {{ dayjs(item.fecha_registro).tz().format('DD/MM/YYYY HH:mm') }}
      </template>
      <template #item.fechas="{ item }">
        <div class="d-flex align-center ga-2 text-no-wrap">
          <span>{{ dayjs(item.fecha_inicio).tz().format('DD/MM/YYYY') }} — {{ dayjs(item.fecha_fin).tz().format('DD/MM/YYYY') }}</span>
          <v-tooltip v-if="contadorCierre(item)" location="top" max-width="300">
            <template #activator="{ props: tooltipProps }">
              <v-chip
                v-bind="tooltipProps"
                :color="contadorCierre(item)!.color"
                :prepend-icon="contadorCierre(item)!.icono"
                variant="tonal"
                size="x-small"
                label
              >
                {{ contadorCierre(item)!.texto }}
              </v-chip>
            </template>
            {{ contadorCierre(item)!.detalle }}
          </v-tooltip>
        </div>
      </template>
      <template #item.estado="{ item }"><BaseChipEstado :estado="item.estado" /></template>
      <template #item.motivo_cierre="{ item }">
        <v-tooltip v-if="item.motivo_cierre" location="top" max-width="320">
          <template #activator="{ props: tooltipProps }">
            <span v-bind="tooltipProps" class="text-truncate d-inline-block" style="max-width: 220px">
              {{ item.motivo_cierre }}
            </span>
          </template>
          {{ item.motivo_cierre }}
        </v-tooltip>
        <span v-else>—</span>
      </template>
    </BaseTablaServidor>

    <BaseConfirmacion
      v-model:abierto="cancelarAbierto"
      titulo="Cancelar convocatoria"
      mensaje="Esta acción cierra la convocatoria de forma definitiva y notifica a los postores. Indica el motivo."
      texto-confirmar="Cancelar convocatoria"
      pedir-motivo
      :cargando="cancelando"
      @confirmar="confirmarCancelar"
    />
  </v-container>
</template>

<style scoped>
/* El `variant="outlined"` que tenía esta tarjeta dibuja su borde con
   `currentColor` (negro/gris oscuro en Material Design por defecto), no con
   el `--border-color` suave del tema (05C hardening, reportado por el
   usuario: "el border negro se ve muy mal"). Se reemplaza por una sombra
   básica, sin borde. */
.leyenda-estados {
  box-shadow: var(--sombra-1);
}
</style>

