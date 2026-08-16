<script setup lang="ts">
// Portal ciudadano (sin sesión). Contenido real: Fase 2 (05C).
import BaseSnackbar from '@/components/base/BaseSnackbar.vue'

const nombreInstitucion = import.meta.env.VITE_APP_NOMBRE
</script>

<template>
  <v-app>
    <!-- Barra superior fija en todo el portal público (05C hardening, pedido
         explícitamente por el usuario): antes solo la portada tenía un link
         de "Iniciar sesión" dentro de su propio hero — en el resto de
         páginas públicas (ej. /entidad/{id}) no había forma de encontrarlo
         cuando la lista de convocatorias vigentes estaba vacía. -->
    <v-app-bar class="app-bar-cinta" flat>
      <v-toolbar-title class="text-titulo">
        <router-link to="/" class="text-decoration-none text-titulo">{{ nombreInstitucion }}</router-link>
      </v-toolbar-title>
      <v-btn to="/login" variant="text" color="primary" class="mr-2">Iniciar sesión</v-btn>
      <v-btn to="/registro" variant="flat" color="primary">Registrarse</v-btn>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
    <BaseSnackbar />
  </v-app>
</template>

<style scoped>
.app-bar-cinta {
  border-top: 3px solid transparent;
  border-image: var(--grad-institucional) 1;
  /* margin-right: 10rem; */
}
</style>
