<script setup lang="ts">
// Stepper reutilizable (05B: usado por B2 y D2). El paso activo/completado ya
// se ve bien gracias al override de `styles/app.css` (ver 05C — Fase 3).
withDefaults(defineProps<{ pasos: string[]; usarCinta?: boolean }>(), { usarCinta: false })

const paso = defineModel<number>({ required: true })
</script>

<template>
  <v-stepper v-model="paso">
    <v-stepper-header>
      <template v-for="(titulo, i) in pasos" :key="i">
        <v-stepper-item :title="titulo" :value="i + 1" :complete="paso > i + 1" />
        <v-divider v-if="i < pasos.length - 1" />
      </template>
    </v-stepper-header>

    <!-- Cinta institucional como barra de progreso (05D: único uso fuera del
         app bar y la constancia). -->
    <div v-if="usarCinta" class="base-stepper__cinta">
      <div class="base-stepper__cinta-relleno" :style="{ width: `${(paso / pasos.length) * 100}%` }" />
    </div>

    <v-stepper-window>
      <slot />
    </v-stepper-window>
  </v-stepper>
</template>

<style scoped>
.base-stepper__cinta {
  height: 4px;
  background: rgb(var(--v-theme-surface-variant));
}
.base-stepper__cinta-relleno {
  height: 100%;
  background: var(--grad-institucional);
  transition: width 0.3s ease;
}
</style>
