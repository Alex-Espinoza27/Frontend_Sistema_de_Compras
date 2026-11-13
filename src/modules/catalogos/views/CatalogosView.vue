<script setup lang="ts">
// Módulo de Catálogos (Rubros, Unidades de Medida, Tipos de Comprobante).
// El catálogo de Estados se encuentra desactivado (exclusivo para desarrolladores).
import { ref } from 'vue'

import CatalogoRubros from '../components/CatalogoRubros.vue'
import CatalogoTiposComprobante from '../components/CatalogoTiposComprobante.vue'
import CatalogoTiposDocumento from '../components/CatalogoTiposDocumento.vue'
import CatalogoUnidadesMedida from '../components/CatalogoUnidadesMedida.vue'

const sub = ref('rubros')
</script>

<template>
  <v-container class="py-8" fluid>
    <div class="text-h5 text-titulo mb-6">Catálogos</div>

    <v-tabs v-model="sub" class="mb-6">
      <v-tab value="rubros">Rubros</v-tab>
      <v-tab value="unidades">Unidades de medida</v-tab>
      <v-tab value="comprobantes">Tipos de comprobante</v-tab>
      <v-tab value="documentos">Tipos de documento</v-tab>
    </v-tabs>

    <CatalogoRubros v-if="sub === 'rubros'" />
    <CatalogoUnidadesMedida v-else-if="sub === 'unidades'" />
    <CatalogoTiposComprobante v-else-if="sub === 'comprobantes'" />
    <CatalogoTiposDocumento v-else-if="sub === 'documentos'" />
  </v-container>
</template>
