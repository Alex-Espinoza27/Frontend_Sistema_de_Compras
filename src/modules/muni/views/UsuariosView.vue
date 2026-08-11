<script setup lang="ts">
// Usuarios (05C hardening) — módulo propio, unifica lo que antes eran dos
// pantallas separadas: "Usuarios internos" (`TabUsuariosInternos.vue`,
// retirado, solo ADMINISTRADOR/AUDITOR) y los usuarios de cada Entidad (antes
// solo visibles entrando al detalle de esa entidad, uno por uno). El rol es
// dinámico (cualquiera excepto PROVEEDOR, incluye roles custom nuevos de
// Roles y Permisos); si el rol elegido es ENTIDAD, aparece el select de
// entidad (obligatorio).
import { computed, reactive, ref, watch } from 'vue'

import { adminApi } from '@/api/admin.api'
import { entidadesApi } from '@/api/entidades.api'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import BaseTablaServidor from '@/components/base/BaseTablaServidor.vue'
import { useListado } from '@/composables/useListado'
import type { EntidadListaItem } from '@/modules/muni/muni.types'
import type { UsuarioPlataformaItem } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'

interface ErrorApi {
  response?: { status?: number; data?: { mensaje?: string | null; errores?: Record<string, string[]> } }
}

const ui = useUiStore()

const { items, paginacion, cargando, params, recargar } = useListado<UsuarioPlataformaItem>(adminApi.usuarios, {
  ordenar_por: 'nombre',
})

const roles = ref<string[]>([])
adminApi.roles().then((data) => (roles.value = data.map((r) => r.rol).filter((r) => r !== 'PROVEEDOR')))

const entidadesAprobadas = ref<EntidadListaItem[]>([])
entidadesApi.index({ estado: 'APROBADA', ordenar_por: 'razon_social', por_pagina: 100 }).then((data) => (entidadesAprobadas.value = data.items))

const cabeceras = [
  { title: 'Nombre', key: 'nombre' },
  { title: 'Correo', key: 'correo', sortable: false },
  { title: 'Rol', key: 'rol', sortable: false },
  { title: 'Entidad', key: 'entidad', sortable: false },
  { title: '', key: 'acciones', sortable: false },
]

const abierto = ref(false)
const editando = ref<UsuarioPlataformaItem | null>(null)
const form = reactive({ nombre: '', correo: '', rol: '', entidad_id: null as number | null })
const guardando = ref(false)
const errorGeneral = ref('')
const erroresCampo = ref<Record<string, string[]>>({})
const esEntidad = computed(() => form.rol === 'ENTIDAD')

watch(
  () => form.rol,
  (rol) => {
    if (rol !== 'ENTIDAD') form.entidad_id = null
  },
)

function abrirNuevo() {
  editando.value = null
  form.nombre = ''
  form.correo = ''
  form.rol = 'AUDITOR'
  form.entidad_id = null
  errorGeneral.value = ''
  erroresCampo.value = {}
  abierto.value = true
}
function abrirEditar(usuario: UsuarioPlataformaItem) {
  editando.value = usuario
  form.nombre = usuario.nombre
  form.correo = usuario.correo
  form.rol = usuario.rol
  form.entidad_id = usuario.entidad?.entidad_id ?? null
  errorGeneral.value = ''
  erroresCampo.value = {}
  abierto.value = true
}
async function guardar() {
  guardando.value = true
  errorGeneral.value = ''
  erroresCampo.value = {}
  try {
    if (editando.value) {
      await adminApi.actualizarUsuario(editando.value.id, { ...form })
      ui.mostrarSnackbar('Usuario actualizado.', 'success')
    } else {
      await adminApi.crearUsuario({ ...form })
      ui.mostrarSnackbar('Usuario creado. Se enviaron las credenciales por correo.', 'success')
    }
    abierto.value = false
    recargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorGeneral.value = error.response?.data?.mensaje ?? ''
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
    await adminApi.eliminarUsuario(eliminarId.value)
    eliminarAbierto.value = false
    ui.mostrarSnackbar('Usuario eliminado.', 'success')
    recargar()
  } catch (e: unknown) {
    const error = e as ErrorApi
    errorEliminar.value = error.response?.data?.mensaje ?? 'No se pudo eliminar.'
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Usuarios</div>
      <v-btn prepend-icon="mdi-plus" @click="abrirNuevo">Nuevo usuario</v-btn>
    </div>

    <div class="d-flex flex-wrap ga-4 mb-4">
      <v-text-field
        v-model="params.buscar"
        label="Buscar por nombre o correo"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 280px"
        clearable
      />
      <v-select
        v-model="params.rol as string"
        :items="roles"
        label="Rol"
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
      mensaje-vacio="No hay usuarios registrados."
    >
      <template #item.entidad="{ item }">{{ item.entidad?.razon_social ?? '—' }}</template>
      <template #item.acciones="{ item }">
        <v-btn variant="text" size="small" @click="abrirEditar(item)">Editar</v-btn>
        <v-btn variant="text" size="small" color="error" @click="pedirEliminar(item.id)">Eliminar</v-btn>
      </template>
    </BaseTablaServidor>

    <v-dialog v-model="abierto" max-width="480">
      <v-card>
        <v-card-title class="text-titulo">{{ editando ? 'Editar usuario' : 'Nuevo usuario' }}</v-card-title>
        <v-card-text>
          <v-alert v-if="errorGeneral" type="error" density="compact" class="mb-4">{{ errorGeneral }}</v-alert>
          <v-text-field v-model="form.nombre" label="Nombre" :error-messages="erroresCampo.nombre" class="mb-2" />
          <v-text-field
            v-model="form.correo"
            label="Correo"
            type="email"
            :error-messages="erroresCampo.correo"
            class="mb-2"
          />
          <v-select v-model="form.rol" :items="roles" label="Rol" :error-messages="erroresCampo.rol" class="mb-2" />
          <v-select
            v-if="esEntidad"
            v-model="form.entidad_id"
            :items="entidadesAprobadas.map((e) => ({ title: e.razon_social, value: e.entidad_id }))"
            label="Entidad"
            :error-messages="erroresCampo.entidad_id"
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
      titulo="Eliminar usuario"
      :mensaje="`Esta acción elimina el acceso del usuario de forma permanente. ${errorEliminar}`"
      texto-confirmar="Eliminar"
      :cargando="eliminando"
      @confirmar="confirmarEliminar"
    />
  </v-container>
</template>
