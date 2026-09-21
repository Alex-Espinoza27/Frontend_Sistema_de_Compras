<script setup lang="ts">
// Grilla de checkboxes de permisos agrupados por módulo (05C hardening,
// pedido explícitamente por el usuario: "la pantalla actual... está genial,
// puedes tenerlo como base para la asignación de opciones"). Extraído como
// componente reutilizable porque antes vivía duplicado en dos sitios
// (edición de un rol existente y el modal "Nuevo rol") — ahora lo usan
// `RolPermisosDetalleView.vue` y el modal de creación en `RolesPermisosView.vue`.
import { computed } from 'vue'

import type { PermisoItem } from '@/modules/muni/muni.types'

const props = defineProps<{ permisos: PermisoItem[] }>()
const seleccionados = defineModel<string[]>({ required: true })

// Orden fijo de módulos (mismo criterio que ya usaba `RolesPermisosView.vue`):
// primero el flujo troncal, luego gestión de actores, luego transversales;
// cualquier módulo nuevo que no esté en esta lista cae al final, ordenado
// alfabéticamente — así un módulo agregado a futuro no queda invisible aunque
// nadie actualice esta lista.
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
  for (const p of props.permisos) {
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
</script>

<template>
  <v-row>
    <v-col v-for="[modulo, permisosModulo] in gruposOrdenados" :key="modulo" cols="12" sm="6" md="4">
      <v-card class="pa-3" variant="tonal">
        <div class="text-subtitle-2 mb-2">{{ permisosModulo[0].modulo_nombre }}</div>
        <v-checkbox
          v-for="p in permisosModulo"
          :key="p.permiso"
          v-model="seleccionados"
          :label="p.permiso"
          :value="p.permiso"
          density="compact"
          hide-details
        />
      </v-card>
    </v-col>
  </v-row>
</template>
