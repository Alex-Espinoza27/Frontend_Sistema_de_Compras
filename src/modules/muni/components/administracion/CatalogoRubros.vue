<script setup lang="ts">
// I5 — Catálogo de rubros (05B). Sin paginación (el backend devuelve todo).
import { reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import type { RubroAdmin, TipoRubro } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'

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
  { title: '', key: 'acciones', sortable: false },
]

const abierto = ref(false)
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
  guardando.value = true
  erroresCampo.value = {}
  try {
    if (editando.value) {
      await adminApi.actualizarRubro(editando.value.rubro_id, { ...form })
      ui.mostrarSnackbar('Rubro actualizado.', 'success')
    } else {
      await adminApi.crearRubro({ ...form })
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
    await adminApi.eliminarRubro(eliminarId.value)
    eliminarAbierto.value = false
    ui.mostrarSnackbar('Rubro eliminado.', 'success')
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
            <v-btn variant="text" size="small" @click="abrirEditar(item)">Editar</v-btn>
            <v-btn variant="text" size="small" color="error" @click="pedirEliminar(item.rubro_id)">Eliminar</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="abierto" max-width="420">
      <v-card>
        <v-card-title class="text-titulo">{{ editando ? 'Editar rubro' : 'Nuevo rubro' }}</v-card-title>
        <v-card-text>
          <v-select
            v-model="form.tipo"
            :items="[
              { title: 'Bien', value: 'BIEN' },
              { title: 'Servicio', value: 'SERVICIO' },
            ]"
            label="Tipo"
            class="mb-2"
          />
          <v-text-field v-model="form.codigo" label="Código" :error-messages="erroresCampo.codigo" class="mb-2" />
          <v-text-field v-model="form.nombre" label="Nombre" :error-messages="erroresCampo.nombre" />
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
      titulo="Eliminar rubro"
      :mensaje="`Esta acción no se puede deshacer. ${errorEliminar}`"
      texto-confirmar="Eliminar"
      :cargando="eliminando"
      @confirmar="confirmarEliminar"
    />
  </div>
</template>
