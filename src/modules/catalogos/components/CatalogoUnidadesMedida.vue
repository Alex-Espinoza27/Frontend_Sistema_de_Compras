<script setup lang="ts">
// Catálogo de unidades de medida (Sin paginación).
import { reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import type { UnidadMedidaAdmin } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'
import { requerido } from '@/utils/validaciones'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const ui = useUiStore()
const items = ref<UnidadMedidaAdmin[]>([])
const cargando = ref(true)
async function cargar() {
  cargando.value = true
  items.value = await adminApi.unidadesMedida()
  cargando.value = false
}
cargar()

const cabeceras = [
  { title: 'Código', key: 'codigo' },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Estado', key: 'activo' },
  { title: '', key: 'acciones', sortable: false },
]

const abierto = ref(false)
const formValido = ref(false)
const editando = ref<UnidadMedidaAdmin | null>(null)
const form = reactive({ codigo: '', nombre: '' })
const guardando = ref(false)
const erroresCampo = ref<Record<string, string[]>>({})

function abrirNuevo() {
  editando.value = null
  form.codigo = ''
  form.nombre = ''
  erroresCampo.value = {}
  abierto.value = true
}
function abrirEditar(item: UnidadMedidaAdmin) {
  editando.value = item
  form.codigo = item.codigo
  form.nombre = item.nombre
  erroresCampo.value = {}
  abierto.value = true
}
async function guardar() {
  if (!formValido.value) return
  guardando.value = true
  erroresCampo.value = {}
  try {
    if (editando.value) {
      await adminApi.actualizarUnidadMedida(editando.value.unidad_medida_id, { ...form, activo: editando.value.activo })
      ui.mostrarSnackbar('Unidad de medida actualizada.', 'success')
    } else {
      await adminApi.crearUnidadMedida({ ...form, activo: true })
      ui.mostrarSnackbar('Unidad de medida creada.', 'success')
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

async function alternarActivo(item: UnidadMedidaAdmin) {
  try {
    await adminApi.actualizarUnidadMedida(item.unidad_medida_id, { codigo: item.codigo, nombre: item.nombre, activo: !item.activo })
    ui.mostrarSnackbar(item.activo ? 'Unidad de medida desactivada.' : 'Unidad de medida activada.', 'success')
    await cargar()
  } catch {
    // El snackbar global ya informa el error.
  }
}
</script>

<template>
  <div>
    <div class="d-flex justify-end mb-4">
      <v-btn prepend-icon="mdi-plus" @click="abrirNuevo">Nueva unidad</v-btn>
    </div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />
    <v-table v-else density="comfortable">
      <thead>
        <tr>
          <th v-for="c in cabeceras" :key="c.key">{{ c.title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.unidad_medida_id">
          <td>{{ item.codigo }}</td>
          <td>{{ item.nombre }}</td>
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
        <v-card-title class="text-titulo">{{ editando ? 'Editar unidad' : 'Nueva unidad' }}</v-card-title>
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
            />
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
