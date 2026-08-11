<script setup lang="ts">
// Catálogo de Áreas por entidad (05C hardening) — reemplaza el texto libre
// "Área usuaria" de Requerimientos por un catálogo con buscador y
// activo/inactivo (no se elimina, se desactiva: `AreaController` no expone
// destroy()).
import { reactive, ref } from 'vue'

import { areasApi } from '@/api/areas.api'
import { entidadesApi } from '@/api/entidades.api'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { AreaItem } from '@/modules/entidad/entidad.types'
import type { EntidadListaItem } from '@/modules/muni/muni.types'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

interface ErrorApi {
  response?: { data?: { errores?: Record<string, string[]> } }
}

const ui = useUiStore()
const auth = useAuthStore()
const esEntidad = auth.usuario?.rol === 'ENTIDAD'

// ADMINISTRADOR no tiene entidad propia — gestiona las áreas de la entidad
// que elija explícitamente (05C hardening; `AreaController` exige
// `entidad_id` para ese rol).
const entidades = ref<EntidadListaItem[]>([])
if (!esEntidad) {
  entidadesApi.index({ estado: 'APROBADA', ordenar_por: 'razon_social', por_pagina: 100 }).then((data) => (entidades.value = data.items))
}

const { items, paginacion, cargando, params, recargar } = useListado<AreaItem>(areasApi.index, {
  ordenar_por: 'nombre',
  direccion: 'asc',
})

const cabeceras = [
  { title: 'Nombre', key: 'nombre' },
  { title: 'Sigla', key: 'sigla', sortable: false },
  { title: 'Estado', key: 'activo', sortable: false },
  { title: '', key: 'acciones', sortable: false },
]

const abierto = ref(false)
const editando = ref<AreaItem | null>(null)
const form = reactive({ nombre: '', sigla: '' })
const guardando = ref(false)
const erroresCampo = ref<Record<string, string[]>>({})

function abrirNuevo() {
  editando.value = null
  form.nombre = ''
  form.sigla = ''
  erroresCampo.value = {}
  abierto.value = true
}
function abrirEditar(item: AreaItem) {
  editando.value = item
  form.nombre = item.nombre
  form.sigla = item.sigla ?? ''
  erroresCampo.value = {}
  abierto.value = true
}
async function guardar() {
  guardando.value = true
  erroresCampo.value = {}
  try {
    const sigla = form.sigla.trim() || null
    if (editando.value) {
      await areasApi.update(editando.value.area_id, { nombre: form.nombre, sigla, activo: editando.value.activo })
      ui.mostrarSnackbar('Área actualizada.', 'success')
    } else {
      await areasApi.store({ nombre: form.nombre, sigla, entidad_id: params.entidad_id as number | null })
      ui.mostrarSnackbar('Área creada.', 'success')
    }
    abierto.value = false
    await recargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    erroresCampo.value = error.response?.data?.errores ?? {}
  } finally {
    guardando.value = false
  }
}

async function alternarActivo(item: AreaItem) {
  try {
    await areasApi.update(item.area_id, { nombre: item.nombre, sigla: item.sigla, activo: !item.activo })
    ui.mostrarSnackbar(item.activo ? 'Área desactivada.' : 'Área activada.', 'success')
    await recargar()
  } catch {
    // El snackbar global ya informa el error de validación/permiso.
  }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Áreas</div>
      <v-btn prepend-icon="mdi-plus" :disabled="!esEntidad && !params.entidad_id" @click="abrirNuevo">Nueva área</v-btn>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-select
        v-if="!esEntidad"
        v-model="params.entidad_id as number"
        :items="entidades.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
        label="Entidad *"
        clearable
        style="max-width: 260px"
        @update:model-value="recargar()"
      />
      <v-text-field
        v-model="params.buscar"
        label="Buscar por nombre"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 280px"
        clearable
      />
    </div>

    <v-alert v-if="!esEntidad && !params.entidad_id" type="info" density="compact" class="mb-4">
      Elige una entidad para ver y crear sus áreas.
    </v-alert>

    <BaseTablaServidor
      v-model:page="params.pagina"
      v-model:items-per-page="params.por_pagina"
      v-model:ordenar-por="params.ordenar_por"
      v-model:direccion="params.direccion"
      :headers="cabeceras"
      :items="items"
      :items-length="paginacion.total"
      :loading="cargando"
      mensaje-vacio="Aún no has creado áreas."
    >
      <template #item.sigla="{ item }">{{ item.sigla ?? '—' }}</template>
      <template #item.activo="{ item }">
        <v-switch
          :model-value="item.activo"
          color="primary"
          density="compact"
          hide-details
          @update:model-value="alternarActivo(item)"
        />
      </template>
      <template #item.acciones="{ item }">
        <v-btn variant="text" size="small" @click="abrirEditar(item)">Editar</v-btn>
      </template>
    </BaseTablaServidor>

    <v-dialog v-model="abierto" max-width="420">
      <v-card>
        <v-card-title class="text-titulo">{{ editando ? 'Editar área' : 'Nueva área' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.nombre" label="Nombre" :maxlength="150" :error-messages="erroresCampo.nombre" class="mb-2" />
          <v-text-field v-model="form.sigla" label="Sigla (opcional)" :maxlength="20" :error-messages="erroresCampo.sigla" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="abierto = false">Cancelar</v-btn>
          <v-btn :loading="guardando" @click="guardar">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
