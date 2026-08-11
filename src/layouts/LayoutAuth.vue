<script setup lang="ts">
// Login / registro / recuperación de contraseña. Contenido real: Fase 1 y 3 (05C).
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
