<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AppHeaderNav from './AppHeaderNav.vue'
import DialogoCambiarPassword from './DialogoCambiarPassword.vue'
import PanelNotificaciones from './PanelNotificaciones.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const dialogoPasswordAbierto = ref(false)
const nombreInstitucion = import.meta.env.VITE_APP_NOMBRE

async function cerrarSesion() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <v-app-bar class="app-bar-cinta" flat>
    <v-app-bar-nav-icon v-if="ui.disenoNav === 'sidebar'" @click="ui.alternarDrawer()" />

    <v-toolbar-title class="text-titulo">{{ nombreInstitucion }}</v-toolbar-title>

    <v-btn
      :icon="ui.disenoNav === 'sidebar' ? 'mdi-page-layout-header' : 'mdi-page-layout-sidebar-left'"
      variant="text"
      :title="ui.disenoNav === 'sidebar' ? 'Ver diseño de encabezado' : 'Ver diseño de barra lateral'"
      @click="ui.alternarDisenoNav()"
    />

    <v-btn
      :icon="ui.tema === 'claro' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
      variant="text"
      @click="ui.alternarTema()"
    />

    <PanelNotificaciones />

    <v-menu>
      <template #activator="{ props: menuProps }">
        <v-btn icon="mdi-account-circle-outline" variant="text" v-bind="menuProps" />
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
.app-bar-cinta {
  border-top: 3px solid transparent;
  border-image: var(--grad-institucional) 1;
}
</style>
