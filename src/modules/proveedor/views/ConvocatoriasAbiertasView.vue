<script setup lang="ts">
// D1 — Ver Convocatorias (05C hardening: módulo separado de "Mis
// Postulaciones", ver ListadoConvocatorias.vue). Lista TODAS las
// convocatorias de las entidades registradas en la plataforma.
import ListadoConvocatorias from '@/modules/proveedor/components/ListadoConvocatorias.vue'
</script>

<template>
  <ListadoConvocatorias
    :mias="false"
    titulo="Ver Convocatorias"
    subtitulo="Todas las convocatorias de las entidades registradas en la plataforma"
  />
</template>
