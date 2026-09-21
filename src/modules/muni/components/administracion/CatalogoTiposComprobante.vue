<script setup lang="ts">
// I5 — Catálogo de tipos de comprobante (05B). "Eliminar" no existe (05C
// hardening, pedido explícitamente por el usuario): se desactiva en vez de
// borrarse — mismo patrón que `AreasView.vue`. Un tipo inactivo deja de
// ofrecerse en el formulario de postulación (`OfertaController::postulacion`).
import { reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import type { TipoComprobanteAdmin } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'
import { requerido } from '@/utils/validaciones'

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

const cabeceras = [
  { title: 'Código', key: 'codigo' },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Incluye IGV', key: 'incluye_igv' },
  { title: 'Estado', key: 'activo' },
  { title: '', key: 'acciones', sortable: false },
]

const abierto = ref(false)
const formValido = ref(false)
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
  if (!formValido.value) return
  guardando.value = true
  erroresCampo.value = {}
  try {
    if (editando.value) {
      await adminApi.actualizarTipoComprobante(editando.value.tipo_comprobante_id, { ...form, activo: editando.value.activo })
      ui.mostrarSnackbar('Tipo de comprobante actualizado.', 'success')
    } else {
      await adminApi.crearTipoComprobante({ ...form, activo: true })
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

async function alternarActivo(item: TipoComprobanteAdmin) {
  try {
    await adminApi.actualizarTipoComprobante(item.tipo_comprobante_id, {
      codigo: item.codigo,
      nombre: item.nombre,
      incluye_igv: item.incluye_igv,
      activo: !item.activo,
    })
    ui.mostrarSnackbar(item.activo ? 'Tipo de comprobante desactivado.' : 'Tipo de comprobante activado.', 'success')
    await cargar()
  } catch {
    // El snackbar global ya informa el error.
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
          <th v-for="c in cabeceras" :key="c.key">{{ c.title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.tipo_comprobante_id">
          <td>{{ item.codigo }}</td>
          <td>{{ item.nombre }}</td>
          <td><v-icon v-if="item.incluye_igv" icon="mdi-check" /></td>
          <td>
            <v-switch
              :model-value="item.activo"
              color="primary"
              density="compact"
              hide-details
              @update:model-value="alternarActivo(item)"
            />
          </td>
          <td>
            <v-btn variant="text" size="small" @click="abrirEditar(item)">Editar</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="abierto" max-width="420">
      <v-card>
        <v-card-title class="text-titulo">{{ editando ? 'Editar tipo' : 'Nuevo tipo' }}</v-card-title>
        <v-card-text>
          <v-form v-model="formValido">
            <v-text-field
              v-model="form.codigo"
              label="Código"
              :maxlength="20"
              :rules="[requerido()]"
              :error-messages="erroresCampo.codigo"
              class="mb-2"
            />
            <v-text-field
              v-model="form.nombre"
              label="Nombre"
              :maxlength="60"
              :rules="[requerido()]"
              :error-messages="erroresCampo.nombre"
              class="mb-2"
            />
            <!-- Color explícito (05C hardening, pedido explícitamente por el
                 usuario): sin `color`, el switch encendido/apagado no se
                 distinguía en ningún tema. -->
            <v-switch v-model="form.incluye_igv" label="Incluye IGV" color="primary" hide-details />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="abierto = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardando" :disabled="!formValido" @click="guardar">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
