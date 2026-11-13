<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppHeaderNav from './AppHeaderNav.vue'
import DialogoCambiarPassword from './DialogoCambiarPassword.vue'
import PanelNotificaciones from './PanelNotificaciones.vue'
import logoLaPerla from '@/assets/logo-la-perla.png'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const dialogoPasswordAbierto = ref(false)
const nombreInstitucion = import.meta.env.VITE_APP_NOMBRE

// En modo claro: mismo color que el sidebar (secondary: #0A2947). En modo oscuro: fondo surface (#132436).
const colorAppBar = computed(() => (ui.tema === 'claro' ? 'secondary' : 'surface'))

async function cerrarSesion() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <v-app-bar
    :color="colorAppBar"
    class="app-bar-cinta"
    :class="ui.tema === 'claro' ? 'app-bar-claro' : 'app-bar-oscuro'"
    flat
  >
    <v-app-bar-nav-icon
      v-if="ui.disenoNav === 'sidebar'"
      :color="ui.tema === 'claro' ? 'white' : undefined"
      @click="ui.alternarDrawer()"
    />

    <router-link
      to="/app/dashboard"
      class="d-flex align-center text-decoration-none mr-3"
      :class="ui.disenoNav === 'sidebar' ? 'ml-1' : 'ml-3'"
    >
      <div class="logo-wrapper d-flex align-center justify-center">
        <img
          :src="logoLaPerla"
          alt="Logo Municipalidad de La Perla"
          class="logo-imagen"
        />
      </div>
    </router-link>

    <v-toolbar-title class="text-titulo font-weight-bold" :class="ui.tema === 'claro' ? 'text-white' : ''">
      {{ nombreInstitucion }}
    </v-toolbar-title>

    <v-btn
      :icon="ui.disenoNav === 'sidebar' ? 'mdi-page-layout-header' : 'mdi-page-layout-sidebar-left'"
      variant="text"
      :color="ui.tema === 'claro' ? 'white' : undefined"
      :title="ui.disenoNav === 'sidebar' ? 'Ver diseño de encabezado' : 'Ver diseño de barra lateral'"
      @click="ui.alternarDisenoNav()"
    />

    <v-btn
      :icon="ui.tema === 'claro' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
      variant="text"
      :color="ui.tema === 'claro' ? 'white' : undefined"
      :title="ui.tema === 'claro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'"
      @click="ui.alternarTema()"
    />

    <PanelNotificaciones :color-icono="ui.tema === 'claro' ? 'white' : undefined" />

    <v-menu>
      <template #activator="{ props: menuProps }">
        <v-btn
          icon="mdi-account-circle-outline"
          variant="text"
          :color="ui.tema === 'claro' ? 'white' : undefined"
          v-bind="menuProps"
        />
      </template>
      <v-list>
        <v-list-item :subtitle="auth.usuario?.email" :title="auth.usuario?.nombre" />
        <v-divider />
        <v-list-item v-if="auth.usuario?.rol === 'PROVEEDOR'" title="Mis datos" to="/app/mis-datos" />
        <v-list-item title="Cambiar contraseña" @click="dialogoPasswordAbierto = true" />
        <v-list-item title="Cerrar sesión" @click="cerrarSesion" />
      </v-list>
    </v-menu>

    <template v-if="ui.disenoNav === 'header'" #extension>
      <AppHeaderNav />
    </template>
  </v-app-bar>

  <DialogoCambiarPassword v-model:abierto="dialogoPasswordAbierto" />
</template>

<style scoped>
/* Separación visual del header frente al contenido (pedido explícitamente
 * por el usuario): con `flat` y un color de marca configurable que puede
 * coincidir con el del sidebar, el header quedaba como un bloque de color
 * plano sin ningún límite — se agrega una sombra debajo, visible en ambos
 * temas. Se usa solo `box-shadow` (no `border-bottom`) para no interferir
 * con `border-image` de la cinta superior, que ya ocupa `border-top`. */
.app-bar-cinta {
  border-top: 3px solid transparent;
  border-image: var(--grad-institucional) 1;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
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

/* En modo claro: Header con el mismo color que el sidebar (secondary:
   #0A2947) por defecto — o el color de marca configurado en Configuración
   (05C hardening, pedido explícitamente por el usuario), vía la variable
   `--color-marca-oscura` que `useColorMarca.ts` fija en caliente (la misma
   que usa AppSidebar.vue, para que ambos cambien juntos). Sin configurar,
   el `var(..., fallback)` deja el aspecto exactamente igual que antes. */
.app-bar-claro {
  background-color: var(--color-marca-oscura, rgb(var(--v-theme-secondary))) !important;
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
