<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { itemsMenu } from '@/utils/menu'

const auth = useAuthStore()
const ui = useUiStore()
const theme = useTheme()

// 05D §6: fondo `secondary` (navy) en claro, `surface` en oscuro.
const colorFondo = () => (theme.global.current.value.dark ? 'surface' : 'secondary')

const items = computed(() => itemsMenu(auth.menu))
</script>

<template>
  <v-navigation-drawer
    v-model="ui.drawerAbierto"
    :color="colorFondo()"
    :border="false"
    class="app-sidebar"
  >
    <v-list nav density="comfortable">
      <v-list-item
        v-for="item in items"
        :key="item.codigo"
        :to="item.ruta"
        :prepend-icon="item.icono"
        :title="item.nombre"
        rounded="md"
        class="mb-1"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped>
/* El fondo del sidebar es siempre oscuro (secondary en claro, surface en
 * oscuro — 05D §6), así que el texto de sus ítems es siempre claro. El token
 * `primary-soft` del tema (pensado para superficies claras, ej. tarjetas
 * resaltadas sobre fondo blanco) es casi blanco en el tema claro — de ahí que
 * el ítem activo quedara con letras blancas sobre un fondo prácticamente
 * blanco (bug reportado por el usuario). En vez de ese token, se usa el color
 * primario en baja opacidad sobre el fondo oscuro del sidebar: un resaltado
 * visible sin taparlo, igual en ambos temas.
 */
.app-sidebar :deep(.v-list-item--active) {
  background-color: rgba(var(--v-theme-primary), 0.24);
  border-left: 3px solid rgb(var(--v-theme-primary));
}
</style>
