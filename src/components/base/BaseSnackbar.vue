<script setup lang="ts">
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
</script>

<template>
  <!-- Los avisos (warning) traen más texto: se dejan más tiempo en pantalla. -->
  <v-snackbar
    v-model="ui.snackbar.visible"
    :color="ui.snackbar.color"
    :timeout="ui.snackbar.color === 'warning' ? 10000 : 5000"
    location="bottom"
  >
    {{ ui.snackbar.texto }}
  </v-snackbar>
</template>
