<script setup lang="ts">
// I5 — Catálogo de estados (05B). `color` no tiene enum en el backend
// (string libre max:20), pero solo estos 6 valores existen como color de
// tema en Vuetify (05D §2.3 / types/api.ts `ColorEstado`) — cualquier otro
// rompería BaseChipEstado en toda la app, así que se restringe aquí.
import { reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import type { ContextoEstado, EstadoAdmin } from '@/modules/muni/muni.types'
import type { ColorEstado } from '@/types/api'
import { useUiStore } from '@/stores/ui.store'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const ui = useUiStore()
const items = ref<EstadoAdmin[]>([])
const cargando = ref(true)
async function cargar() {
  cargando.value = true
  items.value = await adminApi.estados()
  cargando.value = false
}
cargar()

const opcionesContexto: { title: string; value: ContextoEstado }[] = [
  { title: 'Convocatoria', value: 'CONVOCATORIA' },
  { title: 'Oferta', value: 'OFERTA' },
  { title: 'Entidad', value: 'ENTIDAD' },
  { title: 'Proveedor', value: 'PROVEEDOR' },
]
const opcionesColor: ColorEstado[] = ['info', 'success', 'warning', 'error', 'grey', 'primary']

const abierto = ref(false)
const editando = ref<EstadoAdmin | null>(null)
const form = reactive({
  contexto: 'CONVOCATORIA' as ContextoEstado,
  codigo: '',
  nombre: '',
  color: 'info' as ColorEstado,
  orden: 1,
})
const guardando = ref(false)
const erroresCampo = ref<Record<string, string[]>>({})

function abrirNuevo() {
  editando.value = null
  form.contexto = 'CONVOCATORIA'
  form.codigo = ''
  form.nombre = ''
  form.color = 'info'
  form.orden = 1
  erroresCampo.value = {}
  abierto.value = true
}
function abrirEditar(item: EstadoAdmin) {
  editando.value = item
  form.contexto = item.contexto
  form.codigo = item.codigo
  form.nombre = item.nombre
  form.color = item.color as ColorEstado
  form.orden = item.orden
  erroresCampo.value = {}
  abierto.value = true
}
async function guardar() {
  guardando.value = true
  erroresCampo.value = {}
  try {
    if (editando.value) {
      await adminApi.actualizarEstado(editando.value.estado_id, { ...form })
      ui.mostrarSnackbar('Estado actualizado.', 'success')
    } else {
      await adminApi.crearEstado({ ...form })
      ui.mostrarSnackbar('Estado creado.', 'success')
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
    await adminApi.eliminarEstado(eliminarId.value)
    eliminarAbierto.value = false
    ui.mostrarSnackbar('Estado eliminado.', 'success')
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
      <v-btn prepend-icon="mdi-plus" @click="abrirNuevo">Nuevo estado</v-btn>
    </div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />
    <v-table v-else density="comfortable">
      <thead>
        <tr>
          <th>Contexto</th>
          <th>Código</th>
          <th>Nombre</th>
          <th>Color</th>
          <th>Orden</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.estado_id">
          <td>{{ item.contexto }}</td>
          <td>{{ item.codigo }}</td>
          <td>{{ item.nombre }}</td>
          <td><BaseChipEstado :estado="{ codigo: item.codigo, nombre: item.nombre, color: item.color as ColorEstado }" /></td>
          <td>{{ item.orden }}</td>
          <td>
            <v-btn variant="text" size="small" @click="abrirEditar(item)">Editar</v-btn>
            <v-btn variant="text" size="small" color="error" @click="pedirEliminar(item.estado_id)">Eliminar</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="abierto" max-width="420">
      <v-card>
        <v-card-title class="text-titulo">{{ editando ? 'Editar estado' : 'Nuevo estado' }}</v-card-title>
        <v-card-text>
          <v-select v-model="form.contexto" :items="opcionesContexto" label="Contexto" class="mb-2" />
          <v-text-field v-model="form.codigo" label="Código" :error-messages="erroresCampo.codigo" class="mb-2" />
          <v-text-field v-model="form.nombre" label="Nombre" :error-messages="erroresCampo.nombre" class="mb-2" />
          <v-select v-model="form.color" :items="opcionesColor" label="Color" class="mb-2" />
          <v-text-field
            v-model.number="form.orden"
            label="Orden"
            type="number"
            :error-messages="erroresCampo.orden"
          />
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
      titulo="Eliminar estado"
      :mensaje="`Esta acción no se puede deshacer. ${errorEliminar}`"
      texto-confirmar="Eliminar"
      :cargando="eliminando"
      @confirmar="confirmarEliminar"
    />
  </div>
</template>
