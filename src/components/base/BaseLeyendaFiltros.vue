<script setup lang="ts">
// Leyenda que va AL LADO de los filtros de un listado: explica qué muestra la
// lista y a qué campo se aplica cada filtro (sobre todo los de fecha, que en
// cada módulo apuntan a una fecha distinta: registro, cierre de plazo, envío).
defineProps<{
  lineas: string[]
  titulo?: string
}>()
</script>

<template>
  <v-alert
    type="info"
    variant="tonal"
    density="compact"
    icon="mdi-information-outline"
    class="leyenda-filtros"
    role="note"
  >
    <div v-if="titulo" class="font-weight-bold mb-1">{{ titulo }}</div>
    <ul class="leyenda-filtros__lista">
      <li v-for="linea in lineas" :key="linea">{{ linea }}</li>
    </ul>
  </v-alert>
</template>

<style scoped>
/* Ocupa el espacio que queda en la fila de filtros; si no cabe, baja debajo. */
.leyenda-filtros {
  flex: 1 1 320px;
  max-width: 560px;
  font-size: 0.8125rem;
  line-height: 1.35;
}
.leyenda-filtros__lista {
  margin: 0;
  padding-left: 16px;
}
.leyenda-filtros__lista li + li {
  margin-top: 2px;
}
</style>
