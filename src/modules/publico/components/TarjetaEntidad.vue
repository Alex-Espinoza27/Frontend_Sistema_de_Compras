<script setup lang="ts">
import type { EntidadPublica } from '@/modules/publico/publico.types'

defineProps<{ entidad: EntidadPublica }>()
</script>

<template>
  <v-card :to="`/entidad/${entidad.entidad_id}`" class="tarjeta-entidad pa-8" rounded="lg">
    <div class="d-flex justify-space-between align-start ga-4">
      <div>
        <div class="text-titulo text-h6">{{ entidad.sigla }}</div>
        <div class="text-body-2 text-grey">{{ entidad.razon_social }}</div>
      </div>
      <div class="text-center flex-shrink-0">
        <div class="text-h5 text-titulo text-primary">{{ entidad.convocatorias_vigentes }}</div>
        <div class="text-caption text-grey">vigentes</div>
      </div>
    </div>
    <div class="text-caption text-grey mt-4">
      {{ entidad.convocatorias_total }} convocatoria{{ entidad.convocatorias_total === 1 ? '' : 's' }} en total
    </div>
  </v-card>
</template>

<style scoped>
.tarjeta-entidad {
  cursor: pointer;
  transition: box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.tarjeta-entidad:hover {
  box-shadow: var(--sombra-2);
}
@media (prefers-reduced-motion: reduce) {
  .tarjeta-entidad {
    transition: none;
  }
}
</style>
