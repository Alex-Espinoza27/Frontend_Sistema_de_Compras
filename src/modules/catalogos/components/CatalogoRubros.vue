<script setup lang="ts">
import { reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
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
  { title: 'Acciones', key: 'acciones', sortable: false },
  { title: 'Tipo', key: 'tipo' },
  { title: 'Código', key: 'codigo' },
  { title: 'Nombre', key: 'nombre' },
  { title: 'Estado', key: 'activo' },
]

const abierto = ref(false)
const formValido = ref(false)
const editando = ref<RubroAdmin | null>(null)
const form = reactive({ tipo: 'SERVICIO' as TipoRubro, codigo: '', nombre: '' })
const guardando = ref(false)
const erroresCampo = ref<Record<string, string[]>>({})

const confirmacionAbierta = ref(false)
const itemADesactivar = ref<RubroAdmin | null>(null)
const procesandoEstado = ref(false)

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
      await adminApi.crearRubro({ tipo: form.tipo, nombre: form.nombre, activo: true })
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

function solicitarAlternarActivo(item: RubroAdmin) {
  if (item.activo) {
    itemADesactivar.value = item
    confirmacionAbierta.value = true
  } else {
    ejecutarCambioEstado(item, true)
  }
}

async function confirmarDesactivacion() {
  if (!itemADesactivar.value) return
  procesandoEstado.value = true
  await ejecutarCambioEstado(itemADesactivar.value, false)
  procesandoEstado.value = false
  confirmacionAbierta.value = false
  itemADesactivar.value = null
}

async function ejecutarCambioEstado(item: RubroAdmin, nuevoActivo: boolean) {
  try {
    await adminApi.actualizarRubro(item.rubro_id, {
      tipo: item.tipo,
      codigo: item.codigo,
      nombre: item.nombre,
      activo: nuevoActivo,
    })
    ui.mostrarSnackbar(nuevoActivo ? 'Rubro activado.' : 'Rubro desactivado.', 'success')
    await cargar()
  } catch {
    // El snackbar global ya informa el error.
  }
}
</script>

<template>
  <div>
    <div class="d-flex justify-end mb-4">
      <v-btn color="primary" variant="flat" elevation="2" class="font-weight-medium px-5" @click="abrirNuevo">
        Nuevo rubro
      </v-btn>
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
          <td>
            <div class="d-flex align-center ga-1">
              <v-btn
                icon
                variant="text"
                size="small"
                color="primary"
                @click="abrirEditar(item)"
              >
                <v-icon icon="mdi-pencil-outline" />
                <v-tooltip activator="parent" location="top">Editar rubro</v-tooltip>
              </v-btn>
            </div>
          </td>
          <td>{{ item.tipo === 'BIEN' ? 'Bien' : 'Servicio' }}</td>
          <td>{{ item.codigo }}</td>
          <td>{{ item.nombre }}</td>
          <td>
            <v-switch
              :model-value="item.activo"
              color="primary"
              density="compact"
              hide-details
              @update:model-value="solicitarAlternarActivo(item)"
            />
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="abierto" max-width="420">
      <v-card class="rounded-lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-surface text-titulo font-weight-bold">
          <span>{{ editando ? 'Editar rubro' : 'Nuevo rubro' }}</span>
          <v-btn icon="mdi-close" variant="text" density="compact" @click="abierto = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-form v-model="formValido">
            <v-select
              v-model="form.tipo"
              :items="[
                { title: 'Bien', value: 'BIEN' },
                { title: 'Servicio', value: 'SERVICIO' },
              ]"
              label="Tipo"
              :disabled="!!editando"
              class="mb-3"
            />
            <v-text-field
              v-if="editando"
              v-model="form.codigo"
              label="Código"
              readonly
              class="mb-3"
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
        <v-divider />
        <v-card-actions class="pa-4 bg-surface d-flex justify-end ga-2">
          <v-btn variant="outlined" color="secondary" class="px-5" @click="abierto = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" elevation="2" class="px-6" :loading="guardando" :disabled="!formValido" @click="guardar">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <BaseConfirmacion
      v-model:abierto="confirmacionAbierta"
      titulo="Desactivar rubro"
      :mensaje="`¿Está seguro de que desea desactivar el rubro '${itemADesactivar?.nombre}'? Dejará de estar disponible para nuevos registros.`"
      texto-confirmar="Desactivar"
      color="error"
      :cargando="procesandoEstado"
      @confirmar="confirmarDesactivacion"
    />
  </div>
</template>
