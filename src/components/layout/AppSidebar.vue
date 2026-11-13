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
    :class="{ 'app-sidebar-claro': !theme.global.current.value.dark }"
  >
    <v-list nav density="comfortable" class="px-2">
      <v-list-item
        v-for="item in items"
        :key="item.codigo"
        :to="item.ruta"
        :prepend-icon="item.icono"
        :title="item.nombre"
        rounded="lg"
        class="mb-1 item-sidebar"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped>
/* Separación visual del sidebar frente al contenido (pedido explícitamente
 * por el usuario): con `:border="false"` y un color de marca configurable
 * que puede coincidir con el del header, el sidebar quedaba como un bloque
 * de color plano sin ningún límite — se agrega una sombra + un borde sutil
 * a la derecha, visibles en ambos temas. */
.app-sidebar {
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.12);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

/* El fondo del sidebar es siempre oscuro (secondary en claro, surface en
 * oscuro — 05D §6), así que el texto de sus ítems es siempre claro. El token
 * `primary-soft` del tema (pensado para superficies claras, ej. tarjetas
 * resaltadas sobre fondo blanco) es casi blanco en el tema claro — de ahí que
 * el ítem activo quedara con letras blancas sobre un fondo prácticamente
 * blanco (bug reportado por el usuario). En vez de ese token, se usa el color
 * primario en baja opacidad sobre el fondo oscuro del sidebar: un resaltado
 * visible sin taparlo, igual en ambos temas.
 *
 * El `border-left` recto sobre un ítem redondeado (`rounded="lg"`) se veía
 * como un rectángulo pegado a una esquina curva (pedido explícitamente por
 * el usuario) — se reemplaza por una barrita de acento flotante y redondeada
 * (`::before`), separada del borde, en vez de un borde que choca con las
 * esquinas.
 */
.item-sidebar.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.24);
  position: relative;
}

.item-sidebar.v-list-item--active::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 20%;
  bottom: 20%;
  width: 3px;
  border-radius: 4px;
  background-color: rgb(var(--v-theme-primary));
}

/* Color de marca configurable (05C hardening, pedido explícitamente por el
 * usuario): mismo `--color-marca-oscura` que usa AppBar.vue, para que el
 * sidebar cambie junto con el header. Sin configurar, el `var(..., fallback)`
 * deja el aspecto exactamente igual que antes (secondary / navy). */
.app-sidebar-claro {
  background-color: var(--color-marca-oscura, rgb(var(--v-theme-secondary))) !important;
}
</style>
