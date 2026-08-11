<script setup lang="ts">
// H1 — Bandeja de entidades (05B). Acciones contextuales según estado.
import { ref } from 'vue'

import { entidadesApi } from '@/api/entidades.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { EntidadListaItem } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()

const { items, paginacion, cargando, params, recargar } = useListado<EntidadListaItem>(entidadesApi.index, {
  ordenar_por: 'razon_social',
})

const opcionesEstado = [
  { title: 'Solicitada', value: 'SOLICITADA' },
  { title: 'Aprobada', value: 'APROBADA' },
  { title: 'Observada', value: 'OBSERVADA' },
  { title: 'Rechazada', value: 'RECHAZADA' },
  { title: 'Suspendida', value: 'SUSPENDIDA' },
]

// `sortable` refleja lo que soporta `EntidadController::index`
// (razon_social/fecha_solicitud, 05C hardening).
const cabeceras = [
  { title: 'RUC', key: 'numero_documento', sortable: false },
  { title: 'Razón social', key: 'razon_social' },
  { title: 'Sigla', key: 'sigla', sortable: false },
  { title: 'Estado', key: 'estado', sortable: false },
  { title: 'Fecha de solicitud', key: 'fecha_solicitud' },
  { title: 'N.º convocatorias', key: 'convocatorias_total', sortable: false },
  { title: '', key: 'acciones', sortable: false },
]

// --- Observar / Rechazar (motivo obligatorio) -------------------------------
const motivoAbierto = ref(false)
const motivoId = ref<number | null>(null)
const motivoAccion = ref<'observar' | 'rechazar' | 'suspender'>('observar')
const motivoCargando = ref(false)
function pedirMotivo(id: number, accion: typeof motivoAccion.value) {
  motivoId.value = id
  motivoAccion.value = accion
  motivoAbierto.value = true
}
const titulosMotivo: Record<typeof motivoAccion.value, string> = {
  observar: 'Observar entidad',
  rechazar: 'Rechazar solicitud',
  suspender: 'Suspender entidad',
}
async function confirmarMotivo(motivo: string | undefined) {
  if (!motivoId.value || !motivo) return
  motivoCargando.value = true
  try {
    await entidadesApi[motivoAccion.value](motivoId.value, motivo)
    motivoAbierto.value = false
    ui.mostrarSnackbar('Acción registrada.', 'success')
    recargar()
  } finally {
    motivoCargando.value = false
  }
}

// --- Reactivar ---------------------------------------------------------------
async function reactivar(id: number) {
  await entidadesApi.reactivar(id)
  ui.mostrarSnackbar('Entidad reactivada.', 'success')
  recargar()
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Entidades</div>
      <v-btn to="/app/entidades/nueva" prepend-icon="mdi-plus">Alta directa</v-btn>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        v-model="params.buscar"
        label="Buscar por razón social, RUC o sigla"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 320px"
        clearable
      />
      <v-select
        v-model="params.estado"
        :items="opcionesEstado"
        label="Estado"
        clearable
        style="max-width: 200px"
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
      mensaje-vacio="No hay entidades registradas."
    >
      <template #item.estado="{ item }"><BaseChipEstado :estado="item.estado" /></template>
      <template #item.acciones="{ item }">
        <template v-if="['SOLICITADA', 'OBSERVADA'].includes(item.estado.codigo)">
          <v-btn :to="`/app/entidades/${item.entidad_id}`" variant="text" size="small">Aprobar</v-btn>
          <v-btn v-if="item.estado.codigo === 'SOLICITADA'" variant="text" size="small" @click="pedirMotivo(item.entidad_id, 'observar')">
            Observar
          </v-btn>
          <v-btn variant="text" size="small" color="error" @click="pedirMotivo(item.entidad_id, 'rechazar')">
            Rechazar
          </v-btn>
        </template>
        <template v-else-if="item.estado.codigo === 'APROBADA'">
          <v-btn :to="`/app/entidades/${item.entidad_id}`" variant="text" size="small">Ver</v-btn>
          <v-btn variant="text" size="small" color="error" @click="pedirMotivo(item.entidad_id, 'suspender')">
            Suspender
          </v-btn>
        </template>
        <template v-else-if="item.estado.codigo === 'SUSPENDIDA'">
          <v-btn :to="`/app/entidades/${item.entidad_id}`" variant="text" size="small">Ver</v-btn>
          <v-btn variant="text" size="small" @click="reactivar(item.entidad_id)">Reactivar</v-btn>
        </template>
        <template v-else>
          <v-btn :to="`/app/entidades/${item.entidad_id}`" variant="text" size="small">Ver</v-btn>
        </template>
      </template>
    </BaseTablaServidor>

    <BaseConfirmacion
      v-model:abierto="motivoAbierto"
      :titulo="titulosMotivo[motivoAccion]"
      mensaje="Esta acción notifica a la entidad por correo con el motivo indicado."
      :texto-confirmar="titulosMotivo[motivoAccion]"
      pedir-motivo
      :cargando="motivoCargando"
      @confirmar="confirmarMotivo"
    />
  </v-container>
</template>
