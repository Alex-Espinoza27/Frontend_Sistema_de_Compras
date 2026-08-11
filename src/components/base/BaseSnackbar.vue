<script setup lang="ts">
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
</script>

<template>
  <v-snackbar v-model="ui.snackbar.visible" :color="ui.snackbar.color" location="bottom">
    {{ ui.snackbar.texto }}
  </v-snackbar>
</template>
