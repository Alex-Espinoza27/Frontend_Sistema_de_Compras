<script setup lang="ts">
// I5 — Catálogo de estados (05B). `color` no tiene enum en el backend
// (string libre max:20), pero solo estos 6 valores existen como color de
// tema en Vuetify (05D §2.3 / types/api.ts `ColorEstado`) — cualquier otro
// rompería BaseChipEstado en toda la app, así que se restringe aquí.
//
// "Eliminar" no existe (05C hardening, pedido explícitamente por el
// usuario): se desactiva en vez de borrarse — mismo patrón que
// `AreasView.vue`. A diferencia de Rubros/Unidades/Tipos de comprobante, un
// estado no tiene ningún "picker" de usuario final (se asignan por
// transiciones de negocio, nunca se eligen de una lista) — desactivar es
// solo una bandera administrativa, sin filtrado adicional que aplicar.
import { reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import BaseChipEstado from '@/components/base/BaseChipEstado.vue'
import type { ContextoEstado, EstadoAdmin } from '@/modules/muni/muni.types'
import type { ColorEstado } from '@/types/api'
import { useUiStore } from '@/stores/ui.store'
import { requerido } from '@/utils/validaciones'

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
const formValido = ref(false)
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
  if (!formValido.value) return
  guardando.value = true
  erroresCampo.value = {}
  try {
    if (editando.value) {
      await adminApi.actualizarEstado(editando.value.estado_id, { ...form, activo: editando.value.activo })
      ui.mostrarSnackbar('Estado actualizado.', 'success')
    } else {
      await adminApi.crearEstado({ ...form, activo: true })
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

async function alternarActivo(item: EstadoAdmin) {
  try {
    await adminApi.actualizarEstado(item.estado_id, {
      contexto: item.contexto,
      codigo: item.codigo,
      nombre: item.nombre,
      color: item.color as ColorEstado,
      orden: item.orden,
      activo: !item.activo,
    })
    ui.mostrarSnackbar(item.activo ? 'Estado desactivado.' : 'Estado activado.', 'success')
    await cargar()
  } catch {
    // El snackbar global ya informa el error.
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
          <th>Estado</th>
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
        <v-card-title class="text-titulo">{{ editando ? 'Editar estado' : 'Nuevo estado' }}</v-card-title>
        <v-card-text>
          <v-form v-model="formValido">
            <v-select v-model="form.contexto" :items="opcionesContexto" label="Contexto" class="mb-2" />
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
            <v-select v-model="form.color" :items="opcionesColor" label="Color" :rules="[requerido()]" class="mb-2" />
            <v-text-field
              v-model.number="form.orden"
              label="Orden"
              type="number"
              :rules="[requerido()]"
              :error-messages="erroresCampo.orden"
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
