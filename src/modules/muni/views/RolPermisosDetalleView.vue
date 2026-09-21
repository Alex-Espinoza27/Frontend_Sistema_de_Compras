<script setup lang="ts">
// Detalle de un rol: activar/desactivar sus permisos, agrupados por módulo
// (05C hardening, pedido explícitamente por el usuario — antes vivía inline
// en la misma pantalla que la lista de roles, ahora aislado en su propia
// vista, alcanzada desde la tabla de `RolesPermisosView.vue`).
//
// El rol en sí ya no se "elimina" (05C hardening): se activa/desactiva con
// el mismo switch que ya trae la tabla — este encabezado solo lo refleja,
// no repite la acción.
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import { adminApi } from '@/api/admin.api'
import BaseVolver from '@/components/base/BaseVolver.vue'
import SelectorPermisosPorModulo from '@/modules/muni/components/SelectorPermisosPorModulo.vue'
import type { PermisoItem, RolConPermisos } from '@/modules/muni/muni.types'
import { useUiStore } from '@/stores/ui.store'

const route = useRoute()
const ui = useUiStore()
const rol = route.params.rol as string

const cargando = ref(true)
const rolActual = ref<RolConPermisos | null>(null)
const permisosTodos = ref<PermisoItem[]>([])
const permisosSeleccionados = ref<string[]>([])

async function cargar() {
  cargando.value = true
  const [roles, permisos] = await Promise.all([adminApi.roles(), adminApi.permisos()])
  rolActual.value = roles.find((r) => r.rol === rol) ?? null
  permisosTodos.value = permisos
  permisosSeleccionados.value = rolActual.value ? [...rolActual.value.permisos] : []
  cargando.value = false
}
cargar()

const esReservado = computed(() => rolActual.value?.es_reservado ?? false)

const guardando = ref(false)
async function guardar() {
  guardando.value = true
  try {
    const actualizado = await adminApi.actualizarPermisosRol(rol, permisosSeleccionados.value)
    rolActual.value = actualizado
    permisosSeleccionados.value = [...actualizado.permisos]
    ui.mostrarSnackbar('Permisos actualizados. El menú de este rol se recalcula al recargar /auth/me.', 'success')
  } finally {
    guardando.value = false
  }
}

// --- Activar/desactivar ----------------------------------------------------------
async function alternarActivo() {
  if (!rolActual.value) return
  try {
    const actualizado = rolActual.value.activo ? await adminApi.desactivarRol(rol) : await adminApi.activarRol(rol)
    rolActual.value = actualizado
    ui.mostrarSnackbar(actualizado.activo ? 'Rol activado.' : 'Rol desactivado.', 'success')
  } catch {
    // El snackbar global ya informa el error (ej. 409 al desactivar uno reservado).
  }
}
</script>

<template>
  <v-container class="py-8">
    <BaseVolver to="/app/roles-permisos" texto="Volver a roles" />

    <v-progress-circular v-if="cargando" indeterminate color="primary" />

    <v-alert v-else-if="!rolActual" type="error" density="compact">Este rol no existe.</v-alert>

    <template v-else>
      <div class="d-flex align-center ga-3 mb-6">
        <div class="text-h5 text-titulo">{{ rolActual.rol }}</div>
        <v-chip :color="esReservado ? 'grey' : 'primary'" variant="tonal" size="small">
          {{ esReservado ? 'Reservado' : 'Personalizado' }}
        </v-chip>
        <span class="d-flex align-center ga-1">
          <v-switch
            :model-value="rolActual.activo"
            color="primary"
            density="compact"
            hide-details
            :disabled="esReservado"
            @update:model-value="alternarActivo"
          />
          <span class="text-body-2 text-grey">{{ rolActual.activo ? 'Activo' : 'Inactivo' }}</span>
          <v-tooltip v-if="esReservado" activator="parent" location="top">
            Es un rol del sistema, no se puede desactivar.
          </v-tooltip>
        </span>
      </div>

      <SelectorPermisosPorModulo v-model="permisosSeleccionados" :permisos="permisosTodos" />

      <div class="d-flex justify-end mt-6">
        <v-btn v-can="'roles_permisos.gestionar'" color="primary" :loading="guardando" @click="guardar">
          Guardar cambios
        </v-btn>
      </div>
    </template>
  </v-container>
</template>
