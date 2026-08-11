<script setup lang="ts">
// D3 — Mis Postulaciones (05C hardening, pedido explícitamente por el
// usuario): antes era una tabla plana paginada (BaseTablaServidor +
// OfertaController::index), sin agrupar por estado. Ahora es un módulo
// separado del sidebar con la misma estructura que "Ver Convocatorias"
// (3 tabs de estado + filtros), filtrado a las convocatorias donde el
// proveedor ya tiene una oferta (`mias=true`, ver ListadoConvocatorias.vue).
import ListadoConvocatorias from '@/modules/proveedor/components/ListadoConvocatorias.vue'
</script>

<template>
  <ListadoConvocatorias :mias="true" titulo="Mis Postulaciones" subtitulo="Las convocatorias en las que ya postulaste" />
</template>
