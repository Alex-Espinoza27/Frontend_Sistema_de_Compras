<script setup lang="ts">
// Shell autenticado (05B sección C).
import { onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

import BaseSnackbar from '@/components/base/BaseSnackbar.vue'
import AppBar from '@/components/layout/AppBar.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useNotificacionesStore } from '@/stores/notificaciones.store'
import { useUiStore } from '@/stores/ui.store'

const route = useRoute()
const ui = useUiStore()
const notificaciones = useNotificacionesStore()
onMounted(() => notificaciones.iniciarPolling())
onUnmounted(() => notificaciones.detenerPolling())
</script>

<template>
  <v-app>
    <AppBar />
    <AppSidebar v-if="ui.disenoNav === 'sidebar'" />
    <v-main>
      <!-- :key por fullPath: sin esto, navegar entre rutas que resuelven al
           mismo componente (ej. ".../nuevo" -> ".../:id" tras guardar) NO
           remonta el componente — vue-router lo reutiliza y cualquier const
           leída de route.params en el setup() queda obsoleta para siempre
           (bug real detectado en Fase 6: cada "Guardar" repetía el POST). -->
      <router-view :key="route.fullPath" />
    </v-main>
    <BaseSnackbar />
  </v-app>
</template>
