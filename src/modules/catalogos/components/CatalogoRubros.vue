<script setup lang="ts">
// Catálogo de rubros (Sin paginación, el backend devuelve todo).
import { reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import type { RubroAdmin, TipoRubro } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'
import { requerido } from '@/utils/validaciones'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const ui = useUiStore()
const items = ref<RubroAdmin[]>([])
const cargando = ref(true)
async function cargar() {
  cargando.value = true
  items.value = await adminApi.rubros()
  cargando.value = false
}
cargar()

const cabeceras = [
  { title: 'Tipo', key: 'tipo' },
  { title: 'Código', key: 'codigo' },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Estado', key: 'activo' },
  { title: '', key: 'acciones', sortable: false },
]

const abierto = ref(false)
const formValido = ref(false)
const editando = ref<RubroAdmin | null>(null)
const form = reactive({ tipo: 'SERVICIO' as TipoRubro, codigo: '', nombre: '' })
const guardando = ref(false)
const erroresCampo = ref<Record<string, string[]>>({})

function abrirNuevo() {
  editando.value = null
  form.tipo = 'SERVICIO'
  form.codigo = ''
  form.nombre = ''
  erroresCampo.value = {}
  abierto.value = true
}
function abrirEditar(item: RubroAdmin) {
  editando.value = item
  form.tipo = item.tipo
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
      await adminApi.actualizarRubro(editando.value.rubro_id, { ...form, activo: editando.value.activo })
      ui.mostrarSnackbar('Rubro actualizado.', 'success')
    } else {
      await adminApi.crearRubro({ ...form, activo: true })
      ui.mostrarSnackbar('Rubro creado.', 'success')
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

async function alternarActivo(item: RubroAdmin) {
  try {
    await adminApi.actualizarRubro(item.rubro_id, { tipo: item.tipo, codigo: item.codigo, nombre: item.nombre, activo: !item.activo })
    ui.mostrarSnackbar(item.activo ? 'Rubro desactivado.' : 'Rubro activado.', 'success')
    await cargar()
  } catch {
    // El snackbar global ya informa el error.
  }
}
</script>

<template>
  <div>
    <div class="d-flex justify-end mb-4">
      <v-btn prepend-icon="mdi-plus" @click="abrirNuevo">Nuevo rubro</v-btn>
    </div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />
    <v-table v-else density="comfortable">
      <thead>
        <tr>
          <th v-for="c in cabeceras" :key="c.key">{{ c.title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.rubro_id">
          <td>{{ item.tipo === 'BIEN' ? 'Bien' : 'Servicio' }}</td>
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
        <v-card-title class="text-titulo">{{ editando ? 'Editar rubro' : 'Nuevo rubro' }}</v-card-title>
        <v-card-text>
          <v-form v-model="formValido">
            <v-select
              v-model="form.tipo"
              :items="[
                { title: 'Bien', value: 'BIEN' },
                { title: 'Servicio', value: 'SERVICIO' },
              ]"
              label="Tipo"
              class="mb-2"
            />
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
              :maxlength="100"
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
