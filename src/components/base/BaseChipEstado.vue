<script setup lang="ts">
import type { ColorEstado } from '@/types/api'

withDefaults(
  defineProps<{ estado: { codigo: string; nombre: string; color: ColorEstado }; size?: string }>(),
  { size: 'small' },
)
</script>

<template>
  <v-chip :color="estado.color" :size="size" variant="tonal" class="chip-estado">
    <span class="chip-punto" :style="{ backgroundColor: `rgb(var(--v-theme-${estado.color}))` }" />
    {{ estado.nombre }}
  </v-chip>
</template>

<style scoped>
.chip-punto {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}

/* Un nombre de estado largo ("Convocatoria en Evaluación") puede ser más
   ancho que el espacio disponible (ej. dentro de una card angosta) — se
   permite salto de línea en vez de que el texto se salga del chip (05C
   hardening, pedido explícitamente por el usuario). */
.chip-estado {
  height: auto !important;
  min-height: 24px;
  white-space: normal;
}
.chip-estado :deep(.v-chip__content) {
  white-space: normal;
  text-align: center;
  padding-block: 4px;
}
</style>
