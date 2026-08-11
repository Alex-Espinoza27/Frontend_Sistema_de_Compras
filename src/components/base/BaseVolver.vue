<script setup lang="ts">
// Botón de retorno para pantallas de detalle/sub-pantalla, para no depender
// de navegar por el sidebar cada vez (pedido explícito del usuario).
withDefaults(defineProps<{ to: string; texto?: string }>(), { texto: 'Volver' })
</script>

<template>
  <v-btn :to="to" variant="text" prepend-icon="mdi-arrow-left" class="mb-4">{{ texto }}</v-btn>
</template>
