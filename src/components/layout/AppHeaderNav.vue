<script setup lang="ts">
// Alternativa de navegación en el encabezado (05C hardening, a pedido del
// usuario: botón para comparar el diseño de barra lateral vs encabezado).
// Mismos ítems y mismo destino por módulo que AppSidebar.vue (itemsMenu
// compartido en @/utils/menu), solo cambia la disposición horizontal.
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { itemsMenu } from '@/utils/menu'

const auth = useAuthStore()
const items = computed(() => itemsMenu(auth.menu))
</script>

<template>
  <v-tabs density="comfortable" show-arrows>
    <v-tab v-for="item in items" :key="item.codigo" :to="item.ruta" :prepend-icon="item.icono">
      {{ item.nombre }}
    </v-tab>
  </v-tabs>
</template>
