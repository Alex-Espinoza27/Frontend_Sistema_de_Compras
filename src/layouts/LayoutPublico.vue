<script setup lang="ts">
// Portal ciudadano (sin sesión). Contenido real: Fase 2 (05C).
import BaseSnackbar from '@/components/base/BaseSnackbar.vue'
</script>

<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
    <BaseSnackbar />
  </v-app>
</template>
