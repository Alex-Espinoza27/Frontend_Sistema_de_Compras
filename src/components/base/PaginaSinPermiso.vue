<script setup lang="ts"></script>

<template>
  <v-container class="py-12 text-center">
    <v-icon icon="mdi-lock-outline" size="48" color="error" class="mb-4" />
    <div class="text-h6 text-titulo mb-2">No tienes permiso para ver esta página</div>
    <div class="text-body-2 text-grey mb-6">
      Si crees que deberías tener acceso, comunícate con el administrador del sistema.
    </div>
    <v-btn to="/app" variant="tonal">Ir al inicio</v-btn>
  </v-container>
</template>
