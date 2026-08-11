<script setup lang="ts">
// Roles y Permisos (05C hardening) — módulo propio, separado de
// Administración. Agrega crear un rol nuevo (tipo "staff interno" genérico,
// sin scoping por entidad ni acceso a rutas de proveedor) y eliminar un rol
// custom sin usuarios asignados. Editar permisos de un rol existente (los 4
// reservados o uno custom) sigue igual que `TabRolesPermisos.vue` (retirado).
import { computed, reactive, ref, watch } from 'vue'

import { adminApi } from '@/api/admin.api'
import BaseConfirmacion from '@/components/base/BaseConfirmacion.vue'
import type { PermisoItem, RolConPermisos } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'
import { requerido } from '@/utils/validaciones'

const ROLES_RESERVADOS = ['ADMINISTRADOR', 'AUDITOR', 'ENTIDAD', 'PROVEEDOR']

const ui = useUiStore()

const cargando = ref(true)
const roles = ref<RolConPermisos[]>([])
const permisosTodos = ref<PermisoItem[]>([])
const rolSeleccionado = ref('')

async function cargar() {
  cargando.value = true
  const [rolesData, permisosData] = await Promise.all([adminApi.roles(), adminApi.permisos()])
  roles.value = rolesData
  permisosTodos.value = permisosData
  if (!rolSeleccionado.value && roles.value.length) rolSeleccionado.value = roles.value[0].rol
  cargando.value = false
}
cargar()

const ordenModulos = [
  'DASHBOARD',
  'REQUERIMIENTOS',
  'AREAS',
  'CONVOCATORIAS',
  'PRESENTACION_OFERTAS',
  'OFERTAS',
  'EVALUACION',
  'ADJUDICACION',
  'ENTIDADES',
  'GESTION_PROVEEDORES',
  'GESTION_USUARIOS',
  'ROLES_PERMISOS',
  'REPORTES',
  'AUDITORIA',
  'ADMINISTRACION',
]

const gruposOrdenados = computed(() => {
  const grupos: Record<string, PermisoItem[]> = {}
  for (const p of permisosTodos.value) {
    grupos[p.modulo] ??= []
    grupos[p.modulo].push(p)
  }
  return Object.entries(grupos).sort(([a], [b]) => {
    const posA = ordenModulos.indexOf(a)
    const posB = ordenModulos.indexOf(b)
    if (posA === -1 && posB === -1) return a.localeCompare(b)
    if (posA === -1) return 1
    if (posB === -1) return -1
    return posA - posB
  })
})

const permisosSeleccionados = ref<string[]>([])
watch(
  rolSeleccionado,
  (rol) => {
    const actual = roles.value.find((r) => r.rol === rol)
    permisosSeleccionados.value = actual ? [...actual.permisos] : []
  },
  { immediate: true },
)

const esReservado = computed(() => ROLES_RESERVADOS.includes(rolSeleccionado.value))

const guardando = ref(false)
async function guardar() {
  guardando.value = true
  try {
    const actualizado = await adminApi.actualizarPermisosRol(rolSeleccionado.value, permisosSeleccionados.value)
    const idx = roles.value.findIndex((r) => r.rol === rolSeleccionado.value)
    if (idx >= 0) roles.value[idx] = actualizado
    ui.mostrarSnackbar('Permisos actualizados. El menú de este rol se recalcula al recargar /auth/me.', 'success')
  } finally {
    guardando.value = false
  }
}

// --- Nuevo rol ---------------------------------------------------------------
const nuevoAbierto = ref(false)
const nuevoFormValido = ref(false)
const nuevoForm = reactive({ nombre: '', permisos: [] as string[] })
const creando = ref(false)
const erroresNuevo = ref<Record<string, string[]>>({})

