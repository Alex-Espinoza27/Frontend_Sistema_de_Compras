<script setup lang="ts">
// Resumen de errores de un formulario: dice en claro qué corregir y cada línea
// lleva al campo (`ir`). Lo usa quien envía un formulario con errores de
// validación (locales o del backend, con la misma forma que `MapaErrores`).
defineProps<{
  errores: { campo: string; mensaje: string; etiqueta?: string }[]
  titulo?: string
}>()

const emit = defineEmits<{ ir: [campo: string] }>()
</script>

<template>
  <v-alert type="error" variant="tonal" density="comfortable" role="alert" class="resumen-errores">
    <div class="font-weight-bold mb-1">{{ titulo ?? 'Revise lo siguiente para continuar' }}</div>
    <ul class="resumen-errores__lista">
      <li v-for="(e, i) in errores" :key="`${e.campo}-${i}`">
        <a href="#" class="resumen-errores__enlace" @click.prevent="emit('ir', e.campo)">{{ e.mensaje }}</a>
        <v-chip v-if="e.etiqueta" size="x-small" label class="ml-2" variant="outlined">{{ e.etiqueta }}</v-chip>
      </li>
    </ul>
  </v-alert>
</template>

<style scoped>
.resumen-errores__lista {
  margin: 0;
  padding-left: 18px;
}
.resumen-errores__lista li {
  margin-bottom: 2px;
}
.resumen-errores__enlace {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
