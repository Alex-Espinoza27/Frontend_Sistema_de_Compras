<script setup lang="ts">
// Configuración (05C hardening — antes "Administración"; Proveedores,
// Usuarios y Roles y Permisos se separaron en sus propios módulos de
// sidebar). Vista con pestañas; cada una exige su propio permiso — un rol
// custom (Roles y Permisos) puede tener solo uno de los dos, así que cada
// pestaña se oculta si no corresponde (bug real corregido: antes ambas
// pestañas se mostraban siempre, sin importar el permiso real del usuario).
import { computed, ref, watch } from 'vue'

import TabCatalogos from '@/modules/muni/components/administracion/TabCatalogos.vue'
import TabConfiguracion from '@/modules/muni/components/administracion/TabConfiguracion.vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const puedeCatalogos = computed(() => auth.puede('administracion.catalogos'))
const puedeConfiguracion = computed(() => auth.puede('administracion.configuracion'))

const tab = ref(puedeCatalogos.value ? 'catalogos' : 'configuracion')
// Si el usuario solo tiene uno de los dos permisos, se ajusta apenas se
// resuelve (por si el componente se monta antes de que `auth.permisos` esté listo).
watch([puedeCatalogos, puedeConfiguracion], ([catalogos, configuracion]) => {
  if (tab.value === 'catalogos' && !catalogos && configuracion) tab.value = 'configuracion'
  if (tab.value === 'configuracion' && !configuracion && catalogos) tab.value = 'catalogos'
})
</script>

<template>
  <v-container class="py-8" fluid>
    <div class="text-h5 text-titulo mb-6">Configuración</div>

    <v-tabs v-model="tab" class="mb-6">
      <v-tab v-if="puedeCatalogos" value="catalogos">Catálogos</v-tab>
      <v-tab v-if="puedeConfiguracion" value="configuracion">Configuración</v-tab>
    </v-tabs>

    <TabCatalogos v-if="tab === 'catalogos' && puedeCatalogos" />
    <TabConfiguracion v-else-if="tab === 'configuracion' && puedeConfiguracion" />
  </v-container>
</template>
