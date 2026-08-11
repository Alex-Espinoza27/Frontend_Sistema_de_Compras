<script setup lang="ts">
// I5 — Catálogos (05B): 4 catálogos independientes, cada uno con su propio CRUD.
import { ref } from 'vue'

import CatalogoEstados from './CatalogoEstados.vue'
import CatalogoRubros from './CatalogoRubros.vue'
import CatalogoTiposComprobante from './CatalogoTiposComprobante.vue'
import CatalogoUnidadesMedida from './CatalogoUnidadesMedida.vue'

const sub = ref('rubros')
</script>

<template>
  <div>
    <v-tabs v-model="sub" class="mb-4">
      <v-tab value="rubros">Rubros</v-tab>
      <v-tab value="unidades">Unidades de medida</v-tab>
      <v-tab value="comprobantes">Tipos de comprobante</v-tab>
      <v-tab value="estados">Estados</v-tab>
    </v-tabs>

    <CatalogoRubros v-if="sub === 'rubros'" />
    <CatalogoUnidadesMedida v-else-if="sub === 'unidades'" />
    <CatalogoTiposComprobante v-else-if="sub === 'comprobantes'" />
    <CatalogoEstados v-else-if="sub === 'estados'" />
  </div>
</template>
