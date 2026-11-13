<script setup lang="ts">
// Alternativa de navegación en el encabezado (05C hardening, a pedido del
// usuario: botón para comparar el diseño de barra lateral vs encabezado).
// Mismos ítems y mismo destino por módulo que AppSidebar.vue (itemsMenu
// compartido en @/utils/menu), solo cambia la disposición horizontal.
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { itemsMenu } from '@/utils/menu'

const auth = useAuthStore()
const ui = useUiStore()
const items = computed(() => itemsMenu(auth.menu))
</script>

<template>
  <v-tabs
    density="comfortable"
    show-arrows
    :color="ui.tema === 'claro' ? 'white' : 'primary'"
    :class="ui.tema === 'claro' ? 'tabs-header-claro' : ''"
  >
    <v-tab
      v-for="item in items"
      :key="item.codigo"
      :to="item.ruta"
      :prepend-icon="item.icono"
    >
      {{ item.nombre }}
    </v-tab>
  </v-tabs>
</template>

<style scoped>
.tabs-header-claro :deep(.v-tab) {
  color: rgba(255, 255, 255, 0.9) !important;
}
.tabs-header-claro :deep(.v-tab--selected) {
  color: #FFFFFF !important;
  font-weight: 700;
}
</style>
