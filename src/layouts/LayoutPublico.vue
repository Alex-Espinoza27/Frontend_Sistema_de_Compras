<script setup lang="ts">
// Portal ciudadano (sin sesión). Contenido real: Fase 2 (05C).
import { computed } from 'vue'

import BaseSnackbar from '@/components/base/BaseSnackbar.vue'
import logoLaPerla from '@/assets/logo-la-perla.png'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
const auth = useAuthStore()
const nombreInstitucion = import.meta.env.VITE_APP_NOMBRE

// En modo claro: mismo color que el sidebar (secondary: #0A2947). En modo oscuro: fondo surface (#132436).
const colorAppBar = computed(() => (ui.tema === 'claro' ? 'secondary' : 'surface'))
</script>

<template>
  <v-app>
    <!-- Barra superior fija en todo el portal público -->
    <v-app-bar
      :color="colorAppBar"
      class="app-bar-cinta"
      :class="ui.tema === 'claro' ? 'app-bar-claro' : 'app-bar-oscuro'"
      flat
    >
      <router-link
        to="/"
        class="d-flex align-center text-decoration-none mr-3 ml-2"
      >
        <div class="logo-wrapper d-flex align-center justify-center">
          <img
            :src="logoLaPerla"
            alt="Logo Municipalidad de La Perla"
            class="logo-imagen"
          />
        </div>
      </router-link>

      <v-toolbar-title class="text-titulo font-weight-bold">
        <router-link
          to="/"
          class="text-decoration-none text-titulo"
          :class="ui.tema === 'claro' ? 'text-white' : ''"
        >
          {{ nombreInstitucion }}
        </router-link>
      </v-toolbar-title>

      <v-spacer />

      <v-btn
        :icon="ui.tema === 'claro' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
        variant="text"
        :color="ui.tema === 'claro' ? 'white' : undefined"
        class="mr-2"
        :title="ui.tema === 'claro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'"
        @click="ui.alternarTema()"
      />

      <template v-if="!auth.autenticado">
        <v-btn
          to="/login"
          :variant="ui.tema === 'claro' ? 'outlined' : 'text'"
          :color="ui.tema === 'claro' ? 'white' : 'primary'"
          prepend-icon="mdi-login"
          class="mr-2"
        >
          Iniciar sesión
        </v-btn>
        <v-btn
          to="/registro"
          variant="flat"
          :color="ui.tema === 'claro' ? 'white' : 'primary'"
          :class="ui.tema === 'claro' ? 'text-primary font-weight-bold' : ''"
          prepend-icon="mdi-account-plus"
        >
          Registrarse
        </v-btn>
      </template>
      <template v-else>
        <v-btn
          to="/app"
          variant="flat"
          :color="ui.tema === 'claro' ? 'white' : 'primary'"
          :class="ui.tema === 'claro' ? 'text-primary font-weight-bold' : ''"
          prepend-icon="mdi-view-dashboard-outline"
        >
          Ir a mi panel
        </v-btn>
      </template>
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
}

/* Contenedor del logo adaptado dinámicamente a modo claro y oscuro */
.logo-wrapper {
  border-radius: 8px;
  padding: 3px 6px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.logo-wrapper:hover {
  transform: scale(1.05);
}

.logo-imagen {
  height: 38px;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  display: block;
}

/* En modo claro: Header con el mismo color que el sidebar (secondary: #0A2947) */
.app-bar-claro {
  background-color: rgb(var(--v-theme-secondary)) !important;
  color: #FFFFFF !important;
}

.app-bar-claro .logo-wrapper {
  background: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.app-bar-claro :deep(.text-titulo) {
  color: #FFFFFF !important;
}

.app-bar-claro :deep(.v-btn--variant-text) {
  color: #FFFFFF !important;
}

/* En modo oscuro: Header color surface (#132436) */
.app-bar-oscuro .logo-wrapper {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
</style>
