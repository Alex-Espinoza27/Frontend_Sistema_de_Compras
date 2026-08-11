<script setup lang="ts">
// I5 — Catálogo de tipos de comprobante (05B).
import { reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import type { TipoComprobanteAdmin } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const ui = useUiStore()
const items = ref<TipoComprobanteAdmin[]>([])
const cargando = ref(true)
async function cargar() {
  cargando.value = true
  items.value = await adminApi.tiposComprobante()
  cargando.value = false
}
cargar()

const abierto = ref(false)
const editando = ref<TipoComprobanteAdmin | null>(null)
const form = reactive({ codigo: '', nombre: '', incluye_igv: true })
const guardando = ref(false)
const erroresCampo = ref<Record<string, string[]>>({})

function abrirNuevo() {
  editando.value = null
  form.codigo = ''
  form.nombre = ''
  form.incluye_igv = true
  erroresCampo.value = {}
  abierto.value = true
}
function abrirEditar(item: TipoComprobanteAdmin) {
  editando.value = item
  form.codigo = item.codigo
  form.nombre = item.nombre
  form.incluye_igv = item.incluye_igv
  erroresCampo.value = {}
  abierto.value = true
}
async function guardar() {
  guardando.value = true
  erroresCampo.value = {}
  try {
    if (editando.value) {
      await adminApi.actualizarTipoComprobante(editando.value.tipo_comprobante_id, { ...form })
      ui.mostrarSnackbar('Tipo de comprobante actualizado.', 'success')
    } else {
      await adminApi.crearTipoComprobante({ ...form })
      ui.mostrarSnackbar('Tipo de comprobante creado.', 'success')
    }
    abierto.value = false
    await cargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    erroresCampo.value = error.response?.data?.errores ?? {}
  } finally {
    guardando.value = false
  }
}

const eliminarAbierto = ref(false)
const eliminarId = ref<number | null>(null)
const eliminando = ref(false)
const errorEliminar = ref('')
function pedirEliminar(id: number) {
  eliminarId.value = id
  errorEliminar.value = ''
  eliminarAbierto.value = true
}
async function confirmarEliminar() {
  if (!eliminarId.value) return
  eliminando.value = true
  try {
    await adminApi.eliminarTipoComprobante(eliminarId.value)
    eliminarAbierto.value = false
    ui.mostrarSnackbar('Tipo de comprobante eliminado.', 'success')
    await cargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorEliminar.value = error.response?.data?.mensaje ?? 'No se pudo eliminar.'
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <div>
    <div class="d-flex justify-end mb-4">
      <v-btn prepend-icon="mdi-plus" @click="abrirNuevo">Nuevo tipo</v-btn>
    </div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />
    <v-table v-else density="comfortable">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre</th>
          <th>Incluye IGV</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.tipo_comprobante_id">
          <td>{{ item.codigo }}</td>
          <td>{{ item.nombre }}</td>
          <td><v-icon v-if="item.incluye_igv" icon="mdi-check" /></td>
          <td>
            <v-btn variant="text" size="small" @click="abrirEditar(item)">Editar</v-btn>
            <v-btn variant="text" size="small" color="error" @click="pedirEliminar(item.tipo_comprobante_id)">
              Eliminar
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="abierto" max-width="420">
      <v-card>
        <v-card-title class="text-titulo">{{ editando ? 'Editar tipo' : 'Nuevo tipo' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.codigo" label="Código" :error-messages="erroresCampo.codigo" class="mb-2" />
          <v-text-field v-model="form.nombre" label="Nombre" :error-messages="erroresCampo.nombre" class="mb-2" />
          <v-switch v-model="form.incluye_igv" label="Incluye IGV" hide-details />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="abierto = false">Cancelar</v-btn>
          <v-btn :loading="guardando" @click="guardar">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <BaseConfirmacion
      v-model:abierto="eliminarAbierto"
      titulo="Eliminar tipo de comprobante"
      :mensaje="`Esta acción no se puede deshacer. ${errorEliminar}`"
      texto-confirmar="Eliminar"
      :cargando="eliminando"
      @confirmar="confirmarEliminar"
    />
  </div>
</template>
