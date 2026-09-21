<script setup lang="ts">
// Roles y Permisos (05C hardening, pedido explícitamente por el usuario):
// antes los roles se listaban como `v-tabs` — incómodo con más de un puñado
// de roles. Ahora es una tabla (mismo patrón "catálogo" que
// `CatalogoRubros.vue`: sin paginación, los roles nunca serán cientos) con
// CRUD completo; la asignación de permisos de un rol existente vive en su
// propia pantalla (`RolPermisosDetalleView.vue`), no acá.
//
// "Eliminar" no existe (05C hardening, pedido explícitamente por el
// usuario): un rol se desactiva en vez de borrarse — deja de ofrecerse para
// asignaciones nuevas (ver `UsuariosView.vue`), pero no afecta a quienes ya
// lo tienen (decisión confirmada con el usuario). Mismo patrón que
// `AreasView.vue` (`v-switch` en la columna "Estado").
import { reactive, ref } from 'vue'

import { adminApi } from '@/api/admin.api'
import SelectorPermisosPorModulo from '@/modules/muni/components/SelectorPermisosPorModulo.vue'
import type { PermisoItem, RolConPermisos } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'
import { requerido } from '@/utils/validaciones'

const ui = useUiStore()

const cargando = ref(true)
const roles = ref<RolConPermisos[]>([])
const permisosTodos = ref<PermisoItem[]>([])

async function cargar() {
  cargando.value = true
  const [rolesData, permisosData] = await Promise.all([adminApi.roles(), adminApi.permisos()])
  roles.value = rolesData
  permisosTodos.value = permisosData
  cargando.value = false
}
cargar()

const cabeceras = [
  { title: 'Rol', key: 'rol' },
  { title: 'Tipo', key: 'tipo' },
  { title: 'N.º permisos', key: 'permisos_count' },
  { title: 'N.º usuarios', key: 'usuarios_count' },
  { title: 'Estado', key: 'activo' },
  { title: '', key: 'acciones' },
]

// --- Nuevo rol -----------------------------------------------------------------
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
    nuevoAbierto.value = false
    ui.mostrarSnackbar('Rol creado.', 'success')
  } catch (e: unknown) {
    const error = e as { response?: { data?: { errores?: Record<string, string[]> } } }
    erroresNuevo.value = error.response?.data?.errores ?? {}
  } finally {
    creando.value = false
  }
}

// --- Activar/desactivar ----------------------------------------------------------
async function alternarActivo(rol: RolConPermisos) {
  try {
    const actualizado = rol.activo ? await adminApi.desactivarRol(rol.rol) : await adminApi.activarRol(rol.rol)
    const idx = roles.value.findIndex((r) => r.rol === rol.rol)
    if (idx >= 0) roles.value[idx] = actualizado
    ui.mostrarSnackbar(rol.activo ? 'Rol desactivado.' : 'Rol activado.', 'success')
  } catch {
    // El snackbar global ya informa el error (ej. 409 al desactivar uno reservado).
  }
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex justify-space-between align-center mb-6">
      <div class="text-h5 text-titulo">Roles y Permisos</div>
      <div class="d-flex ga-2">
        <v-btn icon color="primary" variant="text" :loading="cargando" @click="cargar()">
          <v-icon icon="mdi-refresh" />
          <v-tooltip activator="parent" location="bottom">Refrescar</v-tooltip>
        </v-btn>
        <v-btn v-can="'roles_permisos.gestionar'" prepend-icon="mdi-plus" @click="abrirNuevo">Nuevo rol</v-btn>
      </div>
    </div>

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <v-table v-else density="comfortable">
      <thead>
        <tr>
          <th v-for="c in cabeceras" :key="c.key">{{ c.title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="rol in roles" :key="rol.rol">
          <td class="text-datos">{{ rol.rol }}</td>
          <td>
            <v-chip :color="rol.es_reservado ? 'grey' : 'primary'" variant="tonal" size="small">
              {{ rol.es_reservado ? 'Reservado' : 'Personalizado' }}
            </v-chip>
          </td>
          <td>{{ rol.permisos_count }}</td>
          <td>{{ rol.usuarios_count }}</td>
          <td>
            <span>
              <v-switch
                :model-value="rol.activo"
                color="primary"
                density="compact"
                hide-details
                :disabled="rol.es_reservado"
                @update:model-value="alternarActivo(rol)"
              />
              <v-tooltip v-if="rol.es_reservado" activator="parent" location="top">
                Es un rol del sistema, no se puede desactivar.
              </v-tooltip>
            </span>
          </td>
          <td>
            <v-btn v-can="'roles_permisos.ver'" variant="text" size="small" :to="`/app/roles-permisos/${rol.rol}`">
              Permisos
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="nuevoAbierto" max-width="900" scrollable>
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
            <SelectorPermisosPorModulo v-model="nuevoForm.permisos" :permisos="permisosTodos" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="nuevoAbierto = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="creando" :disabled="!nuevoFormValido" @click="crearRol">Crear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
