<script setup lang="ts">
// J3 — Auditoría (05B). Tabla de solo lectura + detalle con visor JSON
// monoespaciado (antes/después). `modulo`/`tabla` son texto libre en el
// backend (sin catálogo) — se ofrecen los módulos conocidos como sugerencia
// vía combobox, pero el usuario puede escribir cualquier otro valor.
import { computed, ref } from 'vue'

import { auditoriaApi } from '@/api/auditoria.api'
import BaseDatePicker from '@/components/base/BaseDatePicker.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useDescarga } from '@/composables/useDescarga'
import { useListado } from '@/composables/useListado'
import dayjs from '@/plugins/dayjs'
import type { AuditoriaDetalle, AuditoriaListaItem } from '@/modules/transversales/transversales.types'

const { items, paginacion, cargando, params, recargar } = useListado<AuditoriaListaItem>(auditoriaApi.index, {
  direccion: 'desc',
})

const opcionesAccion = [
  { title: 'Login', value: 'LOGIN' },
  { title: 'Crear', value: 'CREAR' },
  { title: 'Actualizar', value: 'ACTUALIZAR' },
  { title: 'Eliminar', value: 'ELIMINAR' },
  { title: 'Publicar', value: 'PUBLICAR' },
  { title: 'Evaluar', value: 'EVALUAR' },
  { title: 'Adjudicar', value: 'ADJUDICAR' },
  { title: 'Desierta', value: 'DESIERTA' },
  { title: 'Cancelar', value: 'CANCELAR' },
]
const modulosConocidos = [
  'REQUERIMIENTOS',
  'CONVOCATORIAS',
  'OFERTAS',
  'EVALUACION',
  'ADJUDICACION',
  'ENTIDADES',
  'PROVEEDORES',
  'AUTENTICACION',
]

// ListadoParams tipa cada filtro ad-hoc como `unknown`; v-combobox exige
// `string | null` en su v-model (a diferencia de v-select, más laxo).
const moduloFiltro = computed<string | null>({
  get: () => (params.modulo as string | undefined) ?? null,
  set: (valor) => {
    params.modulo = valor ?? undefined
  },
})

// `AuditoriaController::index` siempre ordena por AUDI_FECHA (no lee
// ordenar_por, 05C hardening); solo "Fecha" es realmente ordenable — el
// resto no tiene ningún campo de orden propio en el backend.
const cabeceras = [
  { title: 'Fecha', key: 'fecha' },
  { title: 'Usuario', key: 'usuario', sortable: false },
  { title: 'Módulo', key: 'modulo', sortable: false },
  { title: 'Acción', key: 'accion', sortable: false },
  { title: 'Tabla', key: 'tabla', sortable: false },
  { title: 'IP', key: 'ip', sortable: false },
  { title: '', key: 'acciones', sortable: false },
]

const detalleAbierto = ref(false)
const detalle = ref<AuditoriaDetalle | null>(null)
const cargandoDetalle = ref(false)
async function verDetalle(id: number) {
  detalleAbierto.value = true
  cargandoDetalle.value = true
  try {
    detalle.value = await auditoriaApi.show(id)
  } finally {
    cargandoDetalle.value = false
  }
}

const { descargar } = useDescarga()
function exportar() {
  descargar(auditoriaApi.exportarXlsxUrl({ ...params }), 'auditoria.xlsx')
}
</script>

<template>
  <v-container class="py-8" fluid>
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Auditoría</div>
      <v-btn variant="tonal" prepend-icon="mdi-file-excel-outline" @click="exportar">Excel</v-btn>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        v-model="params.buscar"
        label="Buscar por endpoint o módulo"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 260px"
        clearable
      />
      <v-combobox
        v-model="moduloFiltro"
        :items="modulosConocidos"
        label="Módulo"
        clearable
        style="max-width: 200px"
        @update:model-value="recargar()"
      />
      <v-select
        v-model="params.accion"
        :items="opcionesAccion"
        label="Acción"
        clearable
        style="max-width: 180px"
        @update:model-value="recargar()"
      />
      <v-text-field
        v-model="params.tabla"
        label="Tabla"
        style="max-width: 160px"
        @update:model-value="recargar()"
      />
      <BaseDatePicker
        v-model="params.desde as string"
        label="Desde"
        clearable
        style="max-width: 180px"
        @update:model-value="recargar()"
      />
      <BaseDatePicker
        v-model="params.hasta as string"
        label="Hasta"
        clearable
        style="max-width: 180px"
        @update:model-value="recargar()"
      />
    </div>

    <BaseTablaServidor
      v-model:page="params.pagina"
      v-model:items-per-page="params.por_pagina"
      v-model:ordenar-por="params.ordenar_por"
      v-model:direccion="params.direccion"
      :headers="cabeceras"
      :items="items"
      :items-length="paginacion.total"
      :loading="cargando"
      item-value="auditoria_id"
      mensaje-vacio="No hay registros para estos filtros."
    >
      <template #item.fecha="{ item }">{{ dayjs(item.fecha).format('DD/MM/YYYY HH:mm') }}</template>
      <template #item.usuario="{ item }">{{ item.usuario?.nombre ?? '—' }}</template>
      <template #item.acciones="{ item }">
        <v-btn variant="text" size="small" @click="verDetalle(item.auditoria_id)">Ver detalle</v-btn>
      </template>
    </BaseTablaServidor>

    <v-dialog v-model="detalleAbierto" max-width="720">
      <v-card>
        <v-card-title class="text-titulo">Detalle de auditoría</v-card-title>
        <v-card-text>
          <v-progress-circular v-if="cargandoDetalle" indeterminate color="primary" />
          <template v-else-if="detalle">
            <v-row dense class="text-body-2 mb-4">
              <v-col cols="12" sm="6">Usuario: {{ detalle.usuario?.nombre ?? 'Sistema' }}</v-col>
              <v-col v-if="detalle.usuario" cols="12" sm="6">Correo: {{ detalle.usuario.correo }}</v-col>
              <v-col cols="12" sm="6">Módulo: {{ detalle.modulo }}</v-col>
              <v-col cols="12" sm="6">Acción: {{ detalle.accion }}</v-col>
              <v-col cols="12" sm="6">Tabla: {{ detalle.tabla }} (#{{ detalle.registro_id }})</v-col>
              <v-col cols="12" sm="6">Fecha: {{ dayjs(detalle.fecha).format('DD/MM/YYYY HH:mm:ss') }}</v-col>
              <v-col cols="12" sm="6">IP: {{ detalle.ip ?? '—' }}</v-col>
              <v-col cols="12">Endpoint: {{ detalle.endpoint ?? '—' }}</v-col>
              <v-col cols="12">User-Agent: {{ detalle.user_agent ?? '—' }}</v-col>
            </v-row>

            <div class="text-subtitle-2 mb-1">Valor anterior</div>
            <pre class="text-datos pa-2 mb-4 bg-surface-variant rounded">{{ JSON.stringify(detalle.valor_anterior, null, 2) ?? '—' }}</pre>

            <div class="text-subtitle-2 mb-1">Valor nuevo</div>
            <pre class="text-datos pa-2 bg-surface-variant rounded">{{ JSON.stringify(detalle.valor_nuevo, null, 2) ?? '—' }}</pre>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="detalleAbierto = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
