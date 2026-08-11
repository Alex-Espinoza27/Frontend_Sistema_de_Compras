<script setup lang="ts">
defineProps<{ titulo?: string }>()
</script>

<template>
  <v-container class="py-12 text-center">
    <v-icon icon="mdi-wrench-outline" size="48" color="grey" class="mb-4" />
    <div class="text-h6 text-titulo mb-2">{{ titulo ?? 'Módulo en construcción' }}</div>
    <div class="text-body-2 text-grey">
      Esta pantalla se construye en una fase posterior del proyecto.
    </div>
  </v-container>
</template>