function abrirNuevo() {
  nuevoForm.nombre = ''
  nuevoForm.permisos = []
  erroresNuevo.value = {}
  nuevoAbierto.value = true
}
async function crearRol() {
  if (!nuevoFormValido.value) return
  creando.value = true
  erroresNuevo.value = {}
  try {
    const creado = await adminApi.crearRol(nuevoForm.nombre.toUpperCase(), nuevoForm.permisos)
    roles.value.push(creado)
    rolSeleccionado.value = creado.rol
    nuevoAbierto.value = false
    ui.mostrarSnackbar('Rol creado.', 'success')
  } catch (e: unknown) {
    const error = e as { response?: { data?: { errores?: Record<string, string[]> } } }
    erroresNuevo.value = error.response?.data?.errores ?? {}
  } finally {
    creando.value = false
  }
}

// --- Eliminar rol --------------------------------------------------------------
const eliminarAbierto = ref(false)
const eliminando = ref(false)
const errorEliminar = ref('')
async function confirmarEliminar() {
  eliminando.value = true
  errorEliminar.value = ''
  try {
    await adminApi.eliminarRol(rolSeleccionado.value)
    roles.value = roles.value.filter((r) => r.rol !== rolSeleccionado.value)
    rolSeleccionado.value = roles.value[0]?.rol ?? ''
    eliminarAbierto.value = false
    ui.mostrarSnackbar('Rol eliminado.', 'success')
  } catch (e: unknown) {
    const error = e as { response?: { data?: { mensaje?: string | null } } }
    errorEliminar.value = error.response?.data?.mensaje ?? 'No se pudo eliminar.'
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <v-container class="py-8" fluid>
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Roles y Permisos</div>
      <v-btn prepend-icon="mdi-plus" @click="abrirNuevo">Nuevo rol</v-btn>
    </div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <template v-else>
      <v-tabs v-model="rolSeleccionado" class="mb-6">
        <v-tab v-for="r in roles" :key="r.rol" :value="r.rol">{{ r.rol }}</v-tab>
      </v-tabs>

      <v-row>
        <v-col v-for="[modulo, permisos] in gruposOrdenados" :key="modulo" cols="12" sm="6" md="4">
          <v-card class="pa-3">
            <div class="text-subtitle-2 mb-2">{{ modulo }}</div>
            <v-checkbox
              v-for="p in permisos"
              :key="p.permiso"
              v-model="permisosSeleccionados"
              :label="p.permiso"
              :value="p.permiso"
              density="compact"
              hide-details
            />
          </v-card>
        </v-col>
      </v-row>

      <div class="d-flex justify-space-between mt-6">
        <v-btn v-if="!esReservado" variant="tonal" color="error" @click="eliminarAbierto = true">Eliminar rol</v-btn>
        <v-spacer v-else />
        <v-btn :loading="guardando" @click="guardar">Guardar cambios</v-btn>
      </div>
    </template>

    <v-dialog v-model="nuevoAbierto" max-width="700" scrollable>
      <v-card>
        <v-card-title class="text-titulo">Nuevo rol</v-card-title>
        <v-card-text>
          <v-form v-model="nuevoFormValido">
            <v-text-field
              v-model="nuevoForm.nombre"
              label="Nombre del rol *"
              hint="Solo letras mayúsculas y guion bajo (ej. SUPERVISOR)."
              persistent-hint
              class="mb-4"
              :rules="[requerido()]"
              :error-messages="erroresNuevo.nombre"
            />
            <div class="text-subtitle-2 mb-2">Permisos</div>
            <v-row>
              <v-col v-for="[modulo, permisos] in gruposOrdenados" :key="modulo" cols="12" sm="6">
                <div class="text-caption text-grey mb-1">{{ modulo }}</div>
                <v-checkbox
                  v-for="p in permisos"
                  :key="p.permiso"
                  v-model="nuevoForm.permisos"
                  :label="p.permiso"
                  :value="p.permiso"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="nuevoAbierto = false">Cancelar</v-btn>
          <v-btn :loading="creando" :disabled="!nuevoFormValido" @click="crearRol">Crear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <BaseConfirmacion
      v-model:abierto="eliminarAbierto"
      titulo="Eliminar rol"
      :mensaje="`Esta acción no se puede deshacer. ${errorEliminar}`"
      texto-confirmar="Eliminar"
      :cargando="eliminando"
      @confirmar="confirmarEliminar"
    />
  </v-container>
</template>
